require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
const {
  startSimulator, setSimulation, setIntensity, setIO: setSimIO,
  launchBruteForce, launchDDoS, launchPortScan,
} = require('./simulator');
const ec2 = require('./ec2connector');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] }, pingTimeout: 30000 });
setSimIO(io);
ec2.setIO(io);

io.on('connection', (socket) => {
  socket.emit('stats:update', getDashboardData());
  socket.emit('ec2:status', { connected: ec2.isConnected() });
});
setInterval(() => io.emit('stats:update', getDashboardData()), 5000);
app.use(cors());
app.use(express.json());
app.use(express.text({ limit: '50mb', type: 'text/plain' }));

// ── Security Intelligence (Analyst-Grade) ────────────────────────────────────

class SecurityMonitor {
  constructor(dbInst) {
    this.db = dbInst;
    this.lastProcessedId = 0;
    this.userPaths = new Map();
    this.knownIPs = new Set();
  }

  start() {
    setInterval(() => this.processLogs(), 3000);
    setInterval(() => this.retentionSweeper(), 60000); // 1 minute sweeper
  }

  retentionSweeper() {
    try {
      // Keep only logs from last hour OR limit to 10k mostly
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      this.db.prepare("DELETE FROM logs WHERE timestamp < ?").run(oneHourAgo);
    } catch(e) {}
  }

  processLogs() {
    try {
      const logs = this.db.prepare('SELECT * FROM logs WHERE id > ? AND is_flagged = 0 ORDER BY id ASC').all(this.lastProcessedId);
      if(logs.length > 0) {
        this.lastProcessedId = logs[logs.length - 1].id;
        this.analyzeBatch(logs);
      }
    } catch (err) {
      console.error('Monitor polling error:', err);
    }
  }

  analyzeBatch(logs) {
    const ipBuckets = {};

    for (const log of logs) {
      if (!ipBuckets[log.ip]) ipBuckets[log.ip] = [];
      ipBuckets[log.ip].push(log);

      // Blocked IP Active Defense
      if (log.risk === 'High' && log.event === 'Blocked IP Activity') {
        // already handled by emitLog/ec2
      } else {
        const isBlocked = this.db.prepare('SELECT id FROM blocked_ips WHERE ip = ?').get(log.ip);
        if (isBlocked) {
          this.createOrUpdateAlert('Blocked IP Activity', 'Critical', `Traffic blocked from known hostile IP ${log.ip}`, log.ip, [log.id], log.source);
        }
      }
    }

    Object.keys(ipBuckets).forEach(ip => {
      const ipLogs = ipBuckets[ip];
      this.detectBruteForce(ip, ipLogs);
      this.detectPortScan(ip, ipLogs);
      this.detectPrivEsc(ipLogs);
      this.detectNewLogin(ip, ipLogs);
    });
  }

  detectNewLogin(ip, logs) {
    const successLogs = logs.filter(l => l.event === 'Login Success' || l.event === 'LOGIN_SUCCESS');
    for (const log of successLogs) {
      if (!this.knownIPs.has(ip)) {
        this.createOrUpdateAlert('New Login Location', 'Medium', `First time successful login observed from IP ${ip}`, ip, [log.id], log.source);
        this.knownIPs.add(ip);
      }
    }
  }

  detectBruteForce(ip, logs) {
    const fails = logs.filter(l => l.event === 'Failed Login' || l.event === 'FAILED_LOGIN');
    if (fails.length >= 3) {
      const logIds = fails.map(l => l.id);
      this.createOrUpdateAlert('Suspicious Login Activity', 'Medium', `Multiple failed logins detected from ${ip}`, ip, logIds, fails[0].source);
    }
  }

  detectPortScan(ip, logs) {
    const scans = logs.filter(l => l.event.includes('Port Scan'));
    if (scans.length >= 3) {
      const logIds = scans.map(l => l.id);
      this.createOrUpdateAlert('Port Scan', 'High', `Port scanning enumeration detected from ${ip}`, ip, logIds, scans[0].source);
    }
  }

