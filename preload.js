// ═══════════════════════ ELECTRON PRELOAD SCRIPT ═══════════════════════
// Exposes safe APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Storage operations
  loadState: () => ipcRenderer.invoke('storage:load'),
  saveState: (state) => ipcRenderer.invoke('storage:save', state),
  getDataPath: () => ipcRenderer.invoke('storage:getPath'),
  getVaultPath: () => ipcRenderer.invoke('storage:getVaultPath'),
  chooseVaultFolder: () => ipcRenderer.invoke('storage:chooseVaultFolder'),
  checkVaultExists: () => ipcRenderer.invoke('storage:checkVaultExists'),
  exportData: (data) => ipcRenderer.invoke('storage:export', data),
  
  // Conflict resolution
  readConflictFile: (filePath) => ipcRenderer.invoke('storage:readConflictFile', filePath),
  resolveConflict: (action, filePath) => ipcRenderer.invoke('storage:resolveConflict', action, filePath),
  
  // File operations
  openFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
  chooseFile: () => ipcRenderer.invoke('file:chooseFile'),
  resolveFilePath: (fileLink) => ipcRenderer.invoke('file:resolvePath', fileLink),
  getFileMetadata: (fileLink) => ipcRenderer.invoke('file:getMetadata', fileLink),
  
  // OneDrive operations
  getOneDriveRoot: () => ipcRenderer.invoke('onedrive:getRoot'),
  chooseOneDriveRoot: () => ipcRenderer.invoke('onedrive:chooseRoot'),
  
  // Platform info
  platform: process.platform
});
