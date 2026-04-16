# Log-Sense SOC Dashboard

A professional, real-time Security Operations Center (SOC) dashboard built with React, Vite, Node.js, and WebSocket streaming.

---

## 🚀 Features

- **Real-Time Log Ingestion**: Uses Socket.IO to stream logs instantly without polling.
- **AWS EC2 Integration**: Connect seamlessly to remote instances via SSH to tail `auth.log` and `syslog`.
- **Advanced Attack Simulation Engine**: Launch synthetic Brute Force, DDoS (SYN flood), and Port Scan attacks directly from the Threat Intel page.
- **AI-Powered Anomaly Detection**: Behavioral analysis using heuristic patterns to detect credential stuffing, privilege escalation, and reconnaissance activities from your live telemetry stream.
- **Natural Language "AI Search"**: Ask queries in plain English (e.g. "show failed logins from 10.0.0.7") to filter logs dynamically.
- **Comprehensive Incident Management**: Analyst-grade investigation interface mapping events to the MITRE ATT&CK framework with timeline forensics.
- **Dynamic Threat Heatmap**: Temporal analysis of security events to detect operational drift and off-hours activity.
- **Forensic Analysis Mode**: Securely upload and process offline `.log` or `.txt` traces for deep-dive investigation.
- **Premium Glassmorphism UI**: Beautifully crafted dark mode interface with neon accents, optimized typography, and fully responsive fluid layouts.

---

## ⚙️ Setup & Installation Guide (Step-by-Step)

Follow these steps to run Log-Sense on your system.

### 🧰 Prerequisites

Make sure the following are installed:
- **Node.js (v18 or higher)**: [Download from nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js)

Verify installation:
```bash
node -v
npm -v
```

### 📦 Step 1: Get the Project

#### Option A: Clone using Git
```bash
git clone https://github.com/Ayush7kr/log-sense-eh.git
cd log-sense
```

#### Option B: Download ZIP
- Download project ZIP and extract it.
- Open the folder in your terminal.

### 📁 Step 2: Install Dependencies

#### 🔹 Backend Setup
```bash
cd backend
npm install
```

#### 🔹 Frontend Setup
```bash
cd ../frontend
npm install
```

### 🚀 Step 3: Start the Application

You need **two terminals** running simultaneously.

#### 🟢 Terminal 1 — Start Backend Server
```bash
cd backend
npm run dev
```
You should see: `Log-Sense Backend active on PORT 4000`

#### 🔵 Terminal 2 — Start Frontend
```bash
cd frontend
npm run dev
```
You should see: `Local: http://localhost:5173/`

### 🌐 Step 4: Open the Application

Open your browser and navigate to: [http://localhost:5173](http://localhost:5173)

---

## ☁️ AWS EC2 Integration (Live Logs)

To connect your system with a real AWS EC2 instance:

1. **Go to Settings**: Open `Settings → AWS EC2 Connection`.
2. **Enter Details**:
   - **EC2 Public IP**: e.g., `3.110.131.91`
   - **Username**: `ubuntu` (Ubuntu) or `ec2-user` (Amazon Linux).
   - **PEM Key Path**: Full filesystem path to your `.pem` file (e.g., `C:\Users\Name\your-key.pem`).
3. **Connect**: Toggle **Enable SSH Connection** and click **Save & Connect**.
4. **View Logs**: Navigate to **Live Logs** to see real-time streaming (🟢 WS indicator).

---

## 🗃️ Project Architecture

- **Backend Simulator**: `backend/simulator.js` — Generates synthetic attack logs.
- **Rule Engine (SecurityMonitor)**: `backend/server.js` — Detects suspicious activity using heuristic rules.
- **Real-Time Sync**: `frontend/src/hooks/LogsContext.jsx` — Manages centralized WebSocket state.

---

## ⚠️ Common Issues & Fixes

- **Logs not appearing**: Ensure backend is running and check browser console.
- **EC2 not connecting**: Verify `.pem` path, username, and ensure Port 22 is open in AWS.
- **Changes not reflecting**: Restart the backend (`Ctrl + C` then `npm run dev`).

---

## 🤝 Contributing

Contributions are welcome! Please follow the existing glassmorphism design and ensure logic remains consistent across Simulation, AWS, and Forensic modes.
