import { PlatformKind } from './constants.js';
import { createBrowserPlatform } from './browserPlatform.js';
import { createElectronPlatform } from './electronPlatform.js';
import { createCapacitorPlatform } from './capacitorPlatform.js';

let cached = null;

function isCapacitorNative() {
  return (
    typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() === true
  );
}

/**
 * Resolve the active platform implementation (electron | ios | web).
 */
export async function getPetalPlatform() {
  if (cached) return cached;

  if (typeof window !== 'undefined' && window.electronAPI) {
    cached = createElectronPlatform(window.electronAPI);
    return cached;
  }

  if (isCapacitorNative()) {
    try {
      const { App } = await import('@capacitor/app');
      const { PetalVault } = await import('petal-vault');
      cached = createCapacitorPlatform(PetalVault, App);
      return cached;
    } catch (err) {
      console.error('Failed to load Capacitor PetalVault plugin:', err);
    }
  }

  cached = createBrowserPlatform();
  return cached;
}

/**
 * Install window.petalPlatform and keep electronAPI as an alias when vault-backed.
 */
export async function installPetalPlatform() {
  const platform = await getPetalPlatform();
  window.petalPlatform = platform;

  if (platform.hasVaultStorage?.()) {
    window.electronAPI = platform;
  }

  document.documentElement.dataset.petalPlatform = platform.kind;
  console.log('🌸 petalPlatform:', platform.kind, platform.platform);
  return platform;
}

export function getPlatformKind() {
  return cached?.kind ?? PlatformKind.WEB;
}
