# Security Rule Engine (SecurityMonitor)

The heart of Log-Sense is the `SecurityMonitor` (`backend/server.js`). It performs real-time heuristic analysis on every log entry ingested by the system.

## 🛠️ Detection Logic

The Rule Engine operates on a per-IP basis, tracking behavioral vectors over time.

### 1. Brute Force Detection
- **Trigger**: Multiple failed login attempts within a short window.
- **Threshold**: 3+ failed attempts from the same IP.
- **Alert**: Generates a "Brute Force Attempt" alert (Medium Severity).

### 2. Privilege Escalation (PrivEsc)
- **Trigger**: Success after multiple failures OR direct unauthorized `sudo`/`su` calls.
- **Rules**:
  - `FAILED_LOGIN` followed immediately by `LOGIN_SUCCESS` (Critical).
  - Explicit `PRIVILEGE_ESCALATION` log event (High Severity).

### 3. Network Reconnaissance (Port Scanning)
- **Trigger**: Rapid sequential connection attempts to different ports or unknown descriptors.
- **Threshold**: 8+ unique network events within 60 seconds.

---

## 🚦 Alert vs Incident Logic

- **Alerts**: Immediate reactions to specific rule matches. Alerts are deduplicated; if an IP is already under a "Brute Force" alert, new failed logins increase the count of that existing alert rather than creating noise.
- **Incidents**: Critical security events that require analyst investigation. Alerts are promoted to incidents if:
  - The severity is `High` or `Critical`.
  - Multiple different alerts trigger for the same attacker IP.

---

## 🧹 Deduplication & Cleanup
- The engine uses a rolling 2-minute window to correlate events.
- Once an alert or incident is marked as `RESOLVED` in the dashboard, the engine "forgets" that attacker, allowing for fresh detection if the threat persists.
