# Log-Sense: AI-Powered Security Log Analysis

Log-Sense is a modern, analyst-grade security platform designed for real-time log ingestion, advanced anomaly detection, and automated threat intelligence. It provides a comprehensive SOC (Security Operations Center) experience with interactive dashboards and rule-based incident detection.

## 🚀 Key Features

- **Real-time Log Ingestion**: Supports standard log patterns (SSH, Apache, Syslog) and local Windows Event Log ingestion via PowerShell.
- **Analyst-Grade Security Monitoring**: A stateful rule engine detects complex attack patterns:
  - **Brute Force**: Detects multiple failed login attempts within a time window.
  - **Suspicious Login Time**: Flagging logins during off-hours (2 AM - 5 AM).
  - **Privilege Escalation**: Detects successful admin access immediately following failed attempts.
- **AI-Driven Anomaly Detection**: Heuristic-based scoring to identify outliers in traffic density and risk distribution.
- **Interactive Dashboards**:
  - **Overview**: Real-time traffic timelines and event distribution charts.
  - **Threat Heatmap**: Visualize geographical threat origins (simulated).
  - **Anomaly View**: Monitor model health and anomaly scores over time.
- **Incident Management**: Workflow for investigating, blocking, and resolving security incidents with dedicated timelines.
- **Integrated Simulator**: Launch simulated attacks (Brute Force, Port Scans, Privilege Escalation) to validate monitoring logic.

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)

### Backend
- **Environment**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)
- **Database**: [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) (Fast, self-contained SQL engine)
- **AI Integration**: [Google Generative AI (Gemini)](https://ai.google.dev/) for log summarization and analysis.
- **Configuration**: [Dotenv](https://github.com/motdotla/dotenv) for environment variables.

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ayush7kr/log-sense-eh.git
   cd log-sense-eh
   ```

2. **Install dependencies**:
   Install for the root project and both components:
   ```bash
   npm run install:frontend
   npm run install:backend
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=4000
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. **Run the application**:
   From the root directory:
   ```bash
   npm run dev
   ```
   This will start the frontend (Vite) and backend concurrently.

## 📄 License
This project is licensed under the ISC License.
