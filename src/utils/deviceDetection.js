// ═══════════════════════ DEVICE DETECTION UTILITIES ═══════════════════════
// Utilities for detecting device types and capabilities

/**
 * Detect if running on iOS device
 * @returns {boolean}
 */
export function isIOS() {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for iOS devices
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  
  // Also check for iPad on iOS 13+ (which reports as Mac)
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  
  return isIOSDevice || isIPadOS;
}

/**
 * Detect if running on mobile device (iOS or Android)
 * @returns {boolean}
 */
export function isMobile() {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
}

/**
 * Detect if running in Electron
 * @returns {boolean}
 */
export function isElectron() {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/**
 * Detect if running as PWA (standalone mode)
 * @returns {boolean}
 */
export function isPWA() {
  if (typeof window === 'undefined') return false;
  
  // Check if running in standalone mode (PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone ||
                       document.referrer.includes('android-app://');
  
  return isStandalone;
}

/**
 * Detect if device supports file system access
 * @returns {boolean}
 */
export function supportsFileSystem() {
  return isElectron() || (typeof window !== 'undefined' && 'showOpenFilePicker' in window);
}

/**
 * Get device capabilities object
 * @returns {Object}
 */
export function getDeviceCapabilities() {
  return {
    isIOS: isIOS(),
    isMobile: isMobile(),
    isElectron: isElectron(),
    isPWA: isPWA(),
    supportsFileSystem: supportsFileSystem(),
    supportsTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  };
}

// Make functions available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.isIOS = isIOS;
  window.isMobile = isMobile;
  window.isElectron = isElectron;
  window.isPWA = isPWA;
  window.getDeviceCapabilities = getDeviceCapabilities;
}
