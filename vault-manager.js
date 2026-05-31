// ═══════════════════════ VAULT MANAGER ═══════════════════════
// Handles vault discovery, creation, validation, and configuration

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const VAULT_MANIFEST_NAME = '.vault_manifest.json';
const SCHEMA_VERSION = '1';
const APP_NAME = 'Petal';

class VaultManager {
  constructor(app) {
    this.app = app;
    this.configPath = this.getConfigPath();
    this.logPath = this.getLogPath();
    this.config = null;
    this.activeVaultPath = null;
    this.logger = null;
  }

  // Get Application Support config path
  getConfigPath() {
    const platform = process.platform;
    let configDir;
    
    if (platform === 'darwin') {
      configDir = path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
    } else if (platform === 'win32') {
      configDir = path.join(os.homedir(), 'AppData', 'Roaming', APP_NAME);
    } else {
      configDir = path.join(os.homedir(), '.config', APP_NAME);
    }
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    return path.join(configDir, 'config.json');
  }

  // Get log file path
  getLogPath() {
    const configDir = path.dirname(this.configPath);
    const logsDir = path.join(configDir, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return path.join(logsDir, `petal-${timestamp}.log`);
  }

  // Initialize logger
  initializeLogger() {
    const logStream = fs.createWriteStream(this.logPath, { flags: 'a' });
    
    this.logger = {
      log: (...args) => {
        const message = `[${new Date().toISOString()}] [LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
        try {
          logStream.write(message);
        } catch (e) {
          // Ignore log write errors
        }
        // Also log to console if available
        try {
          if (typeof console !== 'undefined' && console.log) {
            console.log(...args);
          }
        } catch (e) {
          // Ignore console errors
        }
      },
      error: (...args) => {
        const message = `[${new Date().toISOString()}] [ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
        try {
          logStream.write(message);
        } catch (e) {
          // Ignore log write errors
        }
        try {
          if (typeof console !== 'undefined' && console.error) {
            console.error(...args);
          }
        } catch (e) {
          // Ignore console errors
        }
      },
      warn: (...args) => {
        const message = `[${new Date().toISOString()}] [WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
        try {
          logStream.write(message);
        } catch (e) {
          // Ignore log write errors
        }
        try {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(...args);
          }
        } catch (e) {
          // Ignore console errors
        }
      }
    };
    
    this.logger.log('=== Petal Vault Manager Initialized ===');
    this.logger.log(`App version: ${this.app.getVersion()}`);
    this.logger.log(`Platform: ${process.platform}`);
    this.logger.log(`Config path: ${this.configPath}`);
    this.logger.log(`Log path: ${this.logPath}`);
  }

  // Load config from Application Support
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(configData);
        this.logger?.log('Config loaded from:', this.configPath);
        
        // If config has vault_path, validate it exists
        if (this.config.vault_path && !fs.existsSync(this.config.vault_path)) {
          this.logger?.warn(`Configured vault path doesn't exist: ${this.config.vault_path}`);
          // Don't clear it yet - let resolveVault() handle relocation
        }
        
        return this.config;
      }
    } catch (error) {
      this.logger?.error('Error loading config:', error);
    }
    
    // No config found - try to migrate from old preferences.json
    this.config = this.migrateFromOldPreferences();
    
    // If migration found a vault path, save it
    if (this.config.vault_path) {
      this.logger?.log('Migrated vault path from old preferences:', this.config.vault_path);
      this.saveConfig();
    } else {
      // Return default config
      this.config = {
        vault_path: null,
        sync_mode: 'cloud',
        last_seen_vault_id: null,
        last_sync_time: null,
        app_version: this.app.getVersion()
      };
      this.logger?.log('Using default config (no existing config found)');
    }
    
    return this.config;
  }

  // Migrate vault path from old preferences.json system
  migrateFromOldPreferences() {
    try {
      const userDataPath = this.app.getPath('userData');
      const prefsFile = path.join(userDataPath, 'preferences.json');
      
      if (fs.existsSync(prefsFile)) {
        const prefsData = fs.readFileSync(prefsFile, 'utf-8');
        const prefs = JSON.parse(prefsData);
        
        // Check if old preferences has a vault path
        if (prefs.vaultPath && fs.existsSync(prefs.vaultPath)) {
          // Check if it's a valid vault (has manifest)
          if (this.isVaultPath(prefs.vaultPath)) {
            const manifest = this.readVaultManifest(prefs.vaultPath);
            if (manifest) {
              this.logger?.log('Found vault in old preferences, migrating to new config');
              return {
                vault_path: prefs.vaultPath,
                sync_mode: 'cloud',
                last_seen_vault_id: manifest.vault_id,
                last_sync_time: null,
                app_version: this.app.getVersion()
              };
            }
          }
          
          // Check if it's an old-style vault (has petal.json but no manifest)
          const dataFile = path.join(prefs.vaultPath, 'petal.json');
          if (fs.existsSync(dataFile)) {
            this.logger?.log('Found old-style vault in preferences (has petal.json), creating manifest');
            try {
              const manifest = this.createVaultManifest(prefs.vaultPath);
              return {
                vault_path: prefs.vaultPath,
                sync_mode: 'cloud',
                last_seen_vault_id: manifest.vault_id,
                last_sync_time: null,
                app_version: this.app.getVersion()
              };
            } catch (error) {
              this.logger?.error('Failed to create manifest for old vault:', error);
            }
          }
        }
      }
    } catch (error) {
      this.logger?.warn('Error checking old preferences for migration:', error);
    }
    
    // No migration found
    return {
      vault_path: null,
      sync_mode: 'cloud',
      last_seen_vault_id: null,
      last_sync_time: null,
      app_version: this.app.getVersion()
    };
  }

  // Save config to Application Support
  saveConfig() {
    try {
      this.config.last_sync_time = new Date().toISOString();
      this.config.app_version = this.app.getVersion();
      
      // Atomic write: write to temp, then rename
      const tempPath = this.configPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(this.config, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.configPath);
      
      this.logger?.log('Config saved to:', this.configPath);
      return true;
    } catch (error) {
      this.logger?.error('Error saving config:', error);
      return false;
    }
  }

  // Check if a path contains a valid vault manifest
  isVaultPath(vaultPath) {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return false;
    }
    
    const manifestPath = path.join(vaultPath, VAULT_MANIFEST_NAME);
    return fs.existsSync(manifestPath);
  }

