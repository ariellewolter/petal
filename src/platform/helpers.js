/** Native API (Electron or Capacitor iOS). */
export function getNativeAPI() {
  if (typeof window === 'undefined') return null;
  return window.petalPlatform || window.electronAPI || null;
}

export function hasVaultStorage() {
  const api = getNativeAPI();
  if (!api) return false;
  if (typeof api.hasVaultStorage === 'function') return api.hasVaultStorage();
  return typeof api.loadState === 'function';
}

export function isIOSApp() {
  return (
    typeof window !== 'undefined' &&
    (window.petalPlatform?.kind === 'ios' ||
      window.petalPlatform?.platform === 'ios')
  );
}

export function isElectronApp() {
  return (
    typeof window !== 'undefined' &&
    (window.petalPlatform?.kind === 'electron' ||
      (!!window.electronAPI && !isIOSApp()))
  );
}
