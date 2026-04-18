# Usage Guide

This guide walkthroughs the primary workflows for interacting with the Log-Sense SOC platform.

## 🟢 Simulation Mode (Safe Testing)

**Ideal for:** Learning the platform and testing detection rules without live traffic.

1. **Login**: Select "Simulation Mode" on the login screen.
2. **Start Logs**: In the header/sidebar, ensure the system is "Live" (Click "Start" if stopped).
3. **Trigger Attacks**:
   - Go to the **Threat Intel** page.
   - Select an attack vector (e.g., "Launch Brute Force").
   - Watch the **Live Logs** table to see synthetic failed logins appear.
4. **Investigate**: Navigate to **Alerts** to see the rule engine catch the simulated attack.

---

## 🔴 AWS Live Mode (Real-World Monitoring)

**Ideal for:** Monitoring your actual cloud infrastructure.

1. **Prerequisite**: Ensure you have a `.pem` file and your EC2 instance allows SSH on port 22.
2. **Connect**:
   - Go to **Settings → AWS EC2 Connection**.
   - Input your IP, username, and absolute path to the `.pem` key.
   - Click **Save & Connect**.
3. **Monitor**: Navigate to **Live Logs**. The source badge will show `AWS`.
4. **Detect**: The system will automatically scan these live logs for real-world threats.

---

## 🟡 Forensic Mode (Offline Analysis)

**Ideal for:** Investigating data from a compromised system or past security incident.

1. **Switch**: Log out and select "Forensic Analysis Mode" or switch via the header badge.
2. **Upload**:
   - Navigate to the **Live Logs** page.
   - Use the **Upload Forensic Logs** bracket in the sidebar.
   - Select your `.log` or `.txt` file (e.g., a backup of `/var/log/auth.log`).
3. **Analyze**: The system will parse the file, apply security rules, and populate the dashboard as if the events were happening live.
4. **Report**: Check the **Incidents** page for a summary of detected suspicious patterns within the uploaded file.

---

## 🔍 Advanced Intelligence Features

### 1. AI-Powered Search
In the header search bar, you can use natural language or structured queries:
- **Natural**: "Show failed logins" or "High risk logs from 192.168.1.1"
- **Structured**: `user=root AND risk=High`

### 2. Time-Travel Replay
Located on the **Live Logs** page:
1. Click the **Rewind** icon in the table header.
2. Use the **Timeline Scrubber** to move backward/forward in time.
3. Observe how traffic patterns evolved during a specific window of interest.
4. Click **Exit Replay** to return to real-time streaming.

### 3. Active Geo-Intelligence
The **Overview** features a global map:
- **Blue Markers**: Low risk traffic.
- **Amber/Red Markers**: Higher risk events.
- **Pulse**: Real-time traffic pulses indicate active ingestion from that geography.

---

## 🛡️ Incident Resolution & Reporting

1. **Detection**: The system flags an event.
2. **Review**: Click **Investigate** on an Incident.
3. **AI Narrative**: Read the **Attack Story** to understand the adversary's progression.
4. **Remediation**:
   - Use **Block IP** to blacklist the attacker IP globally.
   - Use **Resolve** once the threat is neutralized.
5. **Reporting**: Click **Export Incident Report** (CSV/JSON/PDF) for archival or regulatory compliance.

---

## ⚙️ Configuration

- **Auto-Defense**: Toggle via `Settings → Security Control`. When ON, the system blocks IPs automatically.
- **AWS Setup**: Ensure absolute paths for `.pem` keys and verifiable IP addresses.
