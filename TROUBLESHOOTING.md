# Troubleshooting Guide

Find solutions to common issues encountered when setting up or running the Log-Sense SOC platform.

## 🛜 Connection Issues

### ❌ Backend won't start (Port busy)
- **Error**: `Error: listen EADDRINUSE: address already in use :::4000`
- **Fix**: Another process is using port 4000. Use `npx kill-port 4000` or change `PORT` in `backend/server.js`.

### ❌ EC2 connection failed
- **Check 1**: Is your IP correct?
- **Check 2**: Is the SSH Username correct? (`ubuntu` for Ubuntu, `ec2-user` for Amazon Linux).
- **Check 3**: Is the `.pem` path absolute and correct? (e.g., `C:\Users\...\key.pem`).
- **Check 4**: Is AWS Port 22 open for your current local IP in the Security Group?

---

## 📊 Data & Logs

### ❌ Logs are not appearing in the table
1. Ensure the **Backend** is running.
2. Check the browser console (`F12`). If you see "WebSocket connection failed", ensure the backend port 4000 is accessible.
3. If in **AWS Mode**, verify that the target log file exists on the server (by default `/var/log/auth.log`).

### ❌ AI Search is not returning results
- Ensure you have logs matching the query in the currently active mode. AI search is mode-sensitive.

---

## 💻 UI/Frontend Issues

### ❌ White screen on load
- Ensure `npm install` was successful in the `frontend` folder.
- Restart the dev server: `npm run dev`.

### ❌ Changes to code not appearing
- The Vite dev server usually hot-reloads. If it fails, refresh the page or restart the frontend console.
- If it's a backend change (like a rule update), you **must** restart the backend process (`Ctrl + C` -> `npm run dev`).
