const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'logs.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── Core tables ──────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    user TEXT NOT NULL,
    ip TEXT NOT NULL,
    event TEXT NOT NULL,
    risk TEXT NOT NULL,
    
    is_flagged INTEGER DEFAULT 0,
    alert_id INTEGER,
    incident_id INTEGER,
    source TEXT NOT NULL DEFAULT 'SIMULATION'
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_ids TEXT NOT NULL DEFAULT '[]',
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT '',
    risk_score INTEGER NOT NULL DEFAULT 0,
    severity TEXT NOT NULL DEFAULT 'Low',
    status TEXT DEFAULT 'new',
    description TEXT DEFAULT '',
    incident_id INTEGER,
    source TEXT NOT NULL DEFAULT 'SIMULATION'
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_ids TEXT NOT NULL DEFAULT '[]',
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    attacker_ip TEXT,
    target_user TEXT,
    timeline TEXT NOT NULL DEFAULT '[]',
    summary TEXT,
    source TEXT NOT NULL DEFAULT 'SIMULATION'
  );

  CREATE TABLE IF NOT EXISTS blocked_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ec2_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    host TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT 'ubuntu',
    key_path TEXT DEFAULT '',
    log_paths TEXT DEFAULT '/var/log/auth.log,/var/log/syslog',
    enabled INTEGER DEFAULT 0,
    updated_at TEXT
  );
`);

// ── Performance indexes ──────────────────────────────────────────────────────

try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip);
    CREATE INDEX IF NOT EXISTS idx_logs_risk ON logs(risk);
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp);
    CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip);
  `);
} catch {
  // indexes may already exist
}

// Migrations for existing DBs
try { db.exec("ALTER TABLE logs ADD COLUMN source TEXT NOT NULL DEFAULT 'SIMULATION';"); } catch(e) {}
try { db.exec("ALTER TABLE alerts ADD COLUMN source TEXT NOT NULL DEFAULT 'SIMULATION';"); } catch(e) {}
try { db.exec("ALTER TABLE incidents ADD COLUMN source TEXT NOT NULL DEFAULT 'SIMULATION';"); } catch(e) {}

// Seed default EC2 config if missing
try {
  const existing = db.prepare('SELECT id FROM ec2_config WHERE id = 1').get();
  if (!existing) {
    db.prepare(
      "INSERT INTO ec2_config (id, host, username, key_path, enabled) VALUES (1, '3.110.131.91', 'ubuntu', '', 0)"
    ).run();
  }
} catch {
  // ignore
}

module.exports = db;
