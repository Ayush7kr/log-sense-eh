# Backend API Documentation

The Log-Sense backend provides a RESTful API for log management, mode switching, and security monitoring. All endpoints are prefixed with `/api`.

## 📦 Logs & Data

### `GET /api/logs`
Fetch the most recent logs for the active mode.
- **Query Params**: `mode` (optional: `aws` | `forensic` | `sim`)
- **Returns**: `{ logs: [] }`

### `GET /api/dashboard`
Fetch aggregated KPI data (total logs, failed logins, high risk count, active IPs).
- **Query Params**: `mode` (optional)
- **Returns**: Dashboard metric object.

### `GET /api/system-logs`
Fetch specifically flagged `SYSTEM_EVENT` logs (e.g., mode switches).

---

## 🛡️ Alerts & Incidents

### `GET /api/alerts`
Fetch active security alerts.
- **Query Params**: `mode`

### `POST /api/alerts/investigate`
Change an alert's status to `investigating`.
- **Body**: `{ alertId: number }`

### `GET /api/incidents`
Fetch current security incidents.

---

## ⚙️ Configuration & Control

### `POST /api/settings/mode`
Switch the operational mode globally.
- **Body**: `{ mode: 'aws' | 'sim' | 'forensic' }`

### `POST /api/simulator/launch-attack`
Trigger a synthetic attack pattern.
- **Body**: `{ type: 'brute-force' | 'ddos' | 'port-scan' }`

### `POST /api/forensic/upload`
Bulk upload raw log traces.
- **Headers**: `Content-Type: text/plain`
- **Body**: Raw log text content.

---

## ☁️ AWS Integration

### `GET /api/ec2/config`
Fetch stored EC2 connection details.

### `POST /api/ec2/config`
Update and attempt to establish an SSH connection.
- **Body**: `{ host: string, username: string, keyPath: string, enabled: boolean }`

---

## 🔍 Investigation & Search

### `POST /api/search`
Perform a filtered search on logs.
- **Body**: `{ query: string }`
- **Query Params**: `mode`

### `GET /api/anomalies`
Fetch rolling behavioral anomaly scores and detected patterns.
