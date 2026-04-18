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
- **Trigger**: Rapid sequential connection attempts to different ports.
- **Auto-Defense**: If 5+ scanning events occur from the same IP, the IP is automatically blacklisted.

### 4. User Profiling & Behavioral Analysis
- **Trigger**: Verification of login identity against the `user_profiles` knowledge base.
- **Anomalies**:
  - **New Login Location**: A successful login from an IP not previously associated with that user (Medium Severity).
  - **Impossible Travel**: (Future roadmap) Flagging concurrent logins from disparate geographic locations.

---

## 🚦 Severity & Risk Scoring

Log-Sense uses a weighted scoring engine to prioritize threats:

| Level | Severity Score | Risk Score | Example Event |
| :--- | :--- | :--- | :--- |
| **Critical** | 15 | 95 | Known Hostile IP / Multi-stage bypass |
| **High** | 10 | 85 | Privilege Escalation / Port Scan |
| **Medium** | 5 | 50 | Brute Force Attempt / New Location |
| **Low** | 1 | 10 | Standard Login / System Event |

---

## 🛡️ Autonomous Defense (Auto-Block)

The engine monitors a 2-minute sliding window. If an IP triggers:
- 5+ Failed Logins
- 5+ Port Scans
- Presence in the Global Blacklist

The system automatically inserts the IP into the `blocked_ips` table, immediately neutralizing the threat across the dashboard and generating a "Blocked IP Activity" critical alert.

---

## 🧹 Deduplication & Cleanup
- Alerts are deduplicated by IP and Type; subsequent events increment the risk and frequency of the existing alert rather than creating noise.
- Once resolved, the IP's slate is cleared for fresh monitoring.
