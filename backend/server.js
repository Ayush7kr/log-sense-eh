require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { startSimulator, setDemoMode, setAlertsEnabled, setSimulation } = require('./simulator');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- Security Intelligence (Analyst-Grade) ---

/**
 * SecurityMonitor: Stateful rule engine to detect complex attack patterns.
 */
class SecurityMonitor {
  constructor(dbInst) {
    this.db = dbInst;
    this.lastProcessedId = 0;
    this.failTracker = new Map(); // ip -> { count, lastTime }
    this.userPaths = new Map();   // user -> { lastEvent, lastIp, time }
  }

  start() {
    // Poll the logs table for new unprocessed entries every 3 seconds.
    setInterval(() => this.processNewLogs(), 3000);
    console.log('Security Information Monitor active.');
  }

  processNewLogs() {
    try {
      const newLogs = this.db.prepare('SELECT * FROM logs WHERE id > ? ORDER BY id ASC').all(this.lastProcessedId);
      for (const log of newLogs) {
        this.analyze(log);
        this.lastProcessedId = log.id;
      }
    } catch (err) {
      console.error('Monitor polling error:', err);
    }
  }

  analyze(log) {
    const now = new Date(log.timestamp).getTime();

    // 1. Brute Force Detection
    if (log.event === 'Failed Login') {
      const state = this.failTracker.get(log.ip) || { count: 0, lastTime: 0 };
      if (now - state.lastTime < 120000) { // 2 minute window
        state.count++;
      } else {
        state.count = 1;
      }
      state.lastTime = now;
      this.failTracker.set(log.ip, state);

      if (state.count >= 5) {
        this.createIncident('Brute Force', 'High', `Multiple failed logins (${state.count}) from ${log.ip} targetting ${log.user}`, log.ip, log.user);
        state.count = 0; // Reset after triggering incident
      }
    }

    // 2. Suspicious Login Hours (2 AM - 5 AM)
    const hour = new Date(log.timestamp).getHours();
    if (hour >= 2 && hour <= 5 && log.event.includes('Login')) {
        this.createIncident('Suspicious Login Time', 'Medium', `Login activity at off-hours (${hour}:00) for user ${log.user}`, log.ip, log.user);
    }

    // 3. Privilege Escalation Pattern (Failure followed by Admin access)
    const path = this.userPaths.get(log.user);
    if (path && log.event.includes('Admin') && path.lastEvent.includes('Failed')) {
        this.createIncident('Privilege Escalation', 'Critical', `User ${log.user} accessed admin resource immediately after a failure.`, log.ip, log.user);
    }
    this.userPaths.set(log.user, { lastEvent: log.event, lastIp: log.ip, time: now });
  }

