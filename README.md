# Log-Sense SOC Dashboard
A professional, real-time Security Operations Center (SOC) dashboard built with React, Vite, Node.js, and WebSocket streaming.

## 🚀 Features

- **Real-Time Log Ingestion**: Uses Socket.IO to stream logs instantly without polling.
- **AWS EC2 Integration**: Connect seamlessly to remote instances via SSH to tail `auth.log` and `syslog`.
- **Advanced Attack Simulation Engine**: Launch synthetic Brute Force, DDoS (SYN flood), and Port Scan attacks directly from the Threat Intel page.
- **AI-Powered Anomaly Detection**: Behavioral analysis using heuristic patterns to detect credential stuffing, privilege escalation, and reconnaissance activities from your live telemetry stream.
- **Natural Language "AI Search"**: Ask queries in plain English (e.g. "show failed logins from 10.0.0.7") to filter logs dynamically.
- **Comprehensive Incident Management**: Analyst-grade investigation interface mapping events to the MITRE ATT&CK framework with timeline forensics.
- **Dynamic Threat Heatmap**: Temporal analysis of security events to detect operational drift and off-hours activity.
- **Premium Glassmorphism UI**: Beautifully crafted dark mode interface with neon accents, optimized typography, and fully responsive fluid layouts (Light mode completely supported).

## 🧱 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Socket.IO Client.
- **Backend**: Node.js, Express, Socket.IO Server, Better-SQLite3, SSH2.

## ⚙️ Setup & Installation

**Prerequisites:** Node.js v18+

1. **Clone and Install dependencies:**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. **Start the applications:**
   ```bash
   # Terminal 1: Start Backend (Port 4000)
   cd backend
   npm run dev

   # Terminal 2: Start Frontend (Port 5173)
   cd frontend
   npm run dev
   ```

3. **Access the application:** Open `http://localhost:5173` in your browser. (The backend runs on `http://localhost:4000`).

## ☁️ AWS EC2 Integration Example

To ingest live logs from an AWS EC2 Amazon Linux / Ubuntu instance:

1. Navigate to the **Settings** page within the Log-Sense dashboard.
2. Under "AWS EC2 Connection", enter your public EC2 IP (e.g., `3.110.131.91`).
3. Enter your correct SSH username (usually `ec2-user` or `ubuntu`).
4. Provide the absolute filesystem path to your `.pem` SSH key (e.g., `C:\Users\YourName\.ssh\my-key.pem`).
5. Toggle "Enable SSH Connection" and click **Save & Connect**.
6. Navigate to the **Live Logs** page to observe raw telemetry streaming directly from your cloud instance. (You will see `WS` indicator light up green, and logs will populate).

## 🗃️ Application Architecture

- **Backend Simulator**: `backend/simulator.js` contains the synthetic generation logic. Attack simulation intensity settings can be tweaked directly from the Settings UI.
- **Rule Engine**: `backend/server.js` contains the `SecurityMonitor` class which actively scans incoming logs (both synthetic and AWS-sourced) for suspicious behavioral patterns.
- **Real-Time Synchronization**: `frontend/src/hooks/LogsContext.jsx` manages the singleton Socket.IO connection and distributes centralized states across all visualization pages.

## 🤝 Contributing
Contributions are welcome. Please ensure that PRs adhere to the established glassmorphism UI guidelines and avoid breaking the real-time websocket streams.
