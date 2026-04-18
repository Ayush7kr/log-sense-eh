# Project Walkthrough: Log-Sense AI SOC

This guide provides a functional walkthrough of the Log-Sense platform's AI-enhanced security capabilities.

## 1. Defining Your Environment (Tri-Mode)
Log-Sense operates in three distinct modes, selectable from the header or login screen:
- **Simulation**: Safe sandbox for testing rules with synthetic attack injections.
- **AWS Live**: Production monitoring via SSH tunneling to remote EC2 instances.
- **Forensic**: Offline post-mortem analysis of uploaded log traces.

## 2. Intelligence Overview
Upon launching, the **Overview** dashboard provides elite visual intelligence:
- **Global Threat Map**: Live visualization of IP origins with risk-coded markers.
- **Threat Score**: A dynamic meter representing the current environmental risk level based on active alerts and blocked IPs.
- **AI Narrative Highlights**: Summaries of the latest critical events.

## 3. Real-Time Investigation & Time-Travel
Navigate to **Live Logs** to see the heartbeat of your system:
- **Contextual Explanations**: Hover over or view any log to see AI-generated risk context explaining *why* an event is suspicious.
- **Time-Travel Replay**: Click the rewind icon to scrub through historical log data and visualize attack progressions as they happened.
- **Pattern Clusters**: View the "Discovered Patterns" card to see anomalous frequency clusters identified by the engine.

## 4. Autonomous Defense
Under **Settings**, enable **Autonomous Defense**:
- Transition from passive monitoring to active protection.
- The system automatically blacklists IPs that exceed brute-force or port-scanning thresholds.
- Blacklisted IPs are visualized with a pulse on the map and tagged in the logs.

## 5. Incident Management & AI Narratives
When a threat escalates, it becomes an **Incident**:
- **Attack Story**: Gemini AI synthesizes the incident timeline into a human-readable narrative.
- **Forensic Timeline**: A detailed packet of related logs and alerts for deep-dive analysis.
- **Remediation**: Block the attacker's IP or resolve the incident with a single click.

## 6. Regulatory Reporting
Export your findings for compliance or archival:
- **Incident Reports**: Generate detailed CSV/JSON reports for specific investigations.
- **Raw Data Export**: Bulk export logs from any time-range for external SIEM integration.
