const db = require('./db');

// ── Simulation Config ────────────────────────────────────────────────────────

const users = ['admin', 'root', 'system', 'service_account', 'jdoe', 'deploy', 'www-data'];
const baseIps = ['192.168.1.5', '10.0.0.7', '45.22.11.9', '172.16.0.4', '10.0.0.12', '192.168.2.100'];
const events = [
  'Login Success',
  'Failed Login',
  'Port Scan',
  'Privilege Escalation',
  'File Access',
  'Network Connection',
  'Brute Force Attempt',
];

let demoModeEnabled = false;
let simulationEnabled = true;
let simulationIntervalId = null;
let attackIntensity = 'medium'; // 'low' | 'medium' | 'high'
let io = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function setIO(socketIO) { io = socketIO; }
function setDemoMode(enabled) { demoModeEnabled = !!enabled; }
function setAlertsEnabled(enabled) { /* Legacy hook, alerts driven by SecurityMonitor now */ }

function setIntensity(level) {
  attackIntensity = ['low', 'medium', 'high'].includes(level) ? level : 'medium';
  if (simulationEnabled) {
    stopSimulationLoop();
    startSimulationLoop();
  }
}

function getIntervalMs() {
  if (attackIntensity === 'high') return 300;
  if (attackIntensity === 'low') return 3000;
  return 1000;
}

function getRisk(event) {
  if (event === 'Failed Login') return 'Medium';
  if (['Privilege Escalation', 'Port Scan', 'Brute Force Attempt'].includes(event)) return 'High';
  return 'Low';
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomIP() { return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`; }

// ── Core log generation ──────────────────────────────────────────────────────

function emitLog(user, ip, event, risk) {
  const ts = new Date().toISOString();
  
  // Enforce blocked IPs
  let actualRisk = risk;
  try {
    const isBlocked = db.prepare('SELECT id FROM blocked_ips WHERE ip = ?').get(ip);
    if (isBlocked) {
      actualRisk = 'High';
    }
  } catch (e) {}

  const result = db.prepare('INSERT INTO logs (timestamp, user, ip, event, risk, source) VALUES (?, ?, ?, ?, ?, ?)')
                   .run(ts, user, ip, event, actualRisk, 'SIMULATION');
  
  const logEntry = { id: result.lastInsertRowid, timestamp: ts, user, ip, event, risk: actualRisk, source: 'SIMULATION', is_flagged: 0, alert_id: null, incident_id: null };
  if (io) io.emit('log:new', logEntry);
  return logEntry;
}

function generateRandomLog() {
  const baseEventPool = [...events];
  if (demoModeEnabled) {
    baseEventPool.push('Port Scan', 'Privilege Escalation', 'Port Scan', 'Privilege Escalation', 'Brute Force Attempt');
  }
  const event = pick(baseEventPool);
  return emitLog(pick(users), pick(baseIps), event, getRisk(event));
}

// ── Attack simulations ───────────────────────────────────────────────────────

function launchBruteForce() {
  const ip = `45.22.11.${Math.floor(Math.random() * 255)}`;
  const targetUser = pick(['root', 'admin', 'deploy']);
  
  // Blast 8 failed logins to trigger the rule
  for (let i = 0; i < 8; i++) {
    emitLog(targetUser, ip, 'Failed Login', 'High');
  }
  return { type: 'brute-force', ip, user: targetUser, logCount: 8 };
}

function launchDDoS() {
  const targetPort = pick([80, 443, 8080, 3000]);
  const attackerIps = [];

  for (let i = 0; i < 20; i++) {
    const ip = randomIP();
    attackerIps.push(ip);
    emitLog('system', ip, `Network Connection [SYN flood → port ${targetPort}]`, 'High');
  }
  return { type: 'ddos', targetPort, sourceCount: attackerIps.length, logCount: 20 };
}

function launchPortScan() {
  const ip = `103.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 3306, 5432, 6379, 8080, 8443];

  for (let i = 0; i < ports.length; i++) {
    emitLog('unknown', ip, `Port Scan [probe → port ${ports[i]}]`, 'High');
  }
  return { type: 'port-scan', ip, portsScanned: ports.length, logCount: ports.length };
}

// ── Simulation lifecycle ─────────────────────────────────────────────────────

function startSimulationLoop() {
  if (simulationIntervalId) return;
  simulationIntervalId = setInterval(generateRandomLog, getIntervalMs());
}

function stopSimulationLoop() {
  if (!simulationIntervalId) return;
  clearInterval(simulationIntervalId);
  simulationIntervalId = null;
}

function setSimulation(enabled) {
  simulationEnabled = !!enabled;
  if (simulationEnabled) startSimulationLoop();
  else stopSimulationLoop();
}

function startSimulator() {
  for (let i = 0; i < 15; i++) generateRandomLog();
  setSimulation(true);
}

module.exports = {
  startSimulator, setDemoMode, setAlertsEnabled, setSimulation, setIntensity, setIO,
  launchBruteForce, launchDDoS, launchPortScan, generateRandomLog,
};
