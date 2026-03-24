const db = require('./db');

const users = ['admin', 'system', 'service_account', 'jdoe'];
const ips = ['192.168.1.5', '10.0.0.7', '45.22.11.9', '172.16.0.4'];
const events = [
  'Login Success',
  'Failed Login',
  'Port Scan',
  'Privilege Escalation',
  'File Access',
  'Network Connection',
  'Brute Force Attempt',
];

// In‑memory simulator state, controlled via the /api/settings endpoint.
let demoModeEnabled = false;
let alertsEnabled = true;
let simulationEnabled = true;
let simulationIntervalId = null;

function setDemoMode(enabled) {
  demoModeEnabled = !!enabled;
}

function setAlertsEnabled(enabled) {
  alertsEnabled = !!enabled;
}

function getRisk(event) {
  if (event === 'Failed Login') return 'Medium';
  if (event === 'Privilege Escalation' || event === 'Port Scan' || event === 'Brute Force Attempt')
    return 'High';
  return 'Low';
}

function getRiskScore(risk) {
  if (risk === 'High') return 90;
  if (risk === 'Medium') return 60;
  return 20;
}

function generateRandomLog() {
  const now = new Date().toISOString();

  // When demo mode is enabled we bias the event pool towards high‑risk events.
  const baseEventPool = [...events];
  if (demoModeEnabled) {
    baseEventPool.push('Port Scan', 'Privilege Escalation', 'Port Scan', 'Privilege Escalation');
  }

  const event = baseEventPool[Math.floor(Math.random() * baseEventPool.length)];
  const user = users[Math.floor(Math.random() * users.length)];
  const ip = ips[Math.floor(Math.random() * ips.length)];
  const risk = getRisk(event);

  const insertLog = db.prepare(
    'INSERT INTO logs (timestamp, user, ip, event, risk) VALUES (?, ?, ?, ?, ?)'
  );
  insertLog.run(now, user, ip, event, risk);

  // Alerts are optional so the UI can turn off highlighting semantics.
  if (alertsEnabled && risk === 'High') {
    const insertAlert = db.prepare(
      'INSERT INTO alerts (timestamp, event, ip, risk_score) VALUES (?, ?, ?, ?)'
    );
    insertAlert.run(now, event, ip, getRiskScore(risk));
  }
}

function startSimulationLoop() {
  if (simulationIntervalId) return;
  simulationIntervalId = setInterval(generateRandomLog, 1000);
}

function stopSimulationLoop() {
  if (!simulationIntervalId) return;
  clearInterval(simulationIntervalId);
  simulationIntervalId = null;
}

function setSimulation(enabled) {
  simulationEnabled = !!enabled;
  if (simulationEnabled) {
    startSimulationLoop();
  } else {
    stopSimulationLoop();
  }
}

function startSimulator() {
  // Seed the database so the UI is not empty on initial load.
  for (let i = 0; i < 10; i += 1) {
    generateRandomLog();
  }
  // Default to simulation enabled until settings say otherwise.
  setSimulation(true);
}

module.exports = {
  startSimulator,
  setDemoMode,
  setAlertsEnabled,
  setSimulation,
};

