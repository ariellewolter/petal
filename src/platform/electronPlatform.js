import { PlatformKind } from './constants.js';

/** Wrap existing preload electronAPI (desktop). */
export function createElectronPlatform(api) {
  if (!api) return null;

  return {
    ...api,
    kind: PlatformKind.ELECTRON,
    hasVaultStorage: () => typeof api.loadState === 'function',
  };
}