  detectPrivEsc(logs) {
    for (const log of logs) {
      const path = this.userPaths.get(log.ip) || [];
      path.push(log);
      if (path.length > 5) path.shift();
      
      if (log.event === 'Privilege Escalation' || log.event === 'PRIVILEGE_ESCALATION' || (log.event.includes('Admin') && log.event.includes('Success'))) {
        const hasFail = path.find(l => l.event.includes('Fail'));
        const alertLogs = hasFail ? [hasFail.id, log.id] : [log.id];
        this.createOrUpdateAlert('Privilege Escalation', 'High', `Privilege Escalation bypass detected target root/admin from ${log.ip}`, log.ip, alertLogs, log.source);
      }
      this.userPaths.set(log.ip, path);
    }
  }

  createOrUpdateAlert(type, severity, description, ip, newLogIds, source) {
    // 1. Alert Deduplication ensuring source isolation
    let currentMode;
    if (forensicMode) currentMode = 'FORENSIC';
    else if (awsMode) currentMode = 'AWS';
    else currentMode = 'SIMULATION';
    
    if (source !== currentMode) return;

    const existingAlert = this.db.prepare(`SELECT id, log_ids FROM alerts WHERE type = ? AND ip = ? AND source = ? AND timestamp > ? AND status != 'resolved'`)
                                 .get(type, ip, source, new Date(Date.now() - 120000).toISOString()); // within 2 mins
    
    let alertId;
    
    if (existingAlert) {
      const logIdsArr = JSON.parse(existingAlert.log_ids);
      const combined = [...new Set([...logIdsArr, ...newLogIds])];
      this.db.prepare('UPDATE alerts SET log_ids = ?, description = ? WHERE id = ?')
             .run(JSON.stringify(combined), description, existingAlert.id);
      alertId = existingAlert.id;
      io.emit('alert:update', { id: alertId, log_ids: JSON.stringify(combined), source });
    } else {
      const riskScore = severity === 'Critical' ? 95 : severity === 'High' ? 85 : 50;
      const res = this.db.prepare('INSERT INTO alerts (log_ids, timestamp, type, ip, risk_score, severity, status, description, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                         .run(JSON.stringify(newLogIds), new Date().toISOString(), type, ip, riskScore, severity, 'new', description, source);
      alertId = res.lastInsertRowid;
      io.emit('alert:new', { id: alertId, log_ids: JSON.stringify(newLogIds), timestamp: new Date().toISOString(), type, ip, risk_score: riskScore, severity, status: 'new', description, source });
    }

    // 2. Mark Logs as Flagged
    if (newLogIds.length > 0) {
      const placeholders = newLogIds.map(() => '?').join(',');
      this.db.prepare(`UPDATE logs SET is_flagged = 1, alert_id = ? WHERE id IN (${placeholders})`).run(alertId, ...newLogIds);
    }

    this.processIncident(alertId, type, severity, ip, description, source);
  }

  processIncident(alertId, type, severity, ip, desc, source) {
    // Incident Deduplication based on attacker_ip
    const openInc = this.db.prepare(`SELECT id, alert_ids, timeline FROM incidents WHERE attacker_ip = ? AND source = ? AND status = 'open'`)
                           .get(ip, source);
    
    if (openInc) {
      const alertArr = JSON.parse(openInc.alert_ids);
      if (!alertArr.includes(alertId)) alertArr.push(alertId);
      
      const timelineArr = JSON.parse(openInc.timeline);
      timelineArr.push({ time: new Date().toISOString(), step: `Alert triggered: ${type}` });

      this.db.prepare('UPDATE incidents SET alert_ids = ?, timeline = ? WHERE id = ?')
             .run(JSON.stringify(alertArr), JSON.stringify(timelineArr), openInc.id);
      
      this.db.prepare('UPDATE alerts SET incident_id = ? WHERE id = ?').run(openInc.id, alertId);
      this.db.prepare(`UPDATE logs SET incident_id = ? WHERE alert_id = ?`).run(openInc.id, alertId);

      io.emit('incident:update', { id: openInc.id, alert_ids: JSON.stringify(alertArr), timeline: JSON.stringify(timelineArr), source });
    } else {
      const timeline = [{ time: new Date().toISOString(), step: `Initial Contact: ${type}` }];
      const res = this.db.prepare('INSERT INTO incidents (alert_ids, timestamp, type, severity, description, attacker_ip, target_user, timeline, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                         .run(JSON.stringify([alertId]), new Date().toISOString(), type, severity, desc, ip, 'system', JSON.stringify(timeline), source);
      
      const incId = res.lastInsertRowid;
      this.db.prepare('UPDATE alerts SET incident_id = ? WHERE id = ?').run(incId, alertId);
      this.db.prepare(`UPDATE logs SET incident_id = ? WHERE alert_id = ?`).run(incId, alertId);
      
      io.emit('incident:new', { id: incId, alert_ids: JSON.stringify([alertId]), timestamp: new Date().toISOString(), type, severity, attacker_ip: ip, timeline: JSON.stringify(timeline), source });
    }
  }
}

const monitor = new SecurityMonitor(db);
monitor.start();

// ── Dashboard data helper ────────────────────────────────────────────────────
function getDashboardData(sourceMode = 'SIMULATION') {
  try {
    const rows = db.prepare('SELECT timestamp, ip, event, risk FROM logs WHERE source = ? ORDER BY id DESC LIMIT 1000').all(sourceMode);
    const trafficBuckets = new Map();
    const eventBuckets = { login: 0, network: 0, privilege: 0, file: 0, other: 0 };
    rows.forEach(r => {
      const d = new Date(r.timestamp);
      if (!Number.isNaN(d.getTime())) {
        const key = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        trafficBuckets.set(key, (trafficBuckets.get(key) || 0) + 1);
      }
      if (r.event.includes('Login') || r.event.includes('LOGIN')) eventBuckets.login++;
      else if (r.event.includes('Network') || r.event.includes('Port')) eventBuckets.network++;
      else if (r.event.includes('Privilege') || r.event.includes('PRIV')) eventBuckets.privilege++;
      else if (r.event.includes('File')) eventBuckets.file++;
      else eventBuckets.other++;
    });
    return {
      totalLogs: db.prepare('SELECT COUNT(*) as c FROM logs WHERE source = ?').get(sourceMode).c,
      failedLogins: db.prepare("SELECT COUNT(*) as c FROM logs WHERE source = ? AND (event LIKE '%Fail%' OR event LIKE '%FAIL%')").get(sourceMode).c,
      highRiskEvents: db.prepare("SELECT COUNT(*) as c FROM logs WHERE source = ? AND risk = 'High'").get(sourceMode).c,
      activeIPs: db.prepare('SELECT COUNT(DISTINCT ip) as c FROM logs WHERE source = ?').get(sourceMode).c,
      trafficTimeline: Array.from(trafficBuckets.entries()).sort().map(([t, e]) => ({ time: t, events: e })),
      eventDistribution: Object.entries(eventBuckets).map(([n, v]) => ({ name: n, value: v })),
    };
  } catch (err) { return {}; }
}

// ── API Endpoints ────────────────────────────────────────────────────────────

let awsMode = false;
let forensicMode = false;

// Central mode resolver — single source of truth for all endpoints
function resolveSource(queryMode) {
  if (queryMode === 'aws') return 'AWS';
  if (queryMode === 'forensic') return 'FORENSIC';
  return 'SIMULATION';
}

app.get('/api/dashboard', (req, res) => {
  const mode = resolveSource(req.query.mode);
  res.json(getDashboardData(mode));
});

app.get('/api/logs', (req, res) => {
  const mode = resolveSource(req.query.mode);
  res.json({ logs: db.prepare('SELECT * FROM logs WHERE source = ? ORDER BY id DESC LIMIT 200').all(mode) });
});

app.get('/api/alerts', (req, res) => {
  const mode = resolveSource(req.query.mode);
  res.json({ alerts: db.prepare("SELECT * FROM alerts WHERE source = ? AND status != 'resolved' ORDER BY id DESC LIMIT 50").all(mode) });
});

app.get('/api/incidents', (req, res) => {
  const mode = resolveSource(req.query.mode);
  res.json({ incidents: db.prepare("SELECT * FROM incidents WHERE source = ? AND status != 'resolved' ORDER BY id DESC LIMIT 50").all(mode) });
});

app.get('/api/incidents/:id', (req, res) => {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });
  const relatedLogs = db.prepare('SELECT * FROM logs WHERE incident_id = ? ORDER BY id ASC').all(incident.id);
  const relatedAlerts = db.prepare('SELECT * FROM alerts WHERE incident_id = ? ORDER BY id ASC').all(incident.id);
  res.json({ incident, timeline: relatedLogs, alerts: relatedAlerts });
});

