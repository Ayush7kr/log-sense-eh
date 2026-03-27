# Project Walkthrough: Log-Sense

This guide provides a walkthrough of the Log-Sense platform features and how to use them for security analysis.

## 1. SOC Dashboard (Overview)
Upon launching the application, you're greeted with the **Overview** page.
- **Total Logs**: Live count of ingested data.
- **Traffic Timeline**: Monitor real-time spikes in network activity.
- **Event Distribution**: See a breakdown of logins, network connections, and privilege events.

## 2. Ingesting Real-World Data
Log-Sense isn't just for simulation. You can ingest real data in two ways:
- **PC Logs**: Navigate to the "PC Logs" page to pull live Windows Event Logs (System and Application) directly from your machine using PowerShell.
- **Manual Upload**: Use the "Logs" page to paste raw log content (e.g., from `/var/log/auth.log` or Apache access logs) into the system.

## 3. Investigating Incidents
Active attacks detected by the `SecurityMonitor` appear in the **Incidents** page.
- Click an incident to open the **Investigation View**.
- View a correlated timeline of logs surrounding the event to see what the "attacker" did before and after the alert.
- Mark incidents as **Blocked** or **Resolved** to update the system state.

## 4. Anomaly Detection
The **Anomaly Detection** page visualizes the mathematical "health" of your log stream.
- **Anomaly Score**: A real-time calculated risk factor based on IP density and high-risk event frequency.
- **Model Health**: Indicators ranging from "Healthy" to "Degraded" based on high-risk traffic percentage.

## 5. Threat Simulation
For demonstration purposes, you can launch simulated attacks:
- Go to the **Security Simulation** settings or the **Alerts** page.
- Launch a "Brute Force" attack.
- Watch as the background simulator injects high-risk logs, which are then picked up by the `SecurityMonitor`, triggering real-time alerts and incidents in the UI.

## 6. AI Insights (Gemini)
The platform integrates **Google Gemini** to help security analysts.
- Use the **Threat Intel** or **Incident Details** pages to get AI-generated summaries of logs, helping you understand complex patterns without manual regex work.
