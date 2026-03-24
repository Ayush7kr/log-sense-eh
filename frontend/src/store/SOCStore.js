import { create } from 'zustand'

export const useSOCStore = create((set) => ({
  logs: [],
  alerts: [],
  incidents: [],
  systemStatus: 'streaming', // 'streaming', 'paused', 'investigating'
  
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs].slice(0, 1000) })),
  
  setAlerts: (alerts) => set({ alerts }),
  updateAlertStatus: (id, status) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, status } : a)
  })),
  
  setIncidents: (incidents) => set({ incidents }),
  updateIncidentStatus: (id, status) => set((state) => ({
    incidents: state.incidents.map(i => i.id === id ? { ...i, status } : i)
  })),
  
  setSystemStatus: (status) => set({ systemStatus: status }),
}));
