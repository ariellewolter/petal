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

function adoptPreloadPlatform() {
  // Preload exposes read-only petalPlatform/electronAPI via contextBridge — use as-is.
  const api = window.petalPlatform || window.electronAPI;
  if (!api) return null;
  return api.kind ? api : createElectronPlatform(api);
}

/**
 * Resolve the active platform implementation (electron | ios | web).
 */
export async function getPetalPlatform() {
  if (cached) return cached;

  if (typeof window !== 'undefined') {
    const preload = adoptPreloadPlatform();
    if (preload) {
      cached = preload;
      return cached;
    }
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
 * In Electron, preload already exposed read-only globals — never overwrite them.
 */
export async function installPetalPlatform() {
  const platform = await getPetalPlatform();

  try {
    if (!window.petalPlatform) {
      window.petalPlatform = platform;
    }
    if (platform.hasVaultStorage?.() && !window.electronAPI) {
      window.electronAPI = platform;
    }
  } catch (err) {
    // contextBridge exposes read-only properties in Electron — safe to ignore
    if (!window.petalPlatform && !window.electronAPI) {
      throw err;
    }
  }

  document.documentElement.dataset.petalPlatform = platform.kind;
  console.log('🌸 petalPlatform:', platform.kind, platform.platform);
  return platform;
}

export function getPlatformKind() {
  return cached?.kind ?? PlatformKind.WEB;
}
