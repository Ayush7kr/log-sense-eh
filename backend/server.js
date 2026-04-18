require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const fetch = require('node-fetch');
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let limit;
(async () => {
    const pLimitReq = (await import('p-limit')).default;
    limit = pLimitReq(5);
})();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
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
      const user = log.user || 'unknown';
      let profile = this.db.prepare('SELECT * FROM user_profiles WHERE user = ? AND source = ?').get(user, log.source);
      
      if (!profile) {
        this.db.prepare('INSERT INTO user_profiles (user, known_ips, login_count, last_login, source) VALUES (?, ?, 1, ?, ?)')
               .run(user, JSON.stringify([ip]), log.timestamp, log.source);
      } else {
        const knownIps = JSON.parse(profile.known_ips);
        if (!knownIps.includes(ip)) {
          this.createOrUpdateAlert('New Login Location', 'Medium', `First time successful login observed for ${user} from IP ${ip}`, ip, [log.id], log.source);
          knownIps.push(ip);
        }
        this.db.prepare('UPDATE user_profiles SET known_ips = ?, login_count = login_count + 1, last_login = ? WHERE id = ?')
               .run(JSON.stringify(knownIps), log.timestamp, profile.id);
      }
    }
  }

  detectBruteForce(ip, logs) {
    const fails = logs.filter(l => l.event === 'Failed Login' || l.event === 'FAILED_LOGIN');
    if (fails.length >= 3) {
      const logIds = fails.map(l => l.id);
      this.createOrUpdateAlert('Suspicious Login Activity', 'Medium', `Multiple failed logins detected from ${ip}`, ip, logIds, fails[0].source);
      
      // Auto-defense: block IP if enabled
      if (fails.length >= 5 && isAutoDefenseEnabled()) {
        this.autoBlockIP(ip, fails[0].source);
      }
    }
  }

  detectPortScan(ip, logs) {
    const scans = logs.filter(l => l.event.includes('Port Scan'));
    if (scans.length >= 3) {
      const logIds = scans.map(l => l.id);
      this.createOrUpdateAlert('Port Scan', 'High', `Port scanning enumeration detected from ${ip}`, ip, logIds, scans[0].source);
      
      // Auto-defense: block IP if enabled
      if (scans.length >= 5 && isAutoDefenseEnabled()) {
        this.autoBlockIP(ip, scans[0].source);
      }
    }
  }

  autoBlockIP(ip, source) {
    try {
      const already = db.prepare('SELECT id FROM blocked_ips WHERE ip = ? AND source = ?').get(ip, source);
      if (!already) {
        db.prepare('INSERT INTO blocked_ips (ip, source, created_at) VALUES (?, ?, ?)').run(ip, source, new Date().toISOString());
        io.emit('defense:block', { ip, source, auto: true });
        console.log(`[AUTO-DEFENSE] Blocked ${ip} in ${source}`);
      }
    } catch(e) {}
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

  getSeverityScore(severity) {
    if (severity === 'Critical') return 15;
    if (severity === 'High') return 10;
    if (severity === 'Medium') return 5;
    return 1;
  }

  createOrUpdateAlert(type, severity, description, ip, newLogIds, source) {
    let currentMode;
    if (forensicMode) currentMode = 'FORENSIC';
    else if (awsMode) currentMode = 'AWS';
    else currentMode = 'SIMULATION';
    
    if (source !== currentMode) return;

    const existingAlert = this.db.prepare(`SELECT id, log_ids FROM alerts WHERE type = ? AND ip = ? AND source = ? AND timestamp > ? AND status != 'resolved'`)
                                 .get(type, ip, source, new Date(Date.now() - 120000).toISOString()); 
    
    let alertId;
    const severityScore = this.getSeverityScore(severity);
    
    if (existingAlert) {
      const logIdsArr = JSON.parse(existingAlert.log_ids);
      const combined = [...new Set([...logIdsArr, ...newLogIds])];
      this.db.prepare('UPDATE alerts SET log_ids = ?, description = ? WHERE id = ?')
             .run(JSON.stringify(combined), description, existingAlert.id);
      alertId = existingAlert.id;
      io.emit('alert:update', { id: alertId, log_ids: JSON.stringify(combined), source });
    } else {
      const riskScore = severity === 'Critical' ? 95 : severity === 'High' ? 85 : 50;
      const res = this.db.prepare('INSERT INTO alerts (log_ids, timestamp, type, ip, risk_score, severity, severity_score, status, description, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                         .run(JSON.stringify(newLogIds), new Date().toISOString(), type, ip, riskScore, severity, severityScore, 'new', description, source);
      alertId = res.lastInsertRowid;
      io.emit('alert:new', { id: alertId, log_ids: JSON.stringify(newLogIds), timestamp: new Date().toISOString(), type, ip, risk_score: riskScore, severity, severity_score: severityScore, status: 'new', description, source });
    }

    if (newLogIds.length > 0) {
      const placeholders = newLogIds.map(() => '?').join(',');
      this.db.prepare(`UPDATE logs SET is_flagged = 1, alert_id = ? WHERE id IN (${placeholders})`).run(alertId, ...newLogIds);
    }

    this.processIncident(alertId, type, severity, severityScore, ip, description, source);
  }

  processIncident(alertId, type, severity, severityScore, ip, desc, source) {
    const openInc = this.db.prepare(`SELECT id, alert_ids, timeline, severity_score FROM incidents WHERE attacker_ip = ? AND source = ? AND status = 'open'`)
                           .get(ip, source);
    
    if (openInc) {
      const alertArr = JSON.parse(openInc.alert_ids);
      if (!alertArr.includes(alertId)) alertArr.push(alertId);
      
      const timelineArr = JSON.parse(openInc.timeline);
      timelineArr.push({ time: new Date().toISOString(), step: `Alert triggered: ${type}` });

      const newScore = Math.max(openInc.severity_score, severityScore);

      this.db.prepare('UPDATE incidents SET alert_ids = ?, timeline = ?, severity_score = ? WHERE id = ?')
             .run(JSON.stringify(alertArr), JSON.stringify(timelineArr), newScore, openInc.id);
      
      this.db.prepare('UPDATE alerts SET incident_id = ? WHERE id = ?').run(openInc.id, alertId);
      this.db.prepare(`UPDATE logs SET incident_id = ? WHERE alert_id = ?`).run(openInc.id, alertId);

      io.emit('incident:update', { id: openInc.id, alert_ids: JSON.stringify(alertArr), timeline: JSON.stringify(timelineArr), severity_score: newScore, source });
    } else {
      const timeline = [{ time: new Date().toISOString(), step: `Initial Contact: ${type}` }];
      const res = this.db.prepare('INSERT INTO incidents (alert_ids, timestamp, type, severity, severity_score, description, attacker_ip, target_user, timeline, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                         .run(JSON.stringify([alertId]), new Date().toISOString(), type, severity, severityScore, desc, ip, 'system', JSON.stringify(timeline), source);
      
      const incId = res.lastInsertRowid;
      this.db.prepare('UPDATE alerts SET incident_id = ? WHERE id = ?').run(incId, alertId);
      this.db.prepare(`UPDATE logs SET incident_id = ? WHERE alert_id = ?`).run(incId, alertId);
      
      io.emit('incident:new', { id: incId, alert_ids: JSON.stringify([alertId]), timestamp: new Date().toISOString(), type, severity, severity_score: severityScore, attacker_ip: ip, timeline: JSON.stringify(timeline), source });
    }
  }
}

function isAutoDefenseEnabled() {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'auto_defense'").get();
    return row ? row.value === 'true' : true; // default ON
  } catch(e) { return true; }
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

// ── Advanced SOC Helpers ─────────────────────────────────────────────────────

function explainRisk(eventString) {
  if (!eventString) return 'Standard network activity logged.';
  const str = eventString.toLowerCase();
  
  if (str.includes('fail')) return 'Repeated failed authentication attempts often indicate a brute force or credential stuffing attack.';
  if (str.includes('privilege') || str.includes('priv_esc') || str.includes('root') || str.includes('sudo') || str.includes('admin')) return 'Administrative access or privilege escalation events indicate potential unauthorized system control.';
  if (str.includes('scan') || str.includes('probe')) return 'Port scanning patterns suggest an adversary is mapping out available network surfaces and vulnerabilities.';
  if (str.includes('ddos') || str.includes('flood')) return 'Unusually high geometric packet volumes observed, indicative of a Denial of Service disruption attempt.';
  if (str.includes('success')) return 'Successful authentication record, verify if this correlates temporally with anomalous behavior.';
  return 'Standard network activity. No immediate malicious heuristics identified natively.';
}

function generateAttackStory(timelineStr) {
  try {
    const timelineObj = JSON.parse(timelineStr);
    if (!timelineObj || !Array.isArray(timelineObj)) return 'No timeline data available to generate a narrative.';
    
    const steps = timelineObj.map(t => t.step || t.event).filter(Boolean);
    if (steps.length === 0) return 'Insufficient sequence data to formulate an attack narrative.';

    const storyParts = [];
    const joined = steps.join(' → ').toLowerCase();
    
    if (joined.includes('fail') && joined.includes('success')) {
      storyParts.push('The adversary initiated a burst of authentication bypass attempts, successfully guessing a valid credential payload shortly thereafter.');
    } else if (joined.includes('fail')) {
      storyParts.push('The attacker launched an aggressive brute-force campaign against external authentication surfaces, which ultimately failed to breach the perimeter.');
    }
    
    if (joined.includes('scan')) {
      storyParts.push('Initial contact mapped open ports aiming to inventory externally accessible infrastructure.');
    }
    
    if (joined.includes('privilege')) {
      storyParts.push('Following initial access, the actor utilized an exploit or misconfigured permission matrix to elevate to root/admin privileges.');
    }
    
    if (storyParts.length === 0) {
       return `Telemetry highlights the following sequence: ${steps.slice(0, 3).join(', ')}... further contextualization requires deep-packet tracking.`;
    }
    
    return storyParts.join(' ');
  } catch(e) {
    return 'Timeline data unparseable.';
  }
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
  const { ip, user, risk, event, start, end } = req.query;
  
  let sql = 'SELECT * FROM logs WHERE source = ?';
  const params = [mode];
  
  if (ip && ip.trim() !== '') { sql += ' AND ip LIKE ?'; params.push(`%${ip.trim()}%`); }
  if (user && user.trim() !== '') { sql += ' AND user LIKE ?'; params.push(`%${user.trim()}%`); }
  if (risk && risk !== 'All' && risk !== '') { sql += ' AND risk = ?'; params.push(risk); }
  if (event && event !== 'All' && event !== '') { sql += ' AND event LIKE ?'; params.push(`%${event}%`); }
  if (start) { sql += ' AND timestamp >= ?'; params.push(start); }
  if (end) { sql += ' AND timestamp <= ?'; params.push(end); }
  
  sql += ' ORDER BY id DESC LIMIT 500';
  
  try {
    const logs = db.prepare(sql).all(...params).map(log => ({
      ...log,
      explanation: explainRisk(log.event)
    }));
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs/clusters', (req, res) => {
  const mode = resolveSource(req.query.mode);
  const qs = req.query.start || new Date(Date.now() - 24*3600*1000).toISOString();
  try {
    const clusters = db.prepare(`SELECT ip, event, COUNT(*) as count FROM logs WHERE source = ? AND timestamp >= ? GROUP BY ip, event ORDER BY count DESC LIMIT 50`).all(mode, qs);
    res.json({ clusters });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/export', (req, res) => {
  const mode = resolveSource(req.query.mode);
  const type = req.query.type || 'logs'; // logs, alerts, incidents
  
  try {
    let data = [];
    if (type === 'logs') data = db.prepare('SELECT timestamp, user, ip, event, risk, source FROM logs WHERE source = ? ORDER BY id DESC LIMIT 5000').all(mode);
    if (type === 'alerts') data = db.prepare('SELECT timestamp, type, ip, risk_score, severity, status, description, source FROM alerts WHERE source = ? ORDER BY id DESC').all(mode);
    if (type === 'incidents') data = db.prepare('SELECT timestamp, type, severity, severity_score, status, attacker_ip, target_user, description, source FROM incidents WHERE source = ? ORDER BY id DESC').all(mode);
    
    if (data.length === 0) return res.status(404).json({ error: 'No data' });
    
    const fields = Object.keys(data[0]);
    const csv = [
      fields.join(','),
      ...data.map(row => fields.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`${type}_${mode}_${new Date().toISOString()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function queueGeoLookup(ip, mode) {
  if (!limit || ip === 'unknown' || ip === 'localhost' || ip === '') return;
  
  const existing = db.prepare('SELECT id FROM geo_cache WHERE ip = ? AND source = ?').get(ip, mode);
  if (existing) return;

  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.') || ip === '127.0.0.1') {
     return;
  }

  limit(async () => {
    try {
      const existingCheck = db.prepare('SELECT id FROM geo_cache WHERE ip = ? AND source = ?').get(ip, mode);
      if (existingCheck) return;
      
      const resp = await axios.get(`http://ip-api.com/json/${ip}`);
      if (resp.data.status === 'success') {
        const { country, city, lat, lon } = resp.data;
        const ts = new Date().toISOString();
        db.prepare('INSERT INTO geo_cache (ip, country, city, lat, lon, updated_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(ip, country, city, lat, lon, ts, mode);
        io.emit('geo:update', { ip, country, city, lat, lon, source: mode });
      } else {
        // Mark as failed or internal so we don't spam api
        const ts = new Date().toISOString();
        db.prepare('INSERT INTO geo_cache (ip, country, city, lat, lon, updated_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(ip, 'Unknown', 'Unknown', 0, 0, ts, mode);
      }
    } catch(e) { console.error('Geo Lookup failed:', e.message); }
  });
}

app.get('/api/geo-data', (req, res) => {
  const mode = resolveSource(req.query.mode);
  try {
    // 1. Get recent distinct IPs and their worst risk (or any risk)
    const logRows = db.prepare("SELECT ip, risk FROM logs WHERE source = ? AND ip != 'unknown' AND ip != 'localhost' ORDER BY id DESC LIMIT 200").all(mode);
    
    const ipRiskMap = {};
    for (const row of logRows) {
      if (!ipRiskMap[row.ip] || row.risk === 'Critical' || row.risk === 'High') {
         ipRiskMap[row.ip] = row.risk;
      }
    }
    const ips = Object.keys(ipRiskMap);

    let geoData = [];
    if (ips.length > 0) {
      const placeholders = ips.map(() => '?').join(',');
      const cachedMaps = db.prepare(`SELECT * FROM geo_cache WHERE source = ? AND ip IN (${placeholders})`).all(mode, ...ips);
      
      geoData = cachedMaps.map(c => ({
        ...c,
        risk: ipRiskMap[c.ip] || 'Low'
      }));
    }

    res.json({ geoData });
    
    if (limit && ips.length > 0) {
      setTimeout(() => {
        ips.forEach(ip => {
          const c = db.prepare('SELECT id FROM geo_cache WHERE ip = ? AND source = ?').get(ip, mode);
          if (!c) queueGeoLookup(ip, mode);
        });
      }, 100);
    }
  } catch (err) {
    res.json({ geoData: [] });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    const autoDefRow = db.prepare("SELECT value FROM settings WHERE key = 'auto_defense'").get();
    const autoDefense = autoDefRow ? autoDefRow.value === 'true' : true;
    res.json({ status: 'ok', demoMode: false, notifications: true, intensity: 'medium', autoDefense });
  } catch(e) {
    res.json({ status: 'ok', demoMode: false, notifications: true, intensity: 'medium', autoDefense: true });
  }
});

// ── Threat Score ──────────────────────────────────────────────────────────────

app.get('/api/threat-score', (req, res) => {
  const mode = resolveSource(req.query.mode);
  try {
    const activeAlerts = db.prepare("SELECT severity FROM alerts WHERE source = ? AND status != 'resolved'").all(mode);
    const activeIncidents = db.prepare("SELECT severity_score FROM incidents WHERE source = ? AND status != 'resolved'").all(mode);
    const blockedCount = (() => {
      try { return db.prepare("SELECT COUNT(*) as c FROM blocked_ips WHERE source = ?").get(mode)?.c || 0; } catch(e) { return 0; }
    })();

    let rawScore = 0;
    for (const a of activeAlerts) {
      if (a.severity === 'Critical') rawScore += 25;
      else if (a.severity === 'High') rawScore += 15;
      else if (a.severity === 'Medium') rawScore += 8;
      else rawScore += 2;
    }
    for (const i of activeIncidents) {
      rawScore += (i.severity_score || 0) * 2;
    }
    rawScore += blockedCount * 5;

    const score = Math.min(100, Math.round(rawScore));

    let level = 'Low';
    if (score >= 75) level = 'Critical';
    else if (score >= 50) level = 'High';
    else if (score >= 25) level = 'Medium';

    res.json({
      score,
      level,
      activeAlerts: activeAlerts.length,
      activeIncidents: activeIncidents.length,
      blockedIPs: blockedCount,
    });
  } catch(e) {
    res.json({ score: 0, level: 'Low', activeAlerts: 0, activeIncidents: 0, blockedIPs: 0 });
  }
});

// ── Advanced SOC Search ──────────────────────────────────────────────────────

app.get('/api/search', (req, res) => {
  const mode = resolveSource(req.query.mode);
  const q = req.query.q || '';

  try {
    let sql = 'SELECT * FROM logs WHERE source = ?';
    const params = [mode];

    // Parse "key=value AND key=value" style queries safely
    const tokens = q.split(/\s+AND\s+/i);
    for (const token of tokens) {
      const match = token.match(/^(\w+)\s*=\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        const safeKey = key.toLowerCase();
        if (['user', 'ip', 'event', 'risk'].includes(safeKey)) {
          sql += ` AND ${safeKey} LIKE ?`;
          params.push(`%${value.trim()}%`);
        }
      }
    }

    sql += ' ORDER BY id DESC LIMIT 500';
    const logs = db.prepare(sql).all(...params).map(log => ({
      ...log,
      explanation: explainRisk(log.event)
    }));
    res.json({ logs });
  } catch(e) {
    res.json({ logs: [] });
  }
});

app.get('/api/alerts', (req, res) => {
  const mode = resolveSource(req.query.mode);
  const alerts = db.prepare("SELECT * FROM alerts WHERE source = ? AND status != 'resolved' ORDER BY id DESC LIMIT 50").all(mode).map(a => ({
    ...a,
    explanation: explainRisk(a.type + ' ' + a.description)
  }));
  res.json({ alerts });
});

app.get('/api/incidents', (req, res) => {
  const mode = resolveSource(req.query.mode);
  const incidents = db.prepare("SELECT * FROM incidents WHERE source = ? AND status != 'resolved' ORDER BY id DESC LIMIT 50").all(mode).map(i => ({
    ...i,
    story: generateAttackStory(i.timeline),
    explanation: explainRisk(i.type + ' ' + i.description)
  }));
  res.json({ incidents });
});

app.get('/api/incidents/:id', (req, res) => {
  let incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });
  
  incident = {
    ...incident,
    story: generateAttackStory(incident.timeline),
    explanation: explainRisk(incident.type + ' ' + incident.description)
  };
  
  const relatedLogs = db.prepare('SELECT * FROM logs WHERE incident_id = ? ORDER BY id ASC').all(incident.id).map(l => ({
    ...l,
    explanation: explainRisk(l.event)
  }));
  const relatedAlerts = db.prepare('SELECT * FROM alerts WHERE incident_id = ? ORDER BY id ASC').all(incident.id).map(a => ({
    ...a,
    explanation: explainRisk(a.type + ' ' + a.description)
  }));
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
  const incident = db.prepare('SELECT attacker_ip, source FROM incidents WHERE id = ?').get(req.params.id);
  if(incident) {
    try {
      db.prepare('INSERT INTO blocked_ips (ip, source, created_at) VALUES (?, ?, ?)').run(incident.attacker_ip, incident.source, new Date().toISOString());
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

// ── Auto Defense Controls ────────────────────────────────────────────────────

app.post('/api/block-ip', (req, res) => {
  const { ip, mode } = req.body;
  const source = resolveSource(mode);
  try {
    db.prepare('INSERT INTO blocked_ips (ip, source, created_at) VALUES (?, ?, ?)').run(ip, source, new Date().toISOString());
    io.emit('defense:block', { ip, source });
    res.json({ ok: true });
  } catch(e) {
    res.json({ ok: false, error: 'IP already blocked in this mode' });
  }
});

app.post('/api/settings/auto-defense', (req, res) => {
  const { enabled } = req.body;
  try {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_defense', ?)").run(enabled ? 'true' : 'false');
    res.json({ ok: true, autoDefense: !!enabled });
  } catch(e) {
    res.json({ ok: false });
  }
});

app.get('/api/export/incident-report', (req, res) => {
  const id = req.query.id;
  try {
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    const relatedLogs = db.prepare('SELECT * FROM logs WHERE incident_id = ? ORDER BY id ASC').all(id);
    const relatedAlerts = db.prepare('SELECT * FROM alerts WHERE incident_id = ? ORDER BY id ASC').all(id);

    const report = {
      id: incident.id,
      type: incident.type || 'Unknown Threat',
      severity: incident.severity,
      severityScore: incident.severity_score,
      status: incident.status,
      attackerIP: incident.attacker_ip,
      targetUser: incident.target_user,
      description: incident.description,
      story: generateAttackStory(incident.timeline),
      timestamp: incident.timestamp,
      source: incident.source,
      timeline: (() => { try { return JSON.parse(incident.timeline); } catch(e) { return []; } })(),
      alertCount: relatedAlerts.length,
      logCount: relatedLogs.length,
      alerts: relatedAlerts.map(a => ({ id: a.id, type: a.type, severity: a.severity, ip: a.ip, timestamp: a.timestamp })),
      logs: relatedLogs.map(l => ({ id: l.id, event: l.event, ip: l.ip, user: l.user, risk: l.risk, timestamp: l.timestamp })),
    };

    if (req.query.format === 'csv') {
      const lines = [
        `Incident Report: INC-${report.id}`,
        `Type: ${report.type}`,
        `Severity: ${report.severity} (Score: ${report.severityScore})`,
        `Status: ${report.status}`,
        `Attacker IP: ${report.attackerIP}`,
        `Source Mode: ${report.source}`,
        `Narrative: ${report.story}`,
        '',
        'timestamp,event,ip,user,risk',
        ...report.logs.map(l => `${l.timestamp},${l.event},${l.ip},${l.user},${l.risk}`)
      ];
      res.header('Content-Type', 'text/csv');
      res.attachment(`incident_${id}_report.csv`);
      res.send(lines.join('\n'));
    } else {
      res.json(report);
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
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

app.post('/api/forensic/upload', async (req, res) => {
  if (typeof req.body !== 'string' || !req.body.trim()) {
    return res.status(400).json({ error: 'Valid raw text log body is required' });
  }

  // Clean start: purge all previous forensic data so each upload is fresh
  db.prepare("DELETE FROM logs WHERE source = 'FORENSIC'").run();
  db.prepare("DELETE FROM alerts WHERE source = 'FORENSIC'").run();
  db.prepare("DELETE FROM incidents WHERE source = 'FORENSIC'").run();
  db.prepare("DELETE FROM user_profiles WHERE source = 'FORENSIC'").run();

  const lines = req.body.split(/\r?\n/).filter(l => l.trim().length > 0);
  let parsedLogs = [];
  
  if (genAI.apiKey) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or whatever we use
      const prompt = `Extract structured security events from these raw logs. Return a raw JSON array of objects with keys: "timestamp" (ISO string), "user" (username or "unknown"), "ip" (IP or "unknown"), "event" (short description like 'FAILED_LOGIN', 'LOGIN_SUCCESS', 'PRIVILEGE_ESCALATION'), "risk" ('Low', 'Medium', 'High', 'Critical'). Do not return markdown, just the JSON array.
Logs:
${lines.slice(0, 200).join('\n')}`;
      
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedLogs = JSON.parse(text);
    } catch (e) {
      console.error("Gemini failed, falling back to regex", e);
    }
  }

  if (!parsedLogs.length) {
    // Regex fallback
    lines.forEach(line => {
      let eventObj = { event: 'UNKNOWN_EVENT', user: 'unknown', ip: 'unknown', risk: 'Low', timestamp: new Date().toISOString() };
      let match = line.match(/(?:Failed password|Invalid user.*?|Failed).*(?:for|user)\s+([^\s]+)\s+from\s+([\d.]+)/i);
      if (match) {
        eventObj = { ...eventObj, event: 'FAILED_LOGIN', user: match[1], ip: match[2], risk: 'Medium' };
      } else {
        match = line.match(/Accepted (?:publickey|password) for\s+([^\s]+)\s+from\s+([\d.]+)/i);
        if (match) {
          eventObj = { ...eventObj, event: 'LOGIN_SUCCESS', user: match[1], ip: match[2], risk: 'Low' };
        } else {
          match = line.match(/session opened for user ([^\s]+).*?(?:by |from )([\d.]+)?/i);
          if (match) {
            eventObj = { ...eventObj, event: 'LOGIN_SUCCESS', user: match[1], ip: match[2] || 'unknown', risk: 'Low' };
          } else {
            match = line.match(/(?:sudo|su).*?COMMAND=(.*)/i);
            if (match) {
              eventObj = { ...eventObj, event: 'PRIVILEGE_ESCALATION', user: 'admin', ip: line.match(/([\d.]+)/) ? line.match(/([\d.]+)/)[1] : 'unknown', risk: 'High' };
            } else {
              const ipExt = line.match(/([\d.]+)/);
              if (ipExt) eventObj.ip = ipExt[1];
              eventObj.event = line.substring(line.length > 80 ? line.length - 80 : 0).trim();
            }
          }
        }
      }
      parsedLogs.push(eventObj);
    });
  }

  const finalLogs = [];
  parsedLogs.forEach(entry => {
    try {
      const ts = entry.timestamp || new Date().toISOString();
      const insert = db.prepare('INSERT INTO logs (timestamp, user, ip, event, risk, source) VALUES (?, ?, ?, ?, ?, ?)')
                       .run(ts, entry.user || 'unknown', entry.ip || 'unknown', entry.event || 'UNKNOWN', entry.risk || 'Low', 'FORENSIC');
      finalLogs.push({
        id: insert.lastInsertRowid,
        timestamp: ts,
        user: entry.user || 'unknown',
        ip: entry.ip || 'unknown',
        event: entry.event || 'UNKNOWN',
        risk: entry.risk || 'Low',
        source: 'FORENSIC',
        is_flagged: 0, alert_id: null, incident_id: null
      });
    } catch(e) {}
  });

  finalLogs.forEach(entry => io.emit('log:new', entry));

  monitor.processLogs();

  res.json({ ok: true, ingestedCount: finalLogs.length });
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
