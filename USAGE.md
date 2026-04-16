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

## 🔍 General Dashboard Features

- **AI Search**: Use the search bar in the header to ask "Show high risk logs" or "Filter logs from IP 192...".
- **Anomaly Detection**: Check the **Anomalies** page to see if your traffic volume or risk density is trending abnormally.
- **Incident Resolution**: When an incident is confirmed, use the **Investigate** button to view its timeline, then **Resolve** or **Block IP** to mitigate.