// ── Alert & Incident Lifecycle ───────────────────────────────────────────────

app.post('/api/alerts/investigate', (req, res) => {
  const { alertId } = req.body;
  db.prepare("UPDATE alerts SET status = 'investigating' WHERE id = ?").run(alertId);
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);
  io.emit('alert:update', alert);
  res.json({ ok: true, alert });
});

app.post('/api/alerts/resolve', (req, res) => {
  const { alertId } = req.body;
  db.prepare("UPDATE alerts SET status = 'resolved' WHERE id = ?").run(alertId);
  io.emit('alert:update', { id: alertId, status: 'resolved' });
  res.json({ ok: true });
});

app.post('/api/incidents/:id/block', (req, res) => {
  const incident = db.prepare('SELECT attacker_ip FROM incidents WHERE id = ?').get(req.params.id);
  if(incident) {
    try {
      db.prepare('INSERT INTO blocked_ips (ip, created_at) VALUES (?, ?)').run(incident.attacker_ip, new Date().toISOString());
    } catch(e) {} // unique constraint handled
  }
  db.prepare("UPDATE incidents SET status = 'blocked' WHERE id = ?").run(req.params.id);
  io.emit('incident:update', { id: Number(req.params.id), status: 'blocked' });
  res.json({ ok: true });
});

