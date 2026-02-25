// ═══════════════════════ ELECTRON PRELOAD SCRIPT ═══════════════════════
// Exposes safe APIs to the renderer process

// Step 3: Prove preload actually ran
console.log('🧩 PRELOAD LOADED', { pid: process.pid, time: new Date().toISOString() });

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
  
  // Recovery operations
  listBackups: () => ipcRenderer.invoke('storage:listBackups'),
  restoreFromBackup: (backupFilename) => ipcRenderer.invoke('storage:restoreFromBackup', backupFilename),
  
  // Conflict resolution
  readConflictFile: (filePath) => ipcRenderer.invoke('storage:readConflictFile', filePath),
  resolveConflict: (action, filePath) => ipcRenderer.invoke('storage:resolveConflict', action, filePath),
  
  // Vault operations (new system)
  vaultGetDiagnostics: () => ipcRenderer.invoke('vault:getDiagnostics'),
  vaultDiscover: () => ipcRenderer.invoke('vault:discover'),
  vaultCreate: (vaultPath) => ipcRenderer.invoke('vault:create', vaultPath),
  vaultChoose: () => ipcRenderer.invoke('vault:choose'),
  vaultSetActive: (vaultPath) => ipcRenderer.invoke('vault:setActive', vaultPath),
  vaultGetStatus: () => ipcRenderer.invoke('vault:getStatus'),
  vaultEnsureResolved: () => ipcRenderer.invoke('vault:ensureResolved'),
  vaultOpenFolder: (vaultPath) => ipcRenderer.invoke('vault:openFolder', vaultPath),
  
  // Vault improvements
  vaultGetHealth: () => ipcRenderer.invoke('vault:getHealth'),
  vaultValidateIntegrity: () => ipcRenderer.invoke('vault:validateIntegrity'),
  vaultOptimize: () => ipcRenderer.invoke('vault:optimize'),
  vaultCleanupConflicts: (maxAgeDays) => ipcRenderer.invoke('vault:cleanupConflicts', maxAgeDays),
  
  // Vault events
  onVaultResolved: (callback) => {
    ipcRenderer.on('vault:resolved', (event, data) => callback(data));
  },
  onVaultNeedsChoice: (callback) => {
    ipcRenderer.on('vault:needsChoice', (event, data) => callback(data));
  },
  onVaultExternalModification: (callback) => {
    ipcRenderer.on('vault:externalModification', (event, data) => callback(data));
  },
  onVaultCorruptionRecovered: (callback) => {
    ipcRenderer.on('vault:corruptionRecovered', (event, data) => callback(data));
  },
  onVaultRelocated: (callback) => {
    ipcRenderer.on('vault:relocated', (event, data) => callback(data));
  },
  onVaultNeedsRelocation: (callback) => {
    ipcRenderer.on('vault:needsRelocation', (event, data) => callback(data));
  },
  
  // Support bundle utilities
  supportCopyDiagnostics: () => ipcRenderer.invoke('support:copyDiagnostics'),
  supportOpenLogsFolder: () => ipcRenderer.invoke('support:openLogsFolder'),
  supportOpenVaultFolder: () => ipcRenderer.invoke('support:openVaultFolder'),
  supportReloadExternalChanges: () => ipcRenderer.invoke('support:reloadExternalChanges'),
  supportExportCurrentState: (exportPath) => ipcRenderer.invoke('support:exportCurrentState', exportPath),
  
  // Mark state as dirty (unsaved changes)
  markStateDirty: () => ipcRenderer.invoke('storage:markDirty'),
  
  // File operations
  openFile: (filePath) => {
    console.log('➡️ preload openFile invoke', filePath);
    return ipcRenderer.invoke('file:open', filePath);
  },
  chooseFile: () => ipcRenderer.invoke('file:chooseFile'),
  pickFile: (options) => ipcRenderer.invoke('file:pickFile', options),
  resolveFilePath: (fileLink) => ipcRenderer.invoke('file:resolvePath', fileLink),
  getFileMetadata: (fileLink) => ipcRenderer.invoke('file:getMetadata', fileLink),
  
  // OneDrive operations
  getOneDriveRoot: () => ipcRenderer.invoke('onedrive:getRoot'),
  chooseOneDriveRoot: () => ipcRenderer.invoke('onedrive:chooseRoot'),
  
  // Platform info
  platform: process.platform,
  
  // Step 3: Debug IPC - prove which main process we're talking to
  debugPid: () => ipcRenderer.invoke('debug:pid')
});