  // Read vault manifest
  readVaultManifest(vaultPath) {
    const manifestPath = path.join(vaultPath, VAULT_MANIFEST_NAME);
    
    try {
      if (fs.existsSync(manifestPath)) {
        const manifestData = fs.readFileSync(manifestPath, 'utf-8');
        return JSON.parse(manifestData);
      }
    } catch (error) {
      this.logger?.error('Error reading vault manifest:', error);
    }
    
    return null;
  }

  // Create vault manifest
  createVaultManifest(vaultPath) {
    const manifestPath = path.join(vaultPath, VAULT_MANIFEST_NAME);
    
    const manifest = {
      vault_id: uuidv4(),
      schema_version: SCHEMA_VERSION,
      created_at: new Date().toISOString(),
      app_name: APP_NAME,
      app_version: this.app.getVersion()
    };
    
    try {
      // Atomic write
      const tempPath = manifestPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(manifest, null, 2), 'utf-8');
      fs.renameSync(tempPath, manifestPath);
      
      this.logger?.log('Vault manifest created at:', manifestPath);
      return manifest;
    } catch (error) {
      this.logger?.error('Error creating vault manifest:', error);
      throw error;
    }
  }

  // Score vault by amount of user data in petal.json
  scoreVaultData(vaultPath) {
    const dataFile = path.join(vaultPath, 'petal.json');
    if (!fs.existsSync(dataFile)) return 0;
    try {
      const raw = fs.readFileSync(dataFile, 'utf-8').trim();
      if (!raw || raw === '{}') return 0;
      const data = JSON.parse(raw);
      const tasks = Array.isArray(data.tasks) ? data.tasks.length : 0;
      const projects = Array.isArray(data.projects) ? data.projects.length : 0;
      const files = Array.isArray(data.files) ? data.files.length : 0;
      const cellLogEntries = data.settings?.cellLog?.entries?.length || 0;
      if (tasks === 0 && projects === 0 && files === 0 && cellLogEntries === 0) return 0;
      return tasks + projects * 5 + files + cellLogEntries * 2;
    } catch {
      return 0;
    }
  }

  pickBestDiscoveredVault(discovered) {
    if (!discovered.length) return null;
    if (discovered.length === 1) return discovered[0];

    if (this.config.vault_path) {
      const preferred = discovered.find(
        (v) => path.resolve(v.path) === path.resolve(this.config.vault_path)
      );
      if (preferred) return preferred;
    }

    let best = discovered[0];
    let bestScore = this.scoreVaultData(best.path);
    for (const candidate of discovered.slice(1)) {
      const score = this.scoreVaultData(candidate.path);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return best;
  }

  // Search for existing vaults in common locations
  async discoverVaults() {
    const candidates = [];
    const platform = process.platform;
    
    // Common locations to search
    const searchPaths = [];
    
    if (platform === 'darwin') {
      // macOS - check multiple OneDrive locations
      const cloudStorageDir = path.join(os.homedir(), 'Library', 'CloudStorage');
      searchPaths.push(
        path.join(os.homedir(), 'Documents', 'PetalVault'),
        path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive - Personal', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive - Organization', 'PetalVault'),
        path.join(cloudStorageDir, 'OneDrive-Personal', 'PetalVault'),
        path.join(cloudStorageDir, 'OneDrive-Organization', 'PetalVault'),
        path.join(cloudStorageDir, 'OneDrivePersonal', 'PetalVault'),
        path.join(cloudStorageDir, 'OneDriveBusiness', 'PetalVault'),
        path.join(os.homedir(), 'Dropbox', 'PetalVault')
      );
      
      // Also check for any OneDrive-* folders in CloudStorage (for organization-specific OneDrive)
      if (fs.existsSync(cloudStorageDir)) {
        try {
          const entries = fs.readdirSync(cloudStorageDir);
          for (const entry of entries) {
            if (entry.startsWith('OneDrive-') || entry.startsWith('OneDrive')) {
              const oneDrivePath = path.join(cloudStorageDir, entry, 'PetalVault');
              if (!searchPaths.includes(oneDrivePath)) {
                searchPaths.push(oneDrivePath);
              }
            }
          }
        } catch (e) {
          this.logger?.warn('Error scanning CloudStorage directory:', e);
        }
      }
    } else if (platform === 'win32') {
      // Windows
      const oneDrive = process.env.ONEDRIVE || process.env.ONEDRIVECONSUMER;
      if (oneDrive) {
        searchPaths.push(path.join(oneDrive, 'PetalVault'));
      }
      searchPaths.push(
        path.join(os.homedir(), 'Documents', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive - Personal', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive - Organization', 'PetalVault')
      );
    } else {
      // Linux
      searchPaths.push(
        path.join(os.homedir(), 'Documents', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive', 'PetalVault'),
        path.join(os.homedir(), 'Dropbox', 'PetalVault')
      );
    }
    
    // Check each path
    for (const searchPath of searchPaths) {
      if (!fs.existsSync(searchPath)) {
        continue;
      }
      
      // Check if it's a valid vault (has manifest)
      if (this.isVaultPath(searchPath)) {
        const manifest = this.readVaultManifest(searchPath);
        if (manifest) {
          candidates.push({
            path: searchPath,
            manifest: manifest,
            discovered_at: new Date().toISOString()
          });
          continue;
        }
      }
      
      // Also check for old-style vaults (has petal.json but no manifest)
      // This handles migration from old system
      const dataFile = path.join(searchPath, 'petal.json');
      if (fs.existsSync(dataFile)) {
        this.logger?.log(`Found old-style vault at ${searchPath} (has petal.json but no manifest)`);
        // Create manifest for old vault
        try {
          const manifest = this.createVaultManifest(searchPath);
          candidates.push({
            path: searchPath,
            manifest: manifest,
            discovered_at: new Date().toISOString(),
            wasMigrated: true
          });
          this.logger?.log(`Created manifest for old vault at ${searchPath}`);
        } catch (error) {
          this.logger?.error(`Failed to create manifest for old vault at ${searchPath}:`, error);
        }
      }
    }
    
    this.logger?.log(`Discovered ${candidates.length} existing vault(s)`);
    return candidates;
  }

  // Resolve vault path (state machine: config → discovery → prompt)
  async resolveVault() {
    this.logger?.log('=== Starting Vault Resolution ===');
    
    // Step 1: Check config for existing vault path
    if (this.config.vault_path) {
      if (fs.existsSync(this.config.vault_path) && this.isVaultPath(this.config.vault_path)) {
        const manifest = this.readVaultManifest(this.config.vault_path);
        if (manifest) {
          // Validate schema version
          if (manifest.schema_version === SCHEMA_VERSION) {
            this.activeVaultPath = this.config.vault_path;
            this.config.last_seen_vault_id = manifest.vault_id;
            this.saveConfig();
            
            this.logger?.log(`✓ Using configured vault: ${this.activeVaultPath}`);
            this.logger?.log(`  Vault ID: ${manifest.vault_id}`);
            return {
              success: true,
              vaultPath: this.activeVaultPath,
              manifest: manifest,
              source: 'config'
            };
          } else {
            this.logger?.warn(`Schema version mismatch: expected ${SCHEMA_VERSION}, got ${manifest.schema_version}`);
          }
        }
      } else if (!fs.existsSync(this.config.vault_path)) {
        // Vault was moved - need to relocate
        this.logger?.warn(`Configured vault path does not exist: ${this.config.vault_path}`);
        this.logger?.log('Vault may have been moved - will attempt discovery and prompt if needed');
      }
    }
    
    // Step 2: Discover existing vaults (includes vault relocation support)
    const discovered = await this.discoverVaults();
    
    // If we had a configured vault but it's missing, check if discovered vaults match by ID
    if (this.config.vault_path && !fs.existsSync(this.config.vault_path) && this.config.last_seen_vault_id) {
      const matchingVault = discovered.find(v => v.manifest.vault_id === this.config.last_seen_vault_id);
      if (matchingVault) {
        // Found vault by ID - it was moved
        this.activeVaultPath = matchingVault.path;
        this.config.vault_path = matchingVault.path;
        this.config.last_seen_vault_id = matchingVault.manifest.vault_id;
        this.saveConfig();
        
        this.logger?.log(`✓ Vault relocated: ${this.activeVaultPath}`);
        this.logger?.log(`  Vault ID: ${matchingVault.manifest.vault_id}`);
        return {
          success: true,
          vaultPath: this.activeVaultPath,
          manifest: matchingVault.manifest,
          source: 'relocated',
          wasRelocated: true,
          oldPath: this.config.vault_path
        };
      }
    }
    
    if (discovered.length > 0) {
      const chosen = this.pickBestDiscoveredVault(discovered);
      this.activeVaultPath = chosen.path;
      this.config.vault_path = chosen.path;
      this.config.last_seen_vault_id = chosen.manifest.vault_id;
      this.saveConfig();
      
      this.logger?.log(`✓ Using discovered vault: ${this.activeVaultPath}`);
      this.logger?.log(`  Vault ID: ${chosen.manifest.vault_id}`);
      return {
        success: true,
        vaultPath: this.activeVaultPath,
        manifest: chosen.manifest,
        source: 'discovery',
        discovered: discovered
      };
    }
    
    // Step 3: No vault found - return null to prompt user
    this.logger?.log('No vault found - user will be prompted to create/choose one');
    return {
      success: false,
      needsUserChoice: true,
      vaultMoved: this.config.vault_path && !fs.existsSync(this.config.vault_path)
    };
  }

  // Create new vault at specified path
  async createVault(vaultPath) {
    try {
      // Ensure directory exists
      if (!fs.existsSync(vaultPath)) {
        fs.mkdirSync(vaultPath, { recursive: true });
      }
      
      // Create manifest
      const manifest = this.createVaultManifest(vaultPath);
      
      // Create subdirectories
      const exportsDir = path.join(vaultPath, 'exports');
      const attachmentsDir = path.join(vaultPath, 'attachments');
      [exportsDir, attachmentsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
      
      // CANARY WRITE TEST: Verify filesystem access immediately
      const canaryPath = path.join(vaultPath, '.petal_canary');
      const canaryContent = `Petal canary write test\nCreated: ${new Date().toISOString()}\nVault ID: ${manifest.vault_id}`;
      try {
        await fsPromises.writeFile(canaryPath, canaryContent, 'utf-8');
        const canaryFd = await fsPromises.open(canaryPath, 'r+');
        await canaryFd.sync();
        await canaryFd.close();
        const readBack = await fsPromises.readFile(canaryPath, 'utf-8');
        if (!readBack.includes(manifest.vault_id)) {
          throw new Error('Canary read-back validation failed');
        }
        const canaryStats = await fsPromises.stat(canaryPath);
        this.logger?.log(`✓ Canary write test passed`);
        this.logger?.log(`  Canary file: ${canaryPath}`);
        this.logger?.log(`  Size: ${canaryStats.size} bytes, Modified: ${canaryStats.mtime.toISOString()}`);
      } catch (canaryError) {
        this.logger?.error('✗ Canary write test FAILED:', canaryError);
        throw new Error(`Filesystem access test failed: ${canaryError.message}`);
      }
      
      // Update config
      this.activeVaultPath = vaultPath;
      this.config.vault_path = vaultPath;
      this.config.last_seen_vault_id = manifest.vault_id;
      this.saveConfig();
      
      this.logger?.log(`✓ Vault created at: ${vaultPath}`);
      this.logger?.log(`  Vault ID: ${manifest.vault_id}`);
      
      return {
        success: true,
        vaultPath: vaultPath,
        manifest: manifest
      };
    } catch (error) {
      this.logger?.error('Error creating vault:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Set active vault (when user chooses one)
  async setActiveVault(vaultPath) {
    if (!this.isVaultPath(vaultPath)) {
      throw new Error('Path does not contain a valid vault');
    }
    
    const manifest = this.readVaultManifest(vaultPath);
    if (!manifest) {
      throw new Error('Could not read vault manifest');
    }
    
    // Ensure vault directory structure exists (exports, attachments)
    const exportsDir = path.join(vaultPath, 'exports');
    const attachmentsDir = path.join(vaultPath, 'attachments');
    [exportsDir, attachmentsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          this.logger?.log(`✓ Created directory: ${dir}`);
        } catch (error) {
          this.logger?.error(`✗ Failed to create directory: ${dir}`, error);
          throw new Error(`Failed to create vault directory: ${dir}. Error: ${error.message}`);
        }
      }
    });
    
    // CANARY WRITE TEST: Verify filesystem access on activation
    const canaryPath = path.join(vaultPath, '.petal_canary');
    const canaryContent = `Petal canary write test\nActivated: ${new Date().toISOString()}\nVault ID: ${manifest.vault_id}`;
    try {
      await fsPromises.writeFile(canaryPath, canaryContent, 'utf-8');
      const canaryFd = await fsPromises.open(canaryPath, 'r+');
      await canaryFd.sync();
      await canaryFd.close();
      const readBack = await fsPromises.readFile(canaryPath, 'utf-8');
      if (!readBack.includes(manifest.vault_id)) {
        throw new Error('Canary read-back validation failed');
      }
      const canaryStats = await fsPromises.stat(canaryPath);
      this.logger?.log(`✓ Canary write test passed on activation`);
      this.logger?.log(`  Canary file: ${canaryPath}`);
      this.logger?.log(`  Size: ${canaryStats.size} bytes, Modified: ${canaryStats.mtime.toISOString()}`);
    } catch (canaryError) {
      this.logger?.error('✗ Canary write test FAILED on activation:', canaryError);
      throw new Error(`Filesystem access test failed: ${canaryError.message}`);
    }
    
    this.activeVaultPath = vaultPath;
    this.config.vault_path = vaultPath;
    this.config.last_seen_vault_id = manifest.vault_id;
    this.saveConfig();
    
    this.logger?.log(`✓ Active vault set to: ${vaultPath}`);
    return manifest;
  }

  // Get diagnostics information
  getDiagnostics() {
    const diagnostics = {
      app_version: this.app.getVersion(),
      platform: process.platform,
      config_path: this.configPath,
      log_path: this.logPath,
      config: {
        ...this.config,
        // Redact any sensitive info if needed
      },
      active_vault: {
        path: this.activeVaultPath,
        exists: this.activeVaultPath ? fs.existsSync(this.activeVaultPath) : false,
        is_valid: this.activeVaultPath ? this.isVaultPath(this.activeVaultPath) : false,
        manifest: this.activeVaultPath ? this.readVaultManifest(this.activeVaultPath) : null
      }
    };
    
    // Add file timestamps if vault exists
    if (this.activeVaultPath && fs.existsSync(this.activeVaultPath)) {
      const dataFile = path.join(this.activeVaultPath, 'petal.json');
      if (fs.existsSync(dataFile)) {
        try {
          const stats = fs.statSync(dataFile);
          diagnostics.active_vault.data_file = {
            path: dataFile,
            exists: true,
            size: stats.size,
            last_modified: stats.mtime.toISOString(),
            last_accessed: stats.atime.toISOString()
          };
        } catch (e) {
          diagnostics.active_vault.data_file = {
            path: dataFile,
            exists: false,
            error: e.message
          };
        }
      } else {
        diagnostics.active_vault.data_file = {
          path: dataFile,
          exists: false
        };
      }
    }
    
    return diagnostics;
  }

  // Get active vault path
  getActiveVaultPath() {
    return this.activeVaultPath;
  }
}

module.exports = VaultManager;