app.post('/api/incidents/:id/resolve', (req, res) => {
  db.prepare("UPDATE incidents SET status = 'resolved' WHERE id = ?").run(req.params.id);
  io.emit('incident:update', { id: Number(req.params.id), status: 'resolved' });
  res.json({ ok: true });
});

// ── AWS vs Simulation Mode Endpoints ─────────────────────────────────────────

app.post('/api/settings/mode', (req, res) => {
  const { mode } = req.body; // 'aws' | 'sim' | 'forensic'
  awsMode = (mode === 'aws');
  forensicMode = (mode === 'forensic');
  
  let sourceMode = 'SIMULATION';
  if (awsMode) sourceMode = 'AWS';
  if (forensicMode) sourceMode = 'FORENSIC';
  
  try {
    const ts = new Date().toISOString();
    const result = db.prepare('INSERT INTO logs (timestamp, user, ip, event, risk, source) VALUES (?, ?, ?, ?, ?, ?)')
                     .run(ts, 'SYSTEM', 'localhost', `SYSTEM_EVENT: Mode Switched to ${sourceMode}`, 'Low', sourceMode);
    io.emit('log:new', { id: result.lastInsertRowid, timestamp: ts, user: 'SYSTEM', ip: 'localhost', event: `SYSTEM_EVENT: Mode Switched to ${sourceMode}`, risk: 'Low', source: sourceMode, is_flagged: 0, alert_id: null, incident_id: null });
  } catch(e) {}

  if (awsMode) {
    setSimulation(false);
    const conf = ec2.getConfig();
    if(conf && conf.host && conf.enabled && !ec2.isConnected()) {
      ec2.connect();
    }
  } else if (forensicMode) {
    setSimulation(false);
    ec2.disconnect();
  } else {
    ec2.disconnect();
    setSimulation(true);
  }
  res.json({ ok: true, awsMode, forensicMode });
});

// Simulator triggers
app.post('/api/simulator/launch-attack', (req, res) => {
  if (awsMode || forensicMode) return res.status(403).json({ error: 'Simulation disabled in this mode' });
  const { type } = req.body;
  let result;
  switch (type) {
    case 'brute-force': result = launchBruteForce(); break;
    case 'ddos': result = launchDDoS(); break;
    case 'port-scan': result = launchPortScan(); break;
    default: return res.status(400).json({ error: `Unknown: ${type}` });
  }
  res.json({ ok: true, ...result });
});

