/** Must match main.js / vault-manager PetalVault folder name. */
export const VAULT_FOLDER_NAME = 'PetalVault';

/** Primary database file inside the vault. */
export const VAULT_DATA_FILE = 'petal.json';

/**
 * macOS/iPadOS iCloud Drive path segment (user-visible "iCloud Drive/PetalVault").
 * On Mac Electron this resolves under ~/Library/Mobile Documents/com~apple~CloudDocs/
 */
export const ICLOUD_DRIVE_VAULT_HINT =
  'iCloud Drive/PetalVault';

export const PlatformKind = {
  ELECTRON: 'electron',
  IOS: 'ios',
  WEB: 'web',
};
