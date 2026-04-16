const { Client } = require('ssh2');
const fs = require('fs');

let io = null;
let sshClient = null;
let stream = null;

let currentConfig = {
  host: '',
  username: '',
  keyPath: '',
  logPaths: '/var/log/auth.log',
  enabled: false,
};

function setIO(socketIO) {
  io = socketIO;
}

function getConfig() {
  return currentConfig;
}

function updateConfig(config) {
  const newConfig = {
    host: config.host,
    username: config.username || 'ubuntu',
    keyPath: config.keyPath || config.key_path,
    logPaths: config.logPaths || '/var/log/auth.log',
    enabled: config.enabled,
  };

  const isConfigSame = currentConfig.host === newConfig.host &&
                       currentConfig.keyPath === newConfig.keyPath &&
                       currentConfig.enabled === newConfig.enabled;

  if (isConfigSame && sshClient && newConfig.enabled) {
    return; // Do NOT reconnect on every frontend refresh
  }

  currentConfig = newConfig;

  console.log('[EC2 CONFIG RECEIVED]', currentConfig);

  if (currentConfig.enabled) {
    connect();
  } else {
    disconnect();
  }
}

function isConnected() {
  return sshClient !== null;
}

function disconnect() {
  if (stream) {
    stream.close();
    stream = null;
  }
  if (sshClient) {
    sshClient.end();
    sshClient = null;
  }
  console.log('[EC2] Disconnected based on config change.');
  if (io) io.emit('ec2:status', { connected: false });
  try {
    const ts = new Date().toISOString();
    const result = require('./db').prepare('INSERT INTO logs (timestamp, user, ip, event, risk, source) VALUES (?, ?, ?, ?, ?, ?)').run(ts, 'SYSTEM', currentConfig.host || 'unknown', 'SYSTEM_EVENT: EC2 Disconnected', 'Low', 'AWS');
    if (io) io.emit('log:new', { id: result.lastInsertRowid, timestamp: ts, user: 'SYSTEM', ip: currentConfig.host || 'unknown', event: 'SYSTEM_EVENT: EC2 Disconnected', risk: 'Low', source: 'AWS', is_flagged: 0, alert_id: null, incident_id: null });
  } catch(e) {}
}

function connect() {
  if (sshClient) disconnect();
  
  console.log('[EC2] Attempting connection with:', currentConfig);

  if (!currentConfig.host || !currentConfig.keyPath) {
    console.error('[EC2] Missing config:', currentConfig);
    return;
  }

  try {
    const privateKey = fs.readFileSync(currentConfig.keyPath);
    sshClient = new Client();
    
    sshClient.on('ready', () => {
      console.log('[EC2] SSH Client Ready');
      if (io) io.emit('ec2:status', { connected: true });
      
      try {
        const ts = new Date().toISOString();
        const result = require('./db').prepare('INSERT INTO logs (timestamp, user, ip, event, risk, source) VALUES (?, ?, ?, ?, ?, ?)').run(ts, 'SYSTEM', currentConfig.host, 'SYSTEM_EVENT: EC2 Connected successfully', 'Low', 'AWS');
        if (io) io.emit('log:new', { id: result.lastInsertRowid, timestamp: ts, user: 'SYSTEM', ip: currentConfig.host, event: 'SYSTEM_EVENT: EC2 Connected successfully', risk: 'Low', source: 'AWS', is_flagged: 0, alert_id: null, incident_id: null });
      } catch(e) {}
      
      const cmd = `tail -f ${currentConfig.logPaths}`;
      sshClient.exec(cmd, (err, ioStream) => {
        if (err) {
          console.error('[EC2] Tail error:', err);
          return;
        }
        stream = ioStream;
        stream.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            const parsed = parseLine(line);
            if (parsed) {
              try {
                const db = require('./db');
                const ts = new Date().toISOString();
                let actualRisk = parsed.risk;
                
                const isBlocked = db.prepare('SELECT id FROM blocked_ips WHERE ip = ?').get(parsed.ip);
                if (isBlocked) actualRisk = 'High';
                
                const result = db.prepare('INSERT INTO logs (timestamp, user, ip, event, risk, source) VALUES (?, ?, ?, ?, ?, ?)')
                                 .run(ts, parsed.user, parsed.ip, parsed.event, actualRisk, 'AWS');
                                 
                if (io) {
                  io.emit('log:new', { 
                    id: result.lastInsertRowid, timestamp: ts, user: parsed.user, ip: parsed.ip, event: parsed.event, risk: actualRisk,
                    source: 'AWS', is_flagged: 0, alert_id: null, incident_id: null 
                  });
                }
              } catch (e) {
                console.error('[EC2] DB Insert Error:', e);
              }
            }
          });
        }).stderr.on('data', (data) => console.error('[EC2] STDERR: ' + data));
      });
    }).on('error', (err) => {
      console.error('[EC2] SSH Connection Error:', err.message);
      disconnect();
      if (io) io.emit('ec2:error', { message: err.message });
    }).connect({
      host: currentConfig.host,
      port: 22,
      username: currentConfig.username,
      privateKey,
      readyTimeout: 10000
    });
  } catch (err) {
    console.error('[EC2] Init Error:', err.message);
    if (io) io.emit('ec2:error', { message: err.message });
  }
}

// Map real logs to strict generic types for the rules engine
function parseLine(line) {
  if (!line.trim()) return null;

  // Pattern: "Failed password for root from 192.168.1.100"
  let match = line.match(/(Failed password) for (?:invalid user )?(\w+) from ([\d.]+)/);
  if (match) return { event: 'FAILED_LOGIN', user: match[2], ip: match[3], risk: 'Medium' };

  // Pattern: "Accepted password for jdoe from 10.0.0.5"
  match = line.match(/(Accepted password|Accepted publickey) for (\w+) from ([\d.]+)/);
  if (match) return { event: 'LOGIN_SUCCESS', user: match[2], ip: match[3], risk: 'Low' };

  // Pattern: "sudo:   jdoe : TTY=pts/1 ; PWD=/home/jdoe ; USER=root ; COMMAND=/bin/bash"
  match = line.match(/sudo:\s+(\w+)\s+:.*USER=(root|admin)/);
  if (match) return { event: 'PRIVILEGE_ESCALATION', user: match[1], ip: 'localhost', risk: 'High' };

  // Pattern: "Invalid user admin from 1.2.3.4"
  match = line.match(/Invalid user (\w+) from ([\d.]+)/);
  if (match) return { event: 'FAILED_LOGIN', user: match[1], ip: match[2], risk: 'Medium' };

  // Fallback: Generic SSH log parser
  const sshPattern = /sshd\[\d+\]:\s+(.*)/;
  match = line.match(sshPattern);
  const genericExtract = match ? match[1] : line;
  if (genericExtract.length > 5) {
    const fallbackIpMatch = genericExtract.match(/([\d.]+)/);
    const fallbackIp = fallbackIpMatch ? fallbackIpMatch[1] : 'unknown';
    return { event: genericExtract.substring(0, 100), user: 'unknown', ip: fallbackIp, risk: 'Low' };
  }

  return null;
}

module.exports = {
  setIO, updateConfig, getConfig, connect, disconnect, isConnected
};