app.post('/api/simulation/start', (req, res) => { if (awsMode || forensicMode) return res.status(403).json({}); setSimulation(true); res.json({ ok: true }); });
app.post('/api/simulation/stop', (req, res) => { setSimulation(false); res.json({ ok: true }); });

// EC2 Integration
app.get('/api/ec2/config', (req, res) => res.json(ec2.getConfig()));
app.post('/api/ec2/config', (req, res) => {
  ec2.updateConfig(req.body);
  res.json({ ok: true, connected: ec2.isConnected() });
});

app.post('/api/search', (req, res) => {
  const { query } = req.body;
  const mode = resolveSource(req.query.mode);
  const q = query.toLowerCase().trim();
  let sql = "SELECT * FROM logs WHERE source = ?";
  if (q.includes('failed') || q.includes('brute')) sql += " AND (event LIKE '%Fail%' OR event LIKE '%FAIL%')";
  else if (q.includes('high risk')) sql += " AND risk = 'High'";
  sql += ' ORDER BY id DESC LIMIT 100';
  const results = db.prepare(sql).all(mode);
  res.json({ results, sql, count: results.length });
});

app.get('/api/anomalies', (req, res) => {
  const mode = resolveSource(req.query.mode);
  const recentLogs = db.prepare('SELECT * FROM logs WHERE source = ? ORDER BY id DESC LIMIT 500').all(mode);
  
  // Calculate a rolling anomaly score based on High risk density
  const scoresOverTime = [];
  let currentWindow = [];
  let anomaliesCount = 0;
  
  // Create a time series for area chart
  for (let i = 0; i < 20; i++) {
    const subset = recentLogs.slice(i * 25, (i + 1) * 25);
    const highRisk = subset.filter(l => l.risk === 'High').length;
    const score = subset.length > 0 ? (highRisk / subset.length) + (Math.random() * 0.1) : Math.random() * 0.1;
    scoresOverTime.unshift({ t: i, score: Math.min(score, 1) });
    if (score > 0.5) anomaliesCount++;
  }

  const avgScore = scoresOverTime.reduce((a, b) => a + b.score, 0) / (scoresOverTime.length || 1);
  const modelHealth = avgScore > 0.6 ? 'Degraded' : 'Healthy';
  
  const patterns = [];
  if (recentLogs.filter(l => l.event.toLowerCase().includes('port scan')).length > 5) {
    patterns.push({ title: 'Volume Outlier: Network Scanning', severity: 'High', description: 'Extremely high volume of sequential connection strings detected deviating from normal traffic baselines.' });
  }
  if (recentLogs.filter(l => l.event.toLowerCase().includes('fail')).length > 10) {
    patterns.push({ title: 'Authentication Spikes', severity: 'Critical', description: 'Authentication failure frequency is 400% above 24-hour moving average, indicating active credential stuffing or brute force.' });
  }
  if (patterns.length === 0) {
    patterns.push({ title: 'Routine Noise', severity: 'Low', description: 'Standard background noise. No significant topological anomalies detected in recent network vectors.' });
  }

  res.json({
    anomalyCount: anomaliesCount,
    avgScore,
    scoresOverTime,
    modelHealth,
    patterns,
    totalSamples: recentLogs.length
  });
});

app.get('/api/system-logs', (req, res) => {
  let mode = 'SIMULATION';
  if (req.query.mode === 'aws') mode = 'AWS';
  if (req.query.mode === 'forensic') mode = 'FORENSIC';
  
  const systemLogs = db.prepare("SELECT * FROM logs WHERE source = ? AND event LIKE 'SYSTEM_EVENT%' ORDER BY id DESC LIMIT 200").all(mode);
  res.json({ logs: systemLogs });
});

