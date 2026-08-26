import { contextBridge, ipcRenderer } from "electron";

// Exposes a minimal, safe surface to the renderer (the BizYangu OS web app)
// for desktop-only actions like triggering a file-level backup from the
// Settings page's "Desktop backup" button, if present.
contextBridge.exposeInMainWorld("biasharaDesktop", {
  isDesktop: true,
  backupDatabase: () => ipcRenderer.invoke("backup-database"),
  restoreDatabase: () => ipcRenderer.invoke("restore-database"),
});