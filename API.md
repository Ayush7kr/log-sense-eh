# Backend API Documentation

The Log-Sense backend provides a RESTful API for log management, mode switching, and security monitoring. All endpoints are prefixed with `/api`.

## 📦 Logs & Data

### `GET /api/logs`
Fetch the most recent logs for the active mode.
- **Query Params**: `mode` (optional: `aws` | `forensic` | `sim`)
- **Returns**: `{ logs: [] }`

### `GET /api/dashboard`
Fetch aggregated KPI data (total logs, failed logins, high risk count, active IPs) for the active mode.

### `GET /api/logs/clusters`
Fetch discovered event patterns (IP-Event grouping) for spatial-temporal analysis.

### `GET /api/threat-score`
Fetch the dynamic mode-specific risk score (0-100) and threat categorization.

---

## 🛰️ Geo-Intelligence

### `GET /api/geo-data`
Fetch real-time geolocation mapping for all active traffic in the current mode.
- **Returns**: `{ geoData: [{ ip, country, city, lat, lon, risk }] }`

---

## 🛡️ Alerts & Incidents

### `GET /api/alerts`
Fetch active security alerts with AI-generated risk explanations.

### `GET /api/incidents`
Fetch current security incidents with AI-synthesized attack narratives.

### `GET /api/incidents/:id`
Fetch deep-dive incident packet including related logs and full forensic timeline.

---

## ⚙️ Configuration & Control

### `POST /api/settings/auto-defense`
Enable or disable the autonomous IP blocking engine.
- **Body**: `{ enabled: boolean }`

### `POST /api/block-ip`
Manually blacklist an IP address across specific modes.
- **Body**: `{ ip: string, mode: string }`

---

## 📥 Exports & Reports

### `GET /api/export`
Bulk export security data in CSV format.
- **Query Params**: `type` (`logs` | `alerts` | `incidents`), `mode`

### `GET /api/export/incident-report`
Generate a comprehensive, regulator-ready incident report.
- **Query Params**: `id` (Incident ID), `format` (`csv` | `json`)

---

## 🔍 Advanced Discovery

### `GET /api/search`
Perform a high-performance attribute-based search.
- **Example**: `/api/search?q=user=root AND risk=High`
- **Supported Fields**: `user`, `ip`, `event`, `risk`
