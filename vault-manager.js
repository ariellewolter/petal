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
        return this.config;
      }
    } catch (error) {
      this.logger?.error('Error loading config:', error);
    }
    
    // Return default config
    this.config = {
      vault_path: null,
      sync_mode: 'cloud',
      last_seen_vault_id: null,
      last_sync_time: null,
      app_version: this.app.getVersion()
    };
    
    this.logger?.log('Using default config (no existing config found)');
    return this.config;
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

  // Search for existing vaults in common locations
  async discoverVaults() {
    const candidates = [];
    const platform = process.platform;
    
    // Common locations to search
    const searchPaths = [];
    
    if (platform === 'darwin') {
      // macOS
      searchPaths.push(
        path.join(os.homedir(), 'Documents', 'PetalVault'),
        path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive - Personal', 'PetalVault'),
        path.join(os.homedir(), 'OneDrive - Organization', 'PetalVault'),
        path.join(os.homedir(), 'Library', 'CloudStorage', 'OneDrive-Personal', 'PetalVault'),
        path.join(os.homedir(), 'Library', 'CloudStorage', 'OneDrive-Organization', 'PetalVault'),
        path.join(os.homedir(), 'Dropbox', 'PetalVault')
      );
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
      if (fs.existsSync(searchPath) && this.isVaultPath(searchPath)) {
        const manifest = this.readVaultManifest(searchPath);
        if (manifest) {
          candidates.push({
            path: searchPath,
            manifest: manifest,
            discovered_at: new Date().toISOString()
          });
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
    if (this.config.vault_path && fs.existsSync(this.config.vault_path)) {
      if (this.isVaultPath(this.config.vault_path)) {
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
      }
    }
    
    // Step 2: Discover existing vaults
    const discovered = await this.discoverVaults();
    
    if (discovered.length > 0) {
      // Use first discovered vault (or could prompt user)
      const chosen = discovered[0];
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
      needsUserChoice: true
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
        await fsPromises.fsync(await fsPromises.open(canaryPath, 'r+'));
        const readBack = await fsPromises.readFile(canaryPath, 'utf-8');
        if (readBack !== canaryContent) {
          throw new Error('Canary read-back mismatch');
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