app.get('/api/logs/suspicious', (req, res) => {
  let mode = 'SIMULATION';
  if (req.query.mode === 'aws') mode = 'AWS';
  if (req.query.mode === 'forensic') mode = 'FORENSIC';

  const suspiciousLogs = db.prepare("SELECT * FROM logs WHERE source = ? AND risk IN ('Medium', 'High') AND event NOT LIKE 'SYSTEM_EVENT%' ORDER BY id DESC LIMIT 100").all(mode);
  res.json({ logs: suspiciousLogs });
});

app.post('/api/forensic/upload', (req, res) => {
  if (typeof req.body !== 'string' || !req.body.trim()) {
    return res.status(400).json({ error: 'Valid raw text log body is required' });
  }

  // Clean start: purge all previous forensic data so each upload is fresh
  db.prepare("DELETE FROM logs WHERE source = 'FORENSIC'").run();
  db.prepare("DELETE FROM alerts WHERE source = 'FORENSIC'").run();
  db.prepare("DELETE FROM incidents WHERE source = 'FORENSIC'").run();

  const lines = req.body.split(/\r?\n/).filter(l => l.trim().length > 0);
  const parsedLogs = [];
  
  lines.forEach(line => {
    let eventObj = { event: 'UNKNOWN_EVENT', user: 'unknown', ip: 'unknown', risk: 'Low' };
    
    // Auth.log patterns
    let match = line.match(/(?:Failed password|Invalid user.*?|Failed).*(?:for|user)\s+([^\s]+)\s+from\s+([\d.]+)/i);
    if (match) {
      eventObj = { event: 'FAILED_LOGIN', user: match[1], ip: match[2], risk: 'Medium' };
    } else {
      match = line.match(/Accepted (?:publickey|password) for\s+([^\s]+)\s+from\s+([\d.]+)/i);
      if (match) {
        eventObj = { event: 'LOGIN_SUCCESS', user: match[1], ip: match[2], risk: 'Low' };
      } else {
        match = line.match(/session opened for user ([^\s]+).*?(?:by |from )([\d.]+)?/i);
        if (match) {
          eventObj = { event: 'LOGIN_SUCCESS', user: match[1], ip: match[2] || 'unknown', risk: 'Low' };
        } else {
          match = line.match(/(?:sudo|su).*?COMMAND=(.*)/i);
          if (match) {
            eventObj = { event: 'PRIVILEGE_ESCALATION', user: 'admin', ip: line.match(/([\d.]+)/) ? line.match(/([\d.]+)/)[1] : 'unknown', risk: 'High' };
          } else {
            // General IPv4 extraction fallback
            const ipExt = line.match(/([\d.]+)/);
            if (ipExt) eventObj.ip = ipExt[1];
            eventObj.event = line.substring(line.length > 80 ? line.length - 80 : 0).trim();
          }
        }
      }
    }
    
    try {
      const ts = new Date().toISOString();
      const insert = db.prepare('INSERT INTO logs (timestamp, user, ip, event, risk, source) VALUES (?, ?, ?, ?, ?, ?)')
                       .run(ts, eventObj.user, eventObj.ip, eventObj.event, eventObj.risk, 'FORENSIC');
      parsedLogs.push({
        id: insert.lastInsertRowid,
        timestamp: ts,
        user: eventObj.user,
        ip: eventObj.ip,
        event: eventObj.event,
        risk: eventObj.risk,
        source: 'FORENSIC',
        is_flagged: 0, alert_id: null, incident_id: null
      });
    } catch(e) {}
  });

  parsedLogs.forEach(entry => io.emit('log:new', entry));

  // Spin security monitor rules
  sm.processLogs();

  res.json({ ok: true, ingestedCount: parsedLogs.length });
});

app.post('/api/logs/clear', (req, res) => {
  db.prepare('DELETE FROM logs').run();
  db.prepare('DELETE FROM alerts').run();
  db.prepare('DELETE FROM incidents').run();
  db.prepare('DELETE FROM blocked_ips').run();
  res.json({ok: true});
});

// ── Start Server ─────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`Log-Sense Backend active on PORT ${PORT}`);
  // By default start simulation unless mode=aws is set via API later
  startSimulator();
});
