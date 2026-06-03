import { PlatformKind } from './constants.js';

/** localStorage-only fallback (no cross-device vault sync). */
export function createBrowserPlatform() {
  const noop = async () => undefined;
  const noopSync = () => undefined;

  return {
    kind: PlatformKind.WEB,
    platform: 'web',
    hasVaultStorage: () => false,

    loadState: null,
    saveState: null,
    getVaultPath: async () => null,
    getDataPath: async () => null,
    vaultGetStatus: async () => ({ resolved: false }),
    vaultEnsureResolved: noop,
    vaultChoose: async () => ({ cancelled: true }),
    vaultDiscover: async () => ({ vaults: [] }),

    onVaultResolved: noopSync,
    onVaultNeedsChoice: noopSync,
    onVaultExternalModification: noopSync,
    onVaultCorruptionRecovered: noopSync,
    onVaultRelocated: noopSync,
    onVaultNeedsRelocation: noopSync,
    onStorageStateChanged: noopSync,
    onVaultReloadState: noopSync,

    openFile: null,
    chooseFile: null,
    pickFile: null,
    resolveFilePath: null,
    normalizePath: null,
    getFileMetadata: null,
    getOneDriveRoot: async () => null,
    chooseOneDriveRoot: noop,
    setBackgroundColor: noop,
  };
}