  createIncident(type, severity, description, ip, user) {
    try {
       // Check for recent duplicate incidents to avoid spamming
       const existing = this.db.prepare("SELECT id FROM incidents WHERE type = ? AND attacker_ip = ? AND timestamp > ?")
         .get(type, ip, new Date(Date.now() - 300000).toISOString());
       
       if (existing) return;

        const riskScore = severity === 'Critical' ? 95 : (severity === 'High' ? 85 : 50);

       this.db.prepare(`
         INSERT INTO incidents (timestamp, type, severity, description, attacker_ip, target_user, summary)
         VALUES (?, ?, ?, ?, ?, ?, ?)
       `).run(new Date().toISOString(), type, severity, description, ip, user, description);

        this.db.prepare(`
          INSERT INTO alerts (timestamp, event, ip, risk_score, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(new Date().toISOString(), type, ip, riskScore, 'Active');

       console.log(`[ALARM] Incident Detected: ${type} from ${ip}`);
    } catch (e) { console.error('Incident creation error:', e); }
  }
}

const monitor = new SecurityMonitor(db);
monitor.start();

// --- Log Parsing Utilities ---

function parseRawLog(line) {
  // SSH Pattern
  const ssh = line.match(/(Failed password|Accepted password) for (\w+) from ([\d.]+)/);
  if (ssh) return { user: ssh[2], ip: ssh[3], event: ssh[1].includes('Failed') ? 'Failed Login' : 'Successful Login', risk: ssh[1].includes('Failed') ? 'Medium' : 'Low' };

  // Apache Pattern
  const ap = line.match(/^([\d.]+) - - \[(.*?)\] "(.*?)" (\d+)/);
  if (ap) return { user: 'anonymous', ip: ap[1], event: `Web ${ap[4]} [${ap[3]}]`, risk: ap[4] === '403' || ap[4] === '404' ? 'Medium' : 'Low' };

  // Generic Syslog Pattern
  const sys = line.match(/(\w+)\[(\d+)\]: (.*)/);
  if (sys) return { user: 'system', ip: '127.0.0.1', event: `${sys[1]}: ${sys[3]}`, risk: 'Low' };

  return null;
}

// --- API Implementation ---

let settings = { demoMode: false, simulation: true, notifications: true };

// Persistence loading
try {
  db.prepare('SELECT key, value FROM settings').all().forEach(row => {
    try { settings[row.key] = JSON.parse(row.value); } catch {}
  });
  setDemoMode(settings.demoMode); setSimulation(settings.simulation); setAlertsEnabled(settings.notifications);
} catch (err) { console.error('Settings load error:', err); }

function safeQuery(fn, res) {
  try { return res.json(fn()); } catch (err) { console.error('DB error:', err); return res.status(500).json({ error: 'Internal Server Error' }); }
}

// --- Endpoints ---

app.get('/api/dashboard', (req, res) => safeQuery(() => {
    const rows = db.prepare('SELECT timestamp, ip, event, risk FROM logs ORDER BY id DESC LIMIT 1000').all();
    const trafficBuckets = new Map();
    const eventBuckets = { login: 0, network: 0, privilege: 0, file: 0, other: 0 };

    rows.forEach(row => {
      const d = new Date(row.timestamp);
      if (!Number.isNaN(d.getTime())) {
        const key = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        trafficBuckets.set(key, (trafficBuckets.get(key) || 0) + 1);
      }
      if (row.event.includes('Login')) eventBuckets.login++;
      else if (row.event.includes('Network') || row.event.includes('Port')) eventBuckets.network++;
      else if (row.event.includes('Privilege')) eventBuckets.privilege++;
      else if (row.event.includes('File')) eventBuckets.file++;
      else eventBuckets.other++;
    });

    return {
      totalLogs: db.prepare('SELECT COUNT(*) as c FROM logs').get().c,
      failedLogins: db.prepare("SELECT COUNT(*) as c FROM logs WHERE event = 'Failed Login'").get().c,
      highRiskEvents: db.prepare("SELECT COUNT(*) as c FROM logs WHERE risk = 'High'").get().c,
      activeIPs: db.prepare('SELECT COUNT(DISTINCT ip) as c FROM logs').get().c,
      trafficTimeline: Array.from(trafficBuckets.entries()).sort().map(([time, events]) => ({ time, events })),
      eventDistribution: Object.entries(eventBuckets).map(([name, value]) => ({ name, value }))
    };
}, res));

app.get('/api/logs', (req, res) => safeQuery(() => ({ 
    logs: db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 200').all() 
}), res));

app.get('/api/alerts', (req, res) => safeQuery(() => ({ 
    alerts: db.prepare("SELECT * FROM alerts WHERE status != 'safe' ORDER BY id DESC LIMIT 20").all() 
}), res));

app.get('/api/incidents', (req, res) => safeQuery(() => ({
    incidents: db.prepare("SELECT * FROM incidents ORDER BY id DESC LIMIT 50").all()
}), res));

app.get('/api/incidents/:id', (req, res) => {
    const incident = db.prepare("SELECT * FROM incidents WHERE id = ?").get(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Not found' });
    const relatedLogs = db.prepare("SELECT * FROM logs WHERE ip = ? AND timestamp BETWEEN ? AND ? LIMIT 50")
        .all(incident.attacker_ip, new Date(new Date(incident.timestamp).getTime() - 600000).toISOString(), new Date(new Date(incident.timestamp).getTime() + 60000).toISOString());
    res.json({ incident, timeline: relatedLogs });
});

// --- Alert & Incident Lifecycle ---
app.post('/api/alerts/investigate', (req, res) => {
    const { alertId } = req.body;
    db.prepare("UPDATE alerts SET status = 'investigating' WHERE id = ?").run(alertId);
    res.json({ ok: true });
});

app.post('/api/alerts/resolve', (req, res) => {
    const { alertId } = req.body;
    db.prepare("UPDATE alerts SET status = 'safe' WHERE id = ?").run(alertId);
    res.json({ ok: true });
});

app.post('/api/incidents/:id/block', (req, res) => {
    db.prepare("UPDATE incidents SET status = 'Blocked' WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
});

app.post('/api/incidents/:id/resolve', (req, res) => {
    db.prepare("UPDATE incidents SET status = 'Resolved' WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
});

app.post('/api/upload', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  
  const lines = content.split('\n');
  const parsed = lines.map(parseRawLog).filter(Boolean);
  
  const insert = db.prepare('INSERT INTO logs (timestamp, user, ip, event, risk) VALUES (?, ?, ?, ?, ?)');
  const batch = db.transaction((items) => {
    for (const item of items) insert.run(new Date().toISOString(), item.user, item.ip, item.event, item.risk);
  });
  batch(parsed);
  
  res.json({ count: parsed.length });
});

app.get('/api/pc-logs', (req, res) => {
  const psCmd = `Get-WinEvent -FilterHashtable @{LogName='System','Application'; Level=1,2,3} -MaxEvents 50 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id, LevelDisplayName, Message, ProviderName, MachineName | ConvertTo-Json -Compress`;
  
  require('child_process').exec(`powershell.exe -NoProfile -Command "${psCmd}"`, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      if (error) {
          console.error('PowerShell exec error:', error);
          return res.status(500).json({ error: 'Failed to fetch PC logs' });
      }
      
      try {
          if (!stdout || stdout.trim() === '') return res.json({ logs: [] });
          let evtLogs = JSON.parse(stdout);
          if (!Array.isArray(evtLogs)) evtLogs = [evtLogs];
          
          const pLogs = evtLogs.filter(Boolean).map((log, index) => {
              const isHigh = String(log.LevelDisplayName).includes('Error') || String(log.LevelDisplayName).includes('Critical');
              const risk = isHigh ? 'High' : (String(log.LevelDisplayName).includes('Warning') ? 'Medium' : 'Low');
              const cleanMessage = String(log.Message).replace(/\r?\n|\r/g, ' ').substring(0, 150);
              
              let isoTimestamp = log.TimeCreated || new Date().toISOString();
              if (typeof isoTimestamp === 'string' && isoTimestamp.includes('Date(')) {
                  const ms = parseInt(isoTimestamp.match(/\d+/)[0], 10);
                  isoTimestamp = new Date(ms).toISOString();
              }
              
              return {
                  id: `pc-${index}-${Date.now()}`,
                  user: log.MachineName || 'host_system',
                  ip: '127.0.0.1',
                  event: `[${log.ProviderName}] ${cleanMessage}`,
                  risk: risk,
                  timestamp: isoTimestamp
              };
          });
          
          res.json({ logs: pLogs });
      } catch (parseError) {
          console.error('Error parsing PC logs:', parseError);
          res.status(500).json({ error: 'Process parsing error' });
      }
  });
});

app.get('/api/anomalies', (req, res) => safeQuery(() => {
    const rows = db.prepare('SELECT risk, ip FROM logs ORDER BY id DESC LIMIT 500').all();
    const ipCounts = {};
    rows.forEach(r => ipCounts[r.ip] = (ipCounts[r.ip] || 0) + 1);
    const highRiskDensity = rows.filter(r => r.risk === 'High').length / (rows.length || 1);
    
    const scores = rows.slice(0, 100).map(r => {
        let b = r.risk === 'High' ? 0.7 : (r.risk === 'Medium' ? 0.4 : 0.1);
        return Math.min(b + (ipCounts[r.ip] > 10 ? 0.2 : 0) + (highRiskDensity * 0.2), 1.0);
    });

    return {
        anomalyCount: rows.filter(r => r.risk === 'High' || ipCounts[r.ip] > 15).length,
        avgScore: scores.reduce((a,b)=>a+b, 0) / (scores.length || 1),
        scoresOverTime: scores.reverse().map((s, i) => ({ t: i, score: s })),
        totalSamples: rows.length,
        modelHealth: highRiskDensity > 0.4 ? 'Degraded' : 'Healthy'
    };
}, res));

// --- Settings & Simulation ---
app.post('/api/simulation/start', (req, res) => {
    settings.simulation = true;
    setSimulation(true);
    db.prepare("INSERT INTO settings (key, value) VALUES ('simulation', 'true') ON CONFLICT(key) DO UPDATE SET value = 'true'").run();
    res.json({ ok: true });
});

app.post('/api/simulation/stop', (req, res) => {
    settings.simulation = false;
    setSimulation(false);
    db.prepare("INSERT INTO settings (key, value) VALUES ('simulation', 'false') ON CONFLICT(key) DO UPDATE SET value = 'false'").run();
    res.json({ ok: true });
});

app.get('/api/settings', (req, res) => res.json(settings));
app.post('/api/settings', (req, res) => {
  const { demoMode, simulation, notifications } = req.body;
  if (typeof demoMode === 'boolean') { settings.demoMode = demoMode; setDemoMode(demoMode); }
  if (typeof simulation === 'boolean') { settings.simulation = simulation; setSimulation(simulation); }
  if (typeof notifications === 'boolean') { settings.notifications = notifications; setAlertsEnabled(notifications); }
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  Object.entries(settings).forEach(([k, v]) => upsert.run(k, JSON.stringify(v)));
  res.json(settings);
});

app.post('/api/simulator/launch-attack', (req, res) => {
    const { type } = req.body;
    // Inject custom attack logs via DB directly
    const ip = `45.22.11.${Math.floor(Math.random()*255)}`;
    if (type === 'brute-force') {
        const insert = db.prepare('INSERT INTO logs (timestamp, user, ip, event, risk) VALUES (?, ?, ?, ?, ?)');
        for(let i=0; i<6; i++) insert.run(new Date(Date.now() - (6-i)*5000).toISOString(), 'root', ip, 'Failed Login', 'High');
    }
    res.json({ ok: true, type, targetIp: ip });
});

app.post('/api/logs/clear', (req, res) => safeQuery(() => {
    db.prepare('DELETE FROM logs').run();
    db.prepare('DELETE FROM alerts').run();
    db.prepare('DELETE FROM incidents').run();
    return { ok: true };
}, res));

app.post('/api/search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });
    let sql = `SELECT * FROM logs WHERE user LIKE '%${query}%' OR ip LIKE '%${query}%' OR event LIKE '%${query}%' ORDER BY id DESC LIMIT 100`;
    if (query.toLowerCase().includes('high risk')) sql = "SELECT * FROM logs WHERE risk = 'High' ORDER BY id DESC LIMIT 100";
    try { res.json({ results: db.prepare(sql).all(), sql }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`Log-Sense Backend active on PORT ${PORT}`);
  startSimulator();
});
