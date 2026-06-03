import { PlatformKind } from './constants.js';

/**
 * iOS (Capacitor) — vault-backed storage via native PetalVault plugin.
 * Sync: use the same iCloud Drive/PetalVault folder as Mac (pick in Settings on first run).
 */
export function createCapacitorPlatform(PetalVault, App) {
  const listeners = {
    'vault:resolved': [],
    'vault:needsChoice': [],
    'vault:externalModification': [],
    'vault:corruptionRecovered': [],
    'vault:relocated': [],
    'vault:needsRelocation': [],
    'storage:stateChanged': [],
    'vault:reloadState': [],
  };

  const register = (event, cb) => {
    if (typeof cb !== 'function') return;
    listeners[event].push(cb);
    PetalVault.addListener(event, (data) => cb(data)).catch(() => {});
  };

  const forward = (name) => (...args) => PetalVault[name](...args);

  const platform = {
    kind: PlatformKind.IOS,
    platform: 'ios',
    hasVaultStorage: () => true,

    loadState: () => PetalVault.loadState(),
    saveState: (state) => PetalVault.saveState({ state }),
    getDataPath: () => PetalVault.getDataPath(),
    getVaultPath: () => PetalVault.getVaultPath(),
    getVaultDetails: () => PetalVault.getVaultDetails(),
    checkVaultExists: () => PetalVault.checkVaultExists(),
    vaultGetStatus: () => PetalVault.vaultGetStatus(),
    vaultGetDiagnostics: () => PetalVault.vaultGetDiagnostics(),
    vaultDiscover: () => PetalVault.vaultDiscover(),
    vaultChoose: () => PetalVault.vaultChoose(),
    vaultEnsureResolved: () => PetalVault.vaultEnsureResolved(),
    vaultOpenFolder: (vaultPath) => PetalVault.vaultOpenFolder({ vaultPath }),
    vaultSetActive: (vaultPath) => PetalVault.vaultSetActive({ vaultPath }),
    vaultCreate: (vaultPath) => PetalVault.vaultCreate({ vaultPath }),

    listBackups: () => PetalVault.listBackups(),
    restoreFromBackup: (backupFilename) =>
      PetalVault.restoreFromBackup({ backupFilename }),

    readConflictFile: (filePath) => PetalVault.readConflictFile({ filePath }),
    resolveConflict: (action, filePath) =>
      PetalVault.resolveConflict({ action, filePath }),

    markStateDirty: () => PetalVault.markStateDirty(),
    supportReloadExternalChanges: () => PetalVault.supportReloadExternalChanges(),

    openFile: (filePath) => PetalVault.openFile({ filePath }),
    chooseFile: () => PetalVault.chooseFile(),
    pickFile: (options) => PetalVault.pickFile({ options }),
    resolveFilePath: (fileLink) => PetalVault.resolveFilePath({ fileLink }),
    normalizePath: (inputPath) => PetalVault.normalizePath({ inputPath }),
    getFileMetadata: (fileLink) => PetalVault.getFileMetadata({ fileLink }),

    getOneDriveRoot: async () => null,
    chooseOneDriveRoot: async () => null,

    setBackgroundColor: async () => undefined,
    debugPid: async () => ({ platform: 'ios' }),

    onVaultResolved: (cb) => register('vault:resolved', cb),
    onVaultNeedsChoice: (cb) => register('vault:needsChoice', cb),
    onVaultExternalModification: (cb) =>
      register('vault:externalModification', cb),
    onVaultCorruptionRecovered: (cb) =>
      register('vault:corruptionRecovered', cb),
    onVaultRelocated: (cb) => register('vault:relocated', cb),
    onVaultNeedsRelocation: (cb) => register('vault:needsRelocation', cb),
    onStorageStateChanged: (cb) => register('storage:stateChanged', cb),
    onVaultReloadState: (cb) => register('vault:reloadState', cb),

    supportCopyDiagnostics: forward('supportCopyDiagnostics'),
    supportOpenLogsFolder: forward('supportOpenLogsFolder'),
    supportOpenVaultFolder: forward('supportOpenVaultFolder'),
    supportExportCurrentState: forward('supportExportCurrentState'),
    supportExportBundle: forward('supportExportBundle'),
    vaultCopyFromFolder: forward('vaultCopyFromFolder'),
    copyVaultFromFolder: forward('vaultCopyFromFolder'),
    vaultGetDetails: forward('getVaultDetails'),
    vaultGetHealth: forward('vaultGetHealth'),
    vaultValidateIntegrity: forward('vaultValidateIntegrity'),
    vaultOptimize: forward('vaultOptimize'),
    vaultCleanupConflicts: forward('vaultCleanupConflicts'),
    exportData: forward('exportData'),
  };

  if (App?.addListener) {
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        PetalVault.checkExternalChanges?.().catch(() => {});
      }
    });
  }

  return platform;
}
