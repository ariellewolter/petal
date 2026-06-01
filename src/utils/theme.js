// ═══════════════════════ APPEARANCE / THEME ═══════════════════════
// Light, dark, and system (prefers-color-scheme) — persisted in settings.appearance.theme

export const THEME_STORAGE_KEY = 'petal-appearance-theme';

export const THEME_OPTIONS = [
  { id: 'light', label: 'Light', desc: 'Warm cream and dusty rose' },
  { id: 'dark', label: 'Dark', desc: 'Matches the Petal icon — magenta and violet glow' },
  { id: 'system', label: 'System', desc: 'Follow your device light/dark setting' }
];

/** Default for new installs; existing vaults without appearance keep light until changed */
export const DEFAULT_THEME_PREFERENCE = 'light';

export const THEME_BG = { light: '#faf8f5', dark: '#0f0c14' };

/**
 * @param {'light'|'dark'|'system'|string} preference
 * @returns {'light'|'dark'}
 */
export function getEffectiveTheme(preference) {
  const pref = preference || DEFAULT_THEME_PREFERENCE;
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Apply theme to document (data-theme on <html>, meta theme-color, localStorage cache for FOUC)
 * @param {'light'|'dark'|'system'|string} preference
 */
export function applyTheme(preference) {
  if (typeof document === 'undefined') return;
  const effective = getEffectiveTheme(preference);
  const root = document.documentElement;

  if (effective === 'dark') {
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.removeAttribute('data-theme');
    root.style.colorScheme = 'light';
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', effective === 'dark' ? THEME_BG.dark : '#c98b8b');
  }

  const winBg = effective === 'dark' ? THEME_BG.dark : THEME_BG.light;
  window.electronAPI?.setBackgroundColor?.(winBg);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference || DEFAULT_THEME_PREFERENCE);
  } catch (_) {
    // ignore private mode
  }

  window.dispatchEvent?.(
    new CustomEvent('petal:theme-changed', { detail: { preference, effective } })
  );
}

/**
 * Read theme preference from settings (or localStorage fallback before vault load)
 */
export function getThemePreference(settings) {
  return (
    settings?.appearance?.theme ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null) ||
    DEFAULT_THEME_PREFERENCE
  );
}

/**
 * Initialize theme from settings and listen for OS changes when preference is "system"
 */
export function initTheme(settings) {
  const pref = getThemePreference(settings);
  applyTheme(pref);

  if (typeof window === 'undefined' || window.__petalThemeMediaBound) return;
  window.__petalThemeMediaBound = true;

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = window.Petal?.store;
    const currentPref = getThemePreference(store?.getState()?.settings);
    if (currentPref === 'system') {
      applyTheme('system');
    }
  });
}

/**
 * Persist theme choice in store and apply immediately
 * @param {'light'|'dark'|'system'} theme
 */
export function setThemePreference(theme) {
  const store = window.Petal?.store;
  if (!store) {
    applyTheme(theme);
    return;
  }
  const state = store.getState();
  const settings = {
    ...(state.settings || {}),
    appearance: {
      ...(state.settings?.appearance || {}),
      theme
    }
  };
  store.setState({ settings });
  applyTheme(theme);
}

export function ensureAppearanceSettings() {
  const store = window.Petal?.store;
  if (!store) return;
  const state = store.getState();
  const settings = { ...(state.settings || {}) };
  if (!settings.appearance || typeof settings.appearance !== 'object') {
    settings.appearance = { theme: DEFAULT_THEME_PREFERENCE };
  } else if (!settings.appearance.theme) {
    settings.appearance.theme = DEFAULT_THEME_PREFERENCE;
  }
  if (JSON.stringify(state.settings) !== JSON.stringify(settings)) {
    store.setState({ settings });
  }
}

if (typeof window !== 'undefined') {
  window.Petal = window.Petal || {};
  window.Petal.utils = window.Petal.utils || {};
  window.Petal.utils.applyTheme = applyTheme;
  window.Petal.utils.initTheme = initTheme;
  window.Petal.utils.setThemePreference = setThemePreference;
  window.Petal.utils.getEffectiveTheme = getEffectiveTheme;
  window.Petal.utils.getThemePreference = getThemePreference;
}
