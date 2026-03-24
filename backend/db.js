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

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    user TEXT NOT NULL,
    ip TEXT NOT NULL,
    event TEXT NOT NULL,
    risk TEXT NOT NULL,
    incident_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    status TEXT DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Open',
    attacker_ip TEXT,
    target_user TEXT,
    summary TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Ensure alerts.status column exists for tracking Active / Investigating / Resolved.
try {
  const hasStatus = db
    .prepare("PRAGMA table_info('alerts')")
    .all()
    .some((col) => col.name === 'status');

  if (!hasStatus) {
    db.prepare("ALTER TABLE alerts ADD COLUMN status TEXT DEFAULT 'Active'").run();
  }

  const hasIncidentId = db
    .prepare("PRAGMA table_info('logs')")
    .all()
    .some((col) => col.name === 'incident_id');

  if (!hasIncidentId) {
    db.prepare("ALTER TABLE logs ADD COLUMN incident_id INTEGER").run();
  }
} catch (err) {
  // If the column already exists or ALTER is not supported, ignore;
  // the rest of the app will continue to function.
}

module.exports = db;

