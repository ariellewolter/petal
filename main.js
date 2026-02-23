// ═══════════════════════ ELECTRON MAIN PROCESS ═══════════════════════
// SET UP ERROR HANDLING FIRST - before any other code runs
// This prevents EPIPE errors from crashing the app

// Step 1: Prove which main process we're running
console.log('🚀 MAIN BOOT', {
  pid: process.pid,
  mainFile: __filename,
  dir: __dirname,
  time: new Date().toISOString()
});

function isBrokenPipeError(error) {
  if (!error) return false;
  // Check multiple ways EPIPE might be represented
  return error.code === 'EPIPE' || 
         error.errno === 'EPIPE' || 
         String(error.code) === 'EPIPE' ||
         String(error.errno) === 'EPIPE' ||
         (error.message && error.message.includes('EPIPE')) ||
         (error.toString && error.toString().includes('EPIPE'));
}

// Console output is opt-in to avoid EPIPE crashes in detached GUI launches.
const ENABLE_CONSOLE_OUTPUT = process.env.PETAL_ENABLE_CONSOLE_OUTPUT === '1';
let stdioBroken = false;

function canWriteToStream(stream) {
  return ENABLE_CONSOLE_OUTPUT &&
    !stdioBroken &&
    !!stream &&
    stream.writable &&
    !stream.destroyed;
}

function guardProcessStreamWrites(stream) {
  if (!stream || typeof stream.write !== 'function') {
    return;
  }

  const originalWrite = stream.write.bind(stream);

  stream.write = function patchedWrite(chunk, encoding, callback) {
    const enc = typeof encoding === 'function' ? undefined : encoding;
    const cb = typeof encoding === 'function' ? encoding : callback;

    // In detached GUI launches, stdio may be a broken pipe. Drop writes entirely.
    if (!ENABLE_CONSOLE_OUTPUT) {
      if (typeof cb === 'function') cb();
      return true;
    }

    if (!stream.writable || stream.destroyed) {
      if (typeof cb === 'function') cb();
      return true;
    }

    try {
      return originalWrite(chunk, enc, (err) => {
        if (isBrokenPipeError(err)) {
          stdioBroken = true;
          if (typeof cb === 'function') cb();
          return;
        }
        if (typeof cb === 'function') cb(err);
      });
    } catch (err) {
      if (isBrokenPipeError(err)) {
        stdioBroken = true;
        if (typeof cb === 'function') cb();
        return true;
      }
      throw err;
    }
  };
}

// Set up uncaught exception handler IMMEDIATELY
// This must be set up before any code runs that might throw EPIPE errors
process.on('uncaughtException', (error) => {
  // Always check for EPIPE first - these are completely harmless
  if (isBrokenPipeError(error)) {
    return; // Silently ignore EPIPE errors - don't try to log them
  }
  // For other errors, we could log them, but that might cause another EPIPE
  // So we just silently ignore all uncaught exceptions to prevent cascading errors
  // The app will continue running
});

// Set up unhandled rejection handler to catch EPIPE in promises
process.on('unhandledRejection', (reason, promise) => {
  // Always check for EPIPE first - these are completely harmless
  if (isBrokenPipeError(reason)) {
    return; // Silently ignore EPIPE errors
  }
  // Avoid writing to stderr from rejection handlers when stdio is no longer available.
});

// Set up stream error handlers IMMEDIATELY
if (process.stdout && typeof process.stdout.on === 'function') {
  process.stdout.on('error', (err) => {
    if (isBrokenPipeError(err)) stdioBroken = true;
  }); // Ignore all errors
  process.stdout.on('close', () => { stdioBroken = true; }); // Ignore close events
  guardProcessStreamWrites(process.stdout);
}

if (process.stderr && typeof process.stderr.on === 'function') {
  process.stderr.on('error', (err) => {
    if (isBrokenPipeError(err)) stdioBroken = true;
  }); // Ignore all errors
  process.stderr.on('close', () => { stdioBroken = true; }); // Ignore close events
  guardProcessStreamWrites(process.stderr);
}

// Now require modules
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const os = require('os');
const VaultManager = require('./vault-manager');

// Store original console methods and override them IMMEDIATELY
// This must happen before any console.log calls in the codebase
const _realConsoleLog = console.log.bind(console);
const _realConsoleError = console.error.bind(console);
const _realConsoleWarn = console.warn.bind(console);

// Create ultra-safe wrapped versions that never throw
// These catch EPIPE errors that can occur even after stream checks
const originalConsoleLog = function(...args) {
  try {
    // Check stream state multiple times
    if (!canWriteToStream(process.stdout)) {
      return;
    }
    // Final check right before write
    if (!canWriteToStream(process.stdout)) {
      return;
    }
    // Wrap the actual call in another try-catch to catch EPIPE from Node's internal write
    try {
      _realConsoleLog(...args);
    } catch (writeError) {
      // If EPIPE or any write error occurs, mark stream as broken and silently ignore
      if (isBrokenPipeError(writeError)) {
        stdioBroken = true;
      }
      // Silently ignore all write errors
    }
  } catch (e) {
    // Completely ignore all errors - don't even check type
    if (isBrokenPipeError(e)) {
      stdioBroken = true;
    }
  }
};

const originalConsoleError = function(...args) {
  try {
    // Check stream state multiple times
    if (!canWriteToStream(process.stderr)) {
      return;
    }
    // Final check right before write
    if (!canWriteToStream(process.stderr)) {
      return;
    }
    // Wrap the actual call in another try-catch to catch EPIPE from Node's internal write
    try {
      _realConsoleError(...args);
    } catch (writeError) {
      // If EPIPE or any write error occurs, mark stream as broken and silently ignore
      if (isBrokenPipeError(writeError)) {
        stdioBroken = true;
      }
      // Silently ignore all write errors
    }
  } catch (e) {
    // Completely ignore all errors - don't even check type
    if (isBrokenPipeError(e)) {
      stdioBroken = true;
    }
  }
};

const originalConsoleWarn = function(...args) {
  try {
    // Check stream state multiple times
    if (!canWriteToStream(process.stderr)) {
      return;
    }
    // Final check right before write
    if (!canWriteToStream(process.stderr)) {
      return;
    }
    // Wrap the actual call in another try-catch to catch EPIPE from Node's internal write
    try {
      _realConsoleWarn(...args);
    } catch (writeError) {
      // If EPIPE or any write error occurs, mark stream as broken and silently ignore
      if (isBrokenPipeError(writeError)) {
        stdioBroken = true;
      }
      // Silently ignore all write errors
    }
  } catch (e) {
    // Completely ignore all errors - don't even check type
    if (isBrokenPipeError(e)) {
      stdioBroken = true;
    }
  }
};

// Safe logging functions that handle EPIPE errors gracefully
// These functions will never throw, even if stdout/stderr is closed
function safeLog(...args) {
  try {
    // Only log if stdout is available and writable
    if (canWriteToStream(process.stdout)) {
      // Use original console.log directly to avoid circular calls
      originalConsoleLog(...args);
    }
  } catch (error) {
    // Silently ignore EPIPE and other write errors - they're harmless
    // when stdout/stderr is closed (common in Electron apps when terminal closes)
    // Don't try to log the error itself - that could cause another EPIPE
  }
}

function safeError(...args) {
  try {
    // Only log if stderr is available and writable
    if (canWriteToStream(process.stderr)) {
      // Use original console.error directly to avoid circular calls
      originalConsoleError(...args);
    }
  } catch (error) {
    // Silently ignore all errors - don't try to log them as that could cause another EPIPE
  }
}

function safeWarn(...args) {
  try {
    // Only log if stderr is available and writable
    if (canWriteToStream(process.stderr)) {
      // Use original console.warn directly to avoid circular calls
      originalConsoleWarn(...args);
    }
  } catch (error) {
    // Silently ignore all errors - don't try to log them as that could cause another EPIPE
  }
}

// Override global console methods to use safe versions
// This ensures ALL console.log/error/warn calls are protected, even from third-party code
console.log = function(...args) {
  try {
    // Double-check stream state before and during write
    if (canWriteToStream(process.stdout)) {
      // Check again right before writing (stream state can change)
      if (canWriteToStream(process.stdout)) {
        originalConsoleLog(...args);
      }
    }
  } catch (error) {
    // Silently ignore ALL errors - EPIPE and any other write errors
    // Don't check error type as that could also throw
  }
};

console.error = function(...args) {
  try {
    // Double-check stream state before and during write
    if (canWriteToStream(process.stderr)) {
      // Check again right before writing (stream state can change)
      if (canWriteToStream(process.stderr)) {
        originalConsoleError(...args);
      }
    }
  } catch (error) {
    // Silently ignore ALL errors - EPIPE and any other write errors
    // Don't check error type as that could also throw
  }
};

console.warn = function(...args) {
  try {
    // Double-check stream state before and during write
    if (canWriteToStream(process.stderr)) {
      // Check again right before writing (stream state can change)
      if (canWriteToStream(process.stderr)) {
        originalConsoleWarn(...args);
      }
    }
  } catch (error) {
    // Silently ignore ALL errors - EPIPE and any other write errors
    // Don't check error type as that could also throw
  }
};

// Note: Stream error handlers and uncaught exception handlers are already set up at the top of the file
// No need to set them up again here

let mainWindow;
let vaultManager;
let dataFileWatcher = null;
let dataFilePollInterval = null;
let lastKnownMtime = null;
let lastWriteTime = null;
let lastWriteMtime = null;
let hasUnsavedChanges = false;
const VAULT_FOLDER_NAME = 'PetalVault';
const DATA_FILE_NAME = 'petal.json';
const BACKUP_FILE_NAME = 'petal.json.bak';
const CURRENT_SCHEMA_VERSION = 1; // Must match migrations.js
const WATCH_IGNORE_WINDOW_MS = 2000; // Ignore watch events within 2s of our own write
const POLL_INTERVAL_MS = 10000; // Poll every 10 seconds as fallback (reduced frequency for better performance)

/**
 * Create timestamped backup before migration
 * Format: petal.backup.YYYYMMDD-HHMMSS.json
 */
async function createTimestampedBackup(vaultPath, dataFile) {
  if (!fs.existsSync(dataFile)) {
    return null;
  }
  
  try {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19) // YYYY-MM-DDTHH-MM-SS
      .replace('T', '-'); // YYYY-MM-DD-HH-MM-SS
    
    const backupPath = path.join(vaultPath, `petal.backup.${timestamp}.json`);
    await fsPromises.copyFile(dataFile, backupPath);
    
    // Sync backup to disk
    const backupFd = await fsPromises.open(backupPath, 'r+');
    await backupFd.sync();
    await backupFd.close();
    
    safeLog(`✅ Created timestamped backup: ${path.basename(backupPath)}`);
    return backupPath;
  } catch (error) {
    safeError('Error creating timestamped backup:', error);
    return null;
  }
}

// Get the default vault path (OneDrive on Windows, iCloud Drive on Mac)
function getDefaultVaultPath() {
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows: Use OneDrive
    const oneDrivePath = process.env.ONEDRIVE || process.env.ONEDRIVECONSUMER;
    if (oneDrivePath) {
      return path.join(oneDrivePath, VAULT_FOLDER_NAME);
    }
    // Fallback to Documents
    return path.join(os.homedir(), 'Documents', VAULT_FOLDER_NAME);
  } else if (platform === 'darwin') {
    // Mac: Use iCloud Drive
    const iCloudPath = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
    if (fs.existsSync(iCloudPath)) {
      return path.join(iCloudPath, VAULT_FOLDER_NAME);
    }
    // Fallback to Documents
    return path.join(os.homedir(), 'Documents', VAULT_FOLDER_NAME);
  } else {
    // Linux/other: Use Documents
    return path.join(os.homedir(), 'Documents', VAULT_FOLDER_NAME);
  }
}

// Get stored preferences
function getPreferences() {
  const userDataPath = app.getPath('userData');
  const prefsFile = path.join(userDataPath, 'preferences.json');
  
  try {
    if (fs.existsSync(prefsFile)) {
      return JSON.parse(fs.readFileSync(prefsFile, 'utf-8'));
    }
  } catch (e) {
    safeWarn('Error reading preferences:', e);
  }
  
  return {};
}

// Store preferences
function storePreferences(prefs) {
  const userDataPath = app.getPath('userData');
  const prefsFile = path.join(userDataPath, 'preferences.json');
  
  try {
    const existing = getPreferences();
    const merged = { ...existing, ...prefs };
    fs.writeFileSync(prefsFile, JSON.stringify(merged, null, 2));
    return true;
  } catch (e) {
    safeError('Error storing preferences:', e);
    return false;
  }
}

// Get stored vault path from user preferences
function getStoredVaultPath() {
  const prefs = getPreferences();
  if (prefs.vaultPath && fs.existsSync(prefs.vaultPath)) {
    return prefs.vaultPath;
  }
  return null;
}

// Store vault path preference
function storeVaultPath(vaultPath) {
  return storePreferences({ vaultPath });
}

// Detect OneDrive root automatically
function detectOneDriveRoot() {
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows: Check environment variables
    const oneDrive = process.env.ONEDRIVE;
    const oneDriveCommercial = process.env.ONEDRIVECOMMERCIAL;
    const oneDriveConsumer = process.env.ONEDRIVECONSUMER;
    
    // Prefer commercial, then consumer, then default
    if (oneDriveCommercial && fs.existsSync(oneDriveCommercial)) {
      return oneDriveCommercial;
    }
    if (oneDriveConsumer && fs.existsSync(oneDriveConsumer)) {
      return oneDriveConsumer;
    }
    if (oneDrive && fs.existsSync(oneDrive)) {
      return oneDrive;
    }
    
    // Fallback: Common OneDrive locations
    const commonPaths = [
      path.join(os.homedir(), 'OneDrive'),
      path.join(os.homedir(), 'OneDrive - Organization'),
      path.join(os.homedir(), 'OneDrive - Personal')
    ];
    
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  } else if (platform === 'darwin') {
    // macOS: Common OneDrive locations
    const commonPaths = [
      path.join(os.homedir(), 'OneDrive'),
      path.join(os.homedir(), 'OneDrive - Organization'),
      path.join(os.homedir(), 'OneDrive - Personal'),
      path.join(os.homedir(), 'Library', 'CloudStorage', 'OneDrive-Personal'),
      path.join(os.homedir(), 'Library', 'CloudStorage', 'OneDrive-Organization')
    ];
    
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }
  
  return null;
}

// Get OneDrive root (stored preference or detected)
function getOneDriveRoot() {
  const prefs = getPreferences();
  
  // Return stored preference if exists and valid
  if (prefs.onedriveRoot && fs.existsSync(prefs.onedriveRoot)) {
    return prefs.onedriveRoot;
  }
  
  // Try to detect
  const detected = detectOneDriveRoot();
  if (detected) {
    // Auto-save detected root
    storePreferences({ onedriveRoot: detected });
    return detected;
  }
  
  return null;
}

// Store OneDrive root preference
function storeOneDriveRoot(onedriveRoot) {
  return storePreferences({ onedriveRoot });
}

// Get the current vault path (uses VaultManager if available, otherwise fallback)
function getVaultPath() {
  if (vaultManager && vaultManager.getActiveVaultPath()) {
    return vaultManager.getActiveVaultPath();
  }
  
  // Fallback to old system
  const stored = getStoredVaultPath();
  if (stored) return stored;
  
  const defaultPath = getDefaultVaultPath();
  // Auto-create default vault if it doesn't exist
  if (!fs.existsSync(defaultPath)) {
    fs.mkdirSync(defaultPath, { recursive: true });
  }
  return defaultPath;
}

// Get full paths for vault files
function getVaultPaths() {
  const vaultPath = getVaultPath();
  return {
    vaultPath,
    dataFile: path.join(vaultPath, DATA_FILE_NAME),
    backupFile: path.join(vaultPath, BACKUP_FILE_NAME),
    tempFile: path.join(vaultPath, 'petal.tmp'),
    exportsDir: path.join(vaultPath, 'exports'),
    attachmentsDir: path.join(vaultPath, 'attachments')
  };
}

// Ensure vault structure exists
function ensureVaultStructure() {
  const paths = getVaultPaths();
  
  // Create directories with error handling
  [paths.vaultPath, paths.exportsDir, paths.attachmentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        safeLog(`✓ Created directory: ${dir}`);
      } catch (error) {
        safeError(`✗ Failed to create directory: ${dir}`, error);
        throw new Error(`Failed to create vault directory: ${dir}. Error: ${error.message}`);
      }
    }
  });
  
  // Verify vault path exists and is accessible
  if (!fs.existsSync(paths.vaultPath)) {
    throw new Error(`Vault path does not exist and could not be created: ${paths.vaultPath}`);
  }
  
  return paths;
}

// Detect OneDrive conflicted copy files
function detectOneDriveConflicts(vaultPath) {
  const files = fs.readdirSync(vaultPath);
  const mainFile = DATA_FILE_NAME;
  const conflictedCopies = files.filter(f => {
    // OneDrive creates files like "petal (User's PC conflicted copy 2024-01-15 123456).json"
    return f.includes('conflicted copy') && f.endsWith('.json');
  });
  
  return conflictedCopies.map(filename => {
    const filePath = path.join(vaultPath, filename);
    const stats = fs.statSync(filePath);
    return {
      filename,
      filePath,
      mtime: stats.mtime,
      size: stats.size
    };
  }).sort((a, b) => b.mtime - a.mtime); // Most recent first
}

// Read data file with conflict detection and corruption recovery
async function readDataFile() {
  const paths = ensureVaultStructure();
  
  // DEBUG: Log what vault we're reading from
  safeLog(`🔍 DEBUG: Reading from vault: ${paths.vaultPath}`);
  safeLog(`🔍 DEBUG: Data file path: ${paths.dataFile}`);
  safeLog(`🔍 DEBUG: Data file exists: ${fs.existsSync(paths.dataFile)}`);
  
  try {
    // Check for OneDrive conflicted copies
    const oneDriveConflicts = detectOneDriveConflicts(paths.vaultPath);
    
    // Check for app-generated conflict files
    const appConflictFiles = fs.readdirSync(paths.vaultPath)
      .filter(f => f.startsWith('petal.conflict-') && f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(paths.vaultPath, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          filePath,
          mtime: stats.mtime,
          size: stats.size,
          type: 'app-generated'
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
    
    // Combine all conflicts
    const allConflicts = [
      ...oneDriveConflicts.map(c => ({ ...c, type: 'onedrive' })),
      ...appConflictFiles
    ].sort((a, b) => b.mtime - a.mtime);
    
    // Read main data file with corruption recovery
    let mainData = null;
    let mainMtime = null;
    let recoveredFromBackup = false;
    
    if (fs.existsSync(paths.dataFile)) {
      const stats = await fsPromises.stat(paths.dataFile);
      mainMtime = stats.mtime;
      
      try {
        const data = await fsPromises.readFile(paths.dataFile, 'utf-8');
        mainData = JSON.parse(data);
        
        // Release-Safe: Check schema version and create backup if migration needed
        const loadedVersion = mainData.schemaVersion || 0; // 0 = legacy (no version)
        if (loadedVersion < CURRENT_SCHEMA_VERSION) {
          safeLog(`🔄 Schema version mismatch detected: ${loadedVersion} < ${CURRENT_SCHEMA_VERSION}`);
          safeLog(`   Creating timestamped backup before migration...`);
          const backupPath = await createTimestampedBackup(paths.vaultPath, paths.dataFile);
          if (backupPath) {
            safeLog(`   Backup created: ${path.basename(backupPath)}`);
          } else {
            safeWarn(`   ⚠️ Failed to create backup - migration will proceed anyway`);
          }
        }
        
        // DEBUG: Log what was loaded
        safeLog(`🔍 DEBUG: Loaded data from file:`);
        safeLog(`  Schema Version: ${loadedVersion} (current: ${CURRENT_SCHEMA_VERSION})`);
        safeLog(`  Tasks: ${mainData.tasks?.length || 0} (type: ${Array.isArray(mainData.tasks) ? 'array' : typeof mainData.tasks})`);
        safeLog(`  Projects: ${mainData.projects?.length || 0} (type: ${Array.isArray(mainData.projects) ? 'array' : typeof mainData.projects})`);
        safeLog(`  Events: ${mainData.events?.length || 0}`);
        safeLog(`  Open Projects: ${mainData.openProjects?.length || 0}`);
        safeLog(`  Files: ${mainData.files?.length || 0}`);
        safeLog(`  Settings keys: ${mainData.settings ? Object.keys(mainData.settings).join(', ') : 'none'}`);
        if (mainData.settings?.cellLog) {
          safeLog(`  CellLog entries: ${mainData.settings.cellLog.entries?.length || 0}`);
          safeLog(`  CellLog cellTypes: ${mainData.settings.cellLog.cellTypes?.length || 0}`);
          safeLog(`  CellLog mediaTypes: ${mainData.settings.cellLog.mediaTypes?.length || 0}`);
        }
        safeLog(`  Habits: ${mainData.habits?.length || 0}`);
        safeLog(`  Routines: ${mainData.routines?.length || 0}`);
        
        // SAFEGUARD: Validate vault path from settings backup
        if (mainData.settings?._vaultPath) {
          const storedVaultPath = mainData.settings._vaultPath;
          const currentVaultPath = getVaultPath();
          if (storedVaultPath !== currentVaultPath && fs.existsSync(storedVaultPath)) {
            safeWarn(`⚠️ Vault path mismatch detected:`);
            safeWarn(`   Stored in data file: ${storedVaultPath}`);
            safeWarn(`   Current vault path: ${currentVaultPath}`);
            safeWarn(`   This may indicate the vault was moved or config was reset`);
            // Don't change the vault path automatically - let VaultManager handle it
          } else if (storedVaultPath === currentVaultPath) {
            safeLog(`✓ Vault path validated: ${currentVaultPath}`);
          }
        }
        
        // CRITICAL: Verify data integrity - if file has data but arrays are empty, something is wrong
        if (mainData && typeof mainData === 'object') {
          const hasTasks = Array.isArray(mainData.tasks) && mainData.tasks.length > 0;
          const hasProjects = Array.isArray(mainData.projects) && mainData.projects.length > 0;
          if (!hasTasks && !hasProjects && Object.keys(mainData).length > 5) {
            safeWarn('⚠️ WARNING: Vault file exists but tasks and projects are empty - data may be corrupted');
          }
        }
      } catch (parseError) {
        // JSON parse failed - attempt recovery from backup
        safeError('❌ JSON parse error in petal.json:', parseError);
        safeLog('🔄 Attempting recovery from backup...');
        
        // Archive corrupted file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const corruptPath = path.join(paths.vaultPath, `petal.json.corrupt.${timestamp}`);
        try {
          await fsPromises.copyFile(paths.dataFile, corruptPath);
          safeLog(`  Archived corrupted file to: ${corruptPath}`);
        } catch (e) {
          safeWarn('  Could not archive corrupted file:', e);
        }
        
        // Try to load from backup
        if (fs.existsSync(paths.backupFile)) {
          try {
            const backupData = await fsPromises.readFile(paths.backupFile, 'utf-8');
            mainData = JSON.parse(backupData);
            recoveredFromBackup = true;
            
            // Restore backup to main file
            await fsPromises.copyFile(paths.backupFile, paths.dataFile);
            safeLog('✅ Recovered from backup and restored to petal.json');
            
            // Notify renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('vault:corruptionRecovered', {
                corruptFile: corruptPath,
                recoveredFrom: paths.backupFile
              });
            }
          } catch (backupError) {
            safeError('❌ Backup file also corrupted:', backupError);
            // Fall back to empty state
            mainData = { tasks: [], projects: [], openProjects: [], settings: {}, files: [], events: [], recurringRules: [], habits: [], routines: [] };
          }
        } else {
          safeWarn('⚠️ No backup file found - using empty state');
          mainData = { tasks: [], projects: [], openProjects: [], settings: {}, files: [], events: [], recurringRules: [], habits: [], routines: [] };
        }
      }
    } else {
      safeWarn(`⚠️ WARNING: Data file not found at ${paths.dataFile}`);
    }
    
    // Check if we have conflicts that are newer than main file
    const newerConflicts = allConflicts.filter(c => {
      return mainMtime ? c.mtime > mainMtime : true;
    });
    
    // Return data with conflict info and recovery status
    // Ensure all expected fields are present (preserve what's in mainData, add defaults for missing)
    const defaultData = {
      tasks: [],
      projects: [],
      openProjects: [],
      settings: {},
      files: [],
      events: [],
      recurringRules: [],
      habits: [],
      habitCheckins: {},
      routines: [],
      routineCheckins: {},
      workflow: {}
    };
    
    // CRITICAL: Preserve mainData exactly as read - don't let defaults overwrite existing data
    // Only merge defaults for fields that don't exist in mainData
    let dataToReturn;
    if (mainData && typeof mainData === 'object') {
      // Merge defaults only for missing fields, preserve all existing data
      dataToReturn = {
        ...defaultData,
        ...mainData,
        // Ensure nested objects are preserved, not replaced
        settings: mainData.settings ? { ...defaultData.settings, ...mainData.settings } : defaultData.settings,
        workflow: mainData.workflow ? { ...defaultData.workflow, ...mainData.workflow } : defaultData.workflow
      };
    } else {
      dataToReturn = defaultData;
    }
    
    // CRITICAL: Verify data integrity before returning
    const tasksCount = Array.isArray(dataToReturn.tasks) ? dataToReturn.tasks.length : 0;
    const projectsCount = Array.isArray(dataToReturn.projects) ? dataToReturn.projects.length : 0;
    if (mainData && tasksCount === 0 && projectsCount === 0) {
      // If we read data but it's empty, log a warning
      const mainDataKeys = Object.keys(mainData);
      if (mainDataKeys.length > 5) {
        safeWarn(`⚠️ WARNING: Vault file has ${mainDataKeys.length} keys but tasks and projects are empty - possible data corruption`);
      }
    }
    
    safeLog(`🔍 DEBUG: Returning data with fields: ${Object.keys(dataToReturn).join(', ')}`);
    safeLog(`🔍 DEBUG: Data counts - Tasks: ${tasksCount}, Projects: ${projectsCount}, Files: ${dataToReturn.files?.length || 0}`);
    
    return {
      data: dataToReturn,
      hasConflicts: allConflicts.length > 0,
      conflicts: allConflicts,
      newerConflicts: newerConflicts,
      mainFileMtime: mainMtime,
      recoveredFromBackup: recoveredFromBackup
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        data: { tasks: [], projects: [], openProjects: [], settings: {}, files: [], events: [], recurringRules: [], habits: [], routines: [] },
        hasConflicts: false,
        conflicts: [],
        newerConflicts: [],
        recoveredFromBackup: false
      };
    }
    throw error;
  }
}

// Write data file atomically with backup and fsync
async function writeDataFile(data) {
  const paths = ensureVaultStructure();
  
  try {
    const jsonData = JSON.stringify(data, null, 2);
    
    // 1. Create backup of existing file if it exists
    // Release-Safe: Always create backup before write (standard .bak file)
    if (fs.existsSync(paths.dataFile)) {
      await fsPromises.copyFile(paths.dataFile, paths.backupFile);
      // Sync backup to disk
      const backupFd = await fsPromises.open(paths.backupFile, 'r+');
      await backupFd.sync();
      await backupFd.close();
    }
    
    // 2. Write to temp file first (atomic write)
    // Ensure parent directory exists (defensive check)
    const tempDir = path.dirname(paths.tempFile);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFd = await fsPromises.open(paths.tempFile, 'w');
    await tempFd.writeFile(jsonData, 'utf-8');
    await tempFd.sync(); // Force write to disk
    await tempFd.close();
    
    // 3. Check for conflicts (file modified while we were writing)
    let conflictDetected = false;
    if (fs.existsSync(paths.dataFile)) {
      const existingStat = await fsPromises.stat(paths.dataFile);
      const tempStat = await fsPromises.stat(paths.tempFile);
      
      // If existing file was modified after temp file was created, it's a conflict
      // This means another process/device modified the file during our write
      if (existingStat.mtime.getTime() > tempStat.birthtime.getTime()) {
        conflictDetected = true;
      }
    }
    
    // 4. If conflict, save as conflict file instead
    if (conflictDetected) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const conflictFile = path.join(paths.vaultPath, `petal.conflict-${timestamp}.json`);
      await fsPromises.copyFile(paths.tempFile, conflictFile);
      await fsPromises.unlink(paths.tempFile);
      safeWarn('Conflict detected! Saved as:', conflictFile);
      return { success: false, conflict: true, conflictFile };
    }
    
    // 5. Atomic rename: temp → data file
    await fsPromises.rename(paths.tempFile, paths.dataFile);
    
    // 6. Final sync to ensure data is on disk
    const dataFd = await fsPromises.open(paths.dataFile, 'r+');
    await dataFd.sync();
    await dataFd.close();
    
    // Record write time and mtime for watcher write-lock
    // This prevents watcher from thinking our own writes are "external modifications"
    const now = Date.now();
    try {
      const stats = await fsPromises.stat(paths.dataFile);
      lastWriteTime = now;
      lastWriteMtime = stats.mtime.getTime();
      lastKnownMtime = lastWriteMtime;
    } catch (e) {
      // Ignore
      lastWriteTime = now;
      lastWriteMtime = null;
    }
    
    return { success: true };
  } catch (error) {
    // Clean up temp file on error
    const paths = getVaultPaths();
    try {
      if (fs.existsSync(paths.tempFile)) {
        await fsPromises.unlink(paths.tempFile);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    
    safeError('Error writing data file:', error);
    if (vaultManager && vaultManager.logger) {
      vaultManager.logger.error('Error writing data file:', error);
    }
    return { success: false, error: error.message };
  }
}

// Track last check time to avoid double-work between watcher and poller
let lastExternalCheckTime = 0;
const EXTERNAL_CHECK_COOLDOWN_MS = 2000; // Don't check again within 2s

// Check for external modification (used by both watcher and poller)
// COORDINATED: Avoids double-work when both watcher and poller trigger
function checkForExternalModification(dataFilePath) {
  if (!fs.existsSync(dataFilePath)) return;
  
  const now = Date.now();
  
  // COORDINATION: Skip if we checked recently (avoid double-work)
  if (now - lastExternalCheckTime < EXTERNAL_CHECK_COOLDOWN_MS) {
    return; // Recent check, skip this one
  }
  
  try {
    const stats = fs.statSync(dataFilePath);
    const currentMtime = stats.mtime.getTime();
    
    // Ignore if this is likely our own write (within ignore window)
    if (lastWriteTime && (now - lastWriteTime) < WATCH_IGNORE_WINDOW_MS) {
      if (lastWriteMtime && Math.abs(currentMtime - lastWriteMtime) < 1000) {
        // This matches our write - ignore it
        lastKnownMtime = currentMtime;
        lastExternalCheckTime = now;
        return;
      }
    }
    
    // Check if file was modified externally (mtime changed)
    if (lastKnownMtime && currentMtime > lastKnownMtime + 1000) {
      // File was modified externally (1 second buffer to avoid false positives)
      safeLog('⚠️ External modification detected on petal.json');
      safeLog(`  Previous mtime: ${new Date(lastKnownMtime).toISOString()}`);
      safeLog(`  Current mtime: ${new Date(currentMtime).toISOString()}`);
      
      // Notify renderer with conflict policy info
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('vault:externalModification', {
          filePath: dataFilePath,
          previousMtime: lastKnownMtime,
          currentMtime: currentMtime,
          hasUnsavedChanges: hasUnsavedChanges
        });
      }
      
      lastKnownMtime = currentMtime;
      lastExternalCheckTime = now; // Mark as checked
    } else if (currentMtime !== lastKnownMtime) {
      // Update mtime (could be our own write or legitimate change)
      lastKnownMtime = currentMtime;
      lastExternalCheckTime = now; // Mark as checked
    }
  } catch (e) {
    safeWarn('Error checking file modification:', e);
  }
}

// Start watching data file for external modifications
function startWatchingDataFile(vaultPath) {
  // Stop existing watcher and poller if any
  if (dataFileWatcher) {
    dataFileWatcher.close();
    dataFileWatcher = null;
  }
  if (dataFilePollInterval) {
    clearInterval(dataFilePollInterval);
    dataFilePollInterval = null;
  }
  
  if (!vaultPath) return;
  
  const dataFilePath = path.join(vaultPath, DATA_FILE_NAME);
  
  // Initialize last known mtime
  if (fs.existsSync(dataFilePath)) {
    try {
      const stats = fs.statSync(dataFilePath);
      lastKnownMtime = stats.mtime.getTime();
    } catch (e) {
      safeWarn('Could not get initial mtime for watcher:', e);
    }
  }
  
  // Watch the vault directory (more reliable than watching file directly)
  // Note: fs.watch is unreliable on macOS + network drives + cloud folders
  try {
    let watchDebounceTimeout = null;
    dataFileWatcher = fs.watch(vaultPath, { recursive: false }, async (eventType, filename) => {
      // Only react to changes to petal.json
      if (filename !== DATA_FILE_NAME) return;
      
      // Debounce: wait a bit to avoid multiple rapid events (optimized)
      if (watchDebounceTimeout) {
        clearTimeout(watchDebounceTimeout);
      }
      watchDebounceTimeout = setTimeout(() => {
        checkForExternalModification(dataFilePath);
        watchDebounceTimeout = null;
      }, 1000); // Increased debounce to reduce CPU usage
    });
    
    safeLog(`✓ Started watching data file: ${dataFilePath}`);
  } catch (e) {
    safeWarn('Could not start file watcher:', e);
  }
  
  // Polling fallback: Check mtime every few seconds
  // This catches cloud-sync changes that fs.watch misses
  dataFilePollInterval = setInterval(() => {
    checkForExternalModification(dataFilePath);
  }, POLL_INTERVAL_MS);
  
  safeLog(`✓ Started polling fallback (every ${POLL_INTERVAL_MS}ms)`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 600,
    minHeight: 500,
    backgroundColor: '#faf8f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon-512.png')
  });

  mainWindow.loadFile('tasklist (1).html');

  // Open DevTools to help debug initialization issues
  // Always open in development, or if PETAL_DEBUG env var is set
  if (process.env.NODE_ENV === 'development' || process.env.PETAL_DEBUG === '1') {
    mainWindow.webContents.openDevTools();
  }
  
  // Log when page is ready
  mainWindow.webContents.once('did-finish-load', () => {
    safeLog('✅ Window finished loading tasklist (1).html');
  });
  
  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 3) { // error
      safeError(`[Renderer Error] ${message} (${sourceId}:${line})`);
    }
  });

  mainWindow.on('closed', () => {
    if (dataFileWatcher) {
      dataFileWatcher.close();
      dataFileWatcher = null;
    }
    if (dataFilePollInterval) {
      clearInterval(dataFilePollInterval);
      dataFilePollInterval = null;
    }
    mainWindow = null;
  });
}

// Single instance lock: prevent multiple app instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running - focus it and quit
  app.quit();
} else {
  // Handle second instance launch
  app.on('second-instance', () => {
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Initialize vault system on app ready
app.whenReady().then(async () => {
  // Step 1: Initialize VaultManager and logger
  vaultManager = new VaultManager(app);
  vaultManager.initializeLogger();
  
  // Step 2: Load config
  vaultManager.loadConfig();
  
  // Step 3: Resolve vault (config → discovery → prompt)
  // Check for vault relocation (configured vault path doesn't exist)
  let vaultResolution = await vaultManager.resolveVault();
  
  // If vault path in config doesn't exist, try to find it
  if (vaultResolution.success && vaultResolution.vaultPath) {
    if (!fs.existsSync(vaultResolution.vaultPath)) {
      safeWarn(`⚠️ Configured vault path doesn't exist: ${vaultResolution.vaultPath}`);
      safeLog('🔍 Attempting to discover vault in new location...');
      
      // Try discovery
      const discovered = await vaultManager.discoverVaults();
      if (discovered.length > 0) {
        // Found vault in new location
        const foundVault = discovered[0];
        safeLog(`✓ Found vault at new location: ${foundVault.path}`);
        vaultResolution = {
          success: true,
          vaultPath: foundVault.path,
          manifest: foundVault.manifest,
          source: 'relocated-discovery',
          wasRelocated: true
        };
        vaultManager.setActiveVault(foundVault.path);
      } else {
        // Vault moved - will need user to select new location
        safeWarn('⚠️ Vault not found - will prompt user to select new location');
        vaultResolution = {
          success: false,
          needsUserChoice: true,
          wasRelocated: true,
          oldPath: vaultResolution.vaultPath
        };
      }
    }
  }
  
  if (!vaultResolution.success) {
    // No vault found - will need to prompt user
    vaultManager.logger?.log('No vault found - app will prompt user on first load');
  }
  
  // Step 4: Create window
  createWindow();
  
  // Step 5: Send vault status to renderer
  if (mainWindow && vaultResolution.success) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('vault:resolved', {
        vaultPath: vaultResolution.vaultPath,
        manifest: vaultResolution.manifest,
        source: vaultResolution.source,
        wasRelocated: vaultResolution.wasRelocated || false
      });
      
      // Start watching for external file modifications
      startWatchingDataFile(vaultResolution.vaultPath);
      
      // Notify if vault was relocated
      if (vaultResolution.wasRelocated) {
        mainWindow.webContents.send('vault:relocated', {
          oldPath: vaultResolution.oldPath,
          newPath: vaultResolution.vaultPath
        });
      }
    });
  } else if (mainWindow && vaultResolution.needsUserChoice) {
    mainWindow.webContents.once('did-finish-load', () => {
      if (vaultResolution.wasRelocated) {
        mainWindow.webContents.send('vault:needsRelocation', {
          oldPath: vaultResolution.oldPath,
          discovered: vaultResolution.discovered || []
        });
      } else {
        mainWindow.webContents.send('vault:needsChoice', {
          discovered: vaultResolution.discovered || []
        });
      }
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for file operations
ipcMain.handle('storage:load', async () => {
  try {
    // CRITICAL: Require vault to be resolved before loading
    if (!vaultManager || !vaultManager.getActiveVaultPath()) {
      safeWarn('⚠️ storage:load called but vault not resolved');
      return {
        ok: false,
        error: 'Vault not resolved',
        data: { tasks: [], projects: [], openProjects: [], settings: {} },
        hasConflicts: false,
        conflicts: [],
        newerConflicts: []
      };
    }
    
    const paths = getVaultPaths();
    const vaultPath = getVaultPath();
    safeLog(`📂 Loading from vault: ${vaultPath}`);
    safeLog(`  Data file: ${paths.dataFile}`);
    
    const result = await readDataFile();
    
    if (result.data) {
      safeLog(`  ✓ Loaded ${result.data.tasks?.length || 0} tasks, ${result.data.projects?.length || 0} projects`);
    }
    
    return { ...result, ok: true };
  } catch (error) {
    safeError('Error loading data:', error);
    return {
      ok: false,
      error: error.message,
      data: { tasks: [], projects: [], openProjects: [], settings: {} },
      hasConflicts: false,
      conflicts: [],
      newerConflicts: []
    };
  }
});

ipcMain.handle('storage:readConflictFile', async (event, conflictFilePath) => {
  try {
    const data = await fsPromises.readFile(conflictFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    safeError('Error reading conflict file:', error);
    throw error;
  }
});

ipcMain.handle('storage:resolveConflict', async (event, action, conflictFilePath) => {
  const paths = getVaultPaths();
  
  try {
    if (action === 'useMain') {
      // Keep main file, delete conflict
      if (fs.existsSync(conflictFilePath)) {
        await fsPromises.unlink(conflictFilePath);
      }
      return { success: true };
    } else if (action === 'useConflict') {
      // Replace main with conflict file
      const conflictData = await fsPromises.readFile(conflictFilePath, 'utf-8');
      await writeDataFile(JSON.parse(conflictData));
      await fsPromises.unlink(conflictFilePath);
      return { success: true };
    } else if (action === 'keepBoth') {
      // Rename conflict to app format and keep both
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const newPath = path.join(paths.vaultPath, `petal.conflict-${timestamp}.json`);
      await fsPromises.rename(conflictFilePath, newPath);
      return { success: true };
    }
    return { success: false, error: 'Unknown action' };
  } catch (error) {
    safeError('Error resolving conflict:', error);
    return { success: false, error: error.message };
  }
});

// Mark state as saved (update write time tracking and clear unsaved flag)
function markStateSaved(state) {
  try {
    const paths = getVaultPaths();
    const now = Date.now();
    
    try {
      if (fs.existsSync(paths.dataFile)) {
        const stats = fs.statSync(paths.dataFile);
        lastWriteTime = now;
        lastWriteMtime = stats.mtime.getTime();
        lastKnownMtime = lastWriteMtime;
      } else {
        lastWriteTime = now;
        lastWriteMtime = null;
      }
    } catch (e) {
      lastWriteTime = now;
      lastWriteMtime = null;
    }
    
    hasUnsavedChanges = false;
  } catch (error) {
    // Log but don't throw - this is a non-critical operation
    safeWarn('Error in markStateSaved:', error);
  }
}

ipcMain.handle('storage:save', async (event, state) => {
  try {
    // CRITICAL: Require vault to be resolved before saving
    if (!vaultManager || !vaultManager.getActiveVaultPath()) {
      safeWarn('⚠️ storage:save called but vault not resolved');
      return { ok: false, error: 'Vault not resolved' };
    }
    
    const vaultPath = getVaultPath();
    
    // Ensure vault directory exists before attempting to save
    try {
      ensureVaultStructure();
    } catch (structureError) {
      safeError('Failed to ensure vault structure:', structureError);
      return { ok: false, error: `Failed to create vault directory: ${structureError.message}` };
    }
    
    // SAFEGUARD: Store vault path in settings as backup
    // This ensures the vault location is remembered even if Electron config is lost
    if (!state.settings) {
      state.settings = {};
    }
    if (vaultPath) {
      state.settings._vaultPath = vaultPath; // Store as backup in data file
      safeLog(`🔒 Safeguard: Stored vault path in settings: ${vaultPath}`);
    }
    
    // CRITICAL: Prevent overwriting existing vault data with empty state
    const paths = getVaultPaths();
    const tasksCount = Array.isArray(state.tasks) ? state.tasks.length : 0;
    const projectsCount = Array.isArray(state.projects) ? state.projects.length : 0;
    
    if (tasksCount === 0 && projectsCount === 0 && fs.existsSync(paths.dataFile)) {
      // Check if vault file has existing data
      try {
        const existingData = JSON.parse(await fsPromises.readFile(paths.dataFile, 'utf-8'));
        const existingTasksCount = Array.isArray(existingData.tasks) ? existingData.tasks.length : 0;
        const existingProjectsCount = Array.isArray(existingData.projects) ? existingData.projects.length : 0;
        
        if (existingTasksCount > 0 || existingProjectsCount > 0) {
          safeError('❌ BLOCKED SAVE: Attempting to overwrite vault with empty state!', {
            vaultTasks: existingTasksCount,
            vaultProjects: existingProjectsCount,
            saveTasks: tasksCount,
            saveProjects: projectsCount
          });
          return { 
            ok: false, 
            error: `Cannot save empty state - vault contains ${existingTasksCount} tasks and ${existingProjectsCount} projects` 
          };
        }
      } catch (readError) {
        // If we can't read the file, allow the save (might be corrupted)
        safeWarn('⚠️ Could not read existing vault file to verify data:', readError);
      }
    }
    
    // Release-Safe: Log payload keys and files to verify IPC transmission
    safeLog('📝 main save payload keys:', Object.keys(state));
    safeLog('📝 main save files:', Array.isArray(state.files) ? state.files.length : (state.files !== undefined ? typeof state.files : 'undefined'));
    
    const result = await writeDataFile(state);
    if (result.success) {
      const paths = getVaultPaths();
      const stats = fs.existsSync(paths.dataFile) ? fs.statSync(paths.dataFile) : null;
      safeLog(`💾 Saved successfully to vault: ${vaultPath}`);
      safeLog(`  Data file: ${paths.dataFile}`);
      safeLog(`  Tasks: ${state.tasks?.length || 0}, Projects: ${state.projects?.length || 0}, Files: ${state.files?.length || 0}`);
      if (stats) {
        safeLog(`  File size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
      }
      
      // Mark state as saved (for conflict policy)
      // Check if function exists before calling (defensive programming)
      if (typeof markStateSaved === 'function') {
        try {
          markStateSaved(state);
        } catch (markError) {
          safeWarn('Warning: Could not mark state as saved:', markError);
          // Don't fail the save if marking fails
        }
      } else {
        safeWarn('Warning: markStateSaved function not available');
      }
      
      return { ok: true };
    } else {
      const errorMsg = result.error || 'Unknown error';
      safeError('✗ Save failed:', errorMsg);
      if (result.conflict) {
        safeWarn('  Conflict detected - file was modified externally');
      }
      return { ok: false, error: errorMsg, conflict: result.conflict };
    }
  } catch (error) {
    const errorMsg = error.message || String(error);
    safeError('Error saving data:', error);
    safeError('Error details:', errorMsg);
    if (error.stack) {
      safeError('Error stack:', error.stack);
    }
    // Provide user-friendly error message
    let userError = errorMsg;
    if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
      userError = `Vault directory does not exist: ${getVaultPath()}. Please check your vault location.`;
    }
    return { ok: false, error: userError };
  }
});

// Track unsaved changes (called from renderer when state changes)
ipcMain.handle('storage:markDirty', () => {
  hasUnsavedChanges = true;
  return { ok: true };
});

ipcMain.handle('storage:getPath', () => {
  const paths = getVaultPaths();
  return paths.dataFile;
});

ipcMain.handle('storage:getVaultPath', () => {
  return getVaultPath();
});

// Recovery: List available backup files
ipcMain.handle('storage:listBackups', async () => {
  try {
    const paths = getVaultPaths();
    const vaultPath = paths.vaultPath;
    
    if (!fs.existsSync(vaultPath)) {
      return { backups: [], error: 'Vault path does not exist' };
    }
    
    const files = fs.readdirSync(vaultPath);
    const backups = files
      .filter(f => f.startsWith('petal.backup.') && f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(vaultPath, filename);
        const stats = fs.statSync(filePath);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            filename,
            filePath,
            mtime: stats.mtime.toISOString(),
            size: stats.size,
            tasks: Array.isArray(data.tasks) ? data.tasks.length : 0,
            projects: Array.isArray(data.projects) ? data.projects.length : 0,
            files: Array.isArray(data.files) ? data.files.length : 0
          };
        } catch (e) {
          return {
            filename,
            filePath,
            mtime: stats.mtime.toISOString(),
            size: stats.size,
            tasks: 0,
            projects: 0,
            files: 0,
            error: 'Could not parse backup file'
          };
        }
      })
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime)); // Most recent first
    
    // Also check the standard backup file
    if (fs.existsSync(paths.backupFile)) {
      try {
        const stats = fs.statSync(paths.backupFile);
        const data = JSON.parse(fs.readFileSync(paths.backupFile, 'utf-8'));
        backups.unshift({
          filename: BACKUP_FILE_NAME,
          filePath: paths.backupFile,
          mtime: stats.mtime.toISOString(),
          size: stats.size,
          tasks: Array.isArray(data.tasks) ? data.tasks.length : 0,
          projects: Array.isArray(data.projects) ? data.projects.length : 0,
          files: Array.isArray(data.files) ? data.files.length : 0,
          isStandardBackup: true
        });
      } catch (e) {
        // Ignore if backup file is corrupted
      }
    }
    
    return { backups, vaultPath };
  } catch (error) {
    safeError('Error listing backups:', error);
    return { backups: [], error: error.message };
  }
});

// Recovery: Restore from a backup file
ipcMain.handle('storage:restoreFromBackup', async (event, backupFilename) => {
  try {
    const paths = getVaultPaths();
    const vaultPath = paths.vaultPath;
    
    let backupPath;
    if (backupFilename === BACKUP_FILE_NAME) {
      backupPath = paths.backupFile;
    } else {
      backupPath = path.join(vaultPath, backupFilename);
    }
    
    if (!fs.existsSync(backupPath)) {
      return { ok: false, error: `Backup file not found: ${backupFilename}` };
    }
    
    // Read backup data
    const backupData = await fsPromises.readFile(backupPath, 'utf-8');
    const data = JSON.parse(backupData);
    
    // Validate it has data
    const tasksCount = Array.isArray(data.tasks) ? data.tasks.length : 0;
    const projectsCount = Array.isArray(data.projects) ? data.projects.length : 0;
    
    if (tasksCount === 0 && projectsCount === 0) {
      return { ok: false, error: 'Backup file appears to be empty' };
    }
    
    // Create a backup of current file before restoring
    if (fs.existsSync(paths.dataFile)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
      const preRestoreBackup = path.join(vaultPath, `petal.pre-restore.${timestamp}.json`);
      await fsPromises.copyFile(paths.dataFile, preRestoreBackup);
      safeLog(`✅ Created pre-restore backup: ${path.basename(preRestoreBackup)}`);
    }
    
    // Restore the backup
    await fsPromises.copyFile(backupPath, paths.dataFile);
    
    // Sync to disk
    const fd = await fsPromises.open(paths.dataFile, 'r+');
    await fd.sync();
    await fd.close();
    
    safeLog(`✅ Restored from backup: ${backupFilename}`);
    safeLog(`   Tasks: ${tasksCount}, Projects: ${projectsCount}`);
    
    return { 
      ok: true, 
      tasks: tasksCount, 
      projects: projectsCount,
      files: Array.isArray(data.files) ? data.files.length : 0
    };
  } catch (error) {
    safeError('Error restoring from backup:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('storage:chooseVaultFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose Petal Vault Folder',
    defaultPath: getDefaultVaultPath()
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const chosenPath = result.filePaths[0];
    storeVaultPath(chosenPath);
    ensureVaultStructure();
    safeLog(`📁 User selected vault folder: ${chosenPath}`);
    safeLog(`  ✓ Vault path saved to preferences`);
    return chosenPath;
  }
  
  return null;
});

ipcMain.handle('onedrive:getRoot', () => {
  return getOneDriveRoot();
});

ipcMain.handle('onedrive:chooseRoot', async () => {
  const detected = detectOneDriveRoot();
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select OneDrive Folder',
    defaultPath: detected || os.homedir(),
    message: 'Select your OneDrive folder. This helps resolve file links across devices.'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const chosenPath = result.filePaths[0];
    storeOneDriveRoot(chosenPath);
    return chosenPath;
  }
  
  return null;
});

ipcMain.handle('file:resolvePath', async (event, fileLink) => {
  try {
    // If share_url exists and we're on iOS (future), use that
    // For now, prefer onedrive_rel, then abs_path
    
    if (fileLink.onedrive_rel) {
      const oneDriveRoot = getOneDriveRoot();
      if (oneDriveRoot) {
        const resolvedPath = path.join(oneDriveRoot, fileLink.onedrive_rel);
        if (fs.existsSync(resolvedPath)) {
          return {
            success: true,
            path: resolvedPath,
            type: 'onedrive_rel'
          };
        }
      }
    }
    
    // Fallback to absolute path
    if (fileLink.abs_path) {
      if (fs.existsSync(fileLink.abs_path)) {
        return {
          success: true,
          path: fileLink.abs_path,
          type: 'abs_path'
        };
      }
    }
    
    // Last resort: share_url (open in browser)
    if (fileLink.share_url) {
      return {
        success: true,
        path: fileLink.share_url,
        type: 'share_url',
        openInBrowser: true
      };
    }
    
    return {
      success: false,
      error: 'No valid path found'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('file:chooseFile', async () => {
  try {
    // Ensure mainWindow exists and is focused
    if (!mainWindow) {
      safeError('mainWindow is not available');
      return null;
    }
    
    // Focus the window to ensure dialog appears on top
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    
    const oneDriveRoot = getOneDriveRoot();
    const defaultPath = oneDriveRoot || os.homedir();
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Link a File',
      defaultPath: defaultPath,
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Documents', extensions: ['doc', 'docx', 'pdf', 'txt'] },
        { name: 'Spreadsheets', extensions: ['xls', 'xlsx', 'csv'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
      ]
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    
    const filePath = result.filePaths[0];
    const normalizedPath = path.normalize(filePath);
    
    // Determine path type and create link object
    const link = {
      label: path.basename(filePath),
      abs_path: normalizedPath
    };
    
    // Try to create OneDrive-relative path (but don't show warning to user)
    if (oneDriveRoot) {
      const oneDriveNormalized = path.normalize(oneDriveRoot);
      if (normalizedPath.toLowerCase().startsWith(oneDriveNormalized.toLowerCase())) {
        const relative = path.relative(oneDriveNormalized, normalizedPath);
        link.onedrive_rel = relative.replace(/\\/g, '/'); // Use forward slashes
        link.isInOneDrive = true;
      } else {
        link.isInOneDrive = false;
        // Don't set warning - user doesn't want to see it
      }
    }
    
    // Extract file extension for type
    const ext = path.extname(filePath).toLowerCase().substring(1);
    if (ext) {
      link.type = ext;
    }
    
    return link;
  } catch (error) {
    safeError('Error in file:chooseFile:', error);
    return null;
  }
});

// Get file metadata (last modified, size, etc.)
ipcMain.handle('file:getMetadata', async (event, fileLink) => {
  try {
    let filePath = null;
    
    // Resolve file path
    if (fileLink.onedrive_rel) {
      const oneDriveRoot = getOneDriveRoot();
      if (oneDriveRoot) {
        const resolvedPath = path.join(oneDriveRoot, fileLink.onedrive_rel);
        if (fs.existsSync(resolvedPath)) {
          filePath = resolvedPath;
        }
      }
    }
    
    if (!filePath && fileLink.abs_path) {
      if (fs.existsSync(fileLink.abs_path)) {
        filePath = fileLink.abs_path;
      }
    }
    
    if (!filePath) {
      return { success: false, error: 'File not found' };
    }
    
    const stats = fs.statSync(filePath);
    return {
      success: true,
      lastModified: stats.mtime.getTime(),
      size: stats.size,
      exists: true
    };
  } catch (error) {
    safeError('Error getting file metadata:', error);
    return { success: false, error: error.message };
  }
});

// File operations - open file with system default application
// Phase 3 Fix: Register early with other file handlers to ensure availability
ipcMain.handle('file:open', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      safeWarn('file:open called with invalid file path:', filePath);
      throw new Error('file:open requires a filePath string');
    }
    
    // Remove file:// prefix if present
    const cleanPath = filePath.replace(/^file:\/\//, '').replace(/^file:\/\/\//, '');
    
    // Open file with system default application
    // shell.openPath returns empty string on success, error message on failure
    const error = await shell.openPath(cleanPath);
    if (error) {
      safeError(`file:open failed: ${error}`);
      throw new Error(error);
    }
    
    return { ok: true };
  } catch (error) {
    safeError('Error opening file:', error);
    throw error; // Re-throw so renderer gets proper error
  }
});

console.log('✅ IPC registered: file:open');

// Step 3: Debug IPC - prove which main process renderer is talking to
// Register immediately after file:open to ensure it's in the same execution path
ipcMain.handle('debug:pid', async () => {
  return { pid: process.pid, time: Date.now() };
});
console.log('✅ IPC registered: debug:pid');

ipcMain.handle('storage:export', async (event, data) => {
  try {
    const paths = ensureVaultStructure();
    const timestamp = new Date().toISOString().split('T')[0];
    const exportPath = path.join(paths.exportsDir, `petal-export-${timestamp}.json`);
    await fsPromises.writeFile(exportPath, JSON.stringify(data, null, 2), 'utf-8');
    return exportPath;
  } catch (error) {
    safeError('Error exporting data:', error);
    throw error;
  }
});

ipcMain.handle('storage:checkVaultExists', () => {
  const paths = getVaultPaths();
  return {
    vaultExists: fs.existsSync(paths.vaultPath),
    dataFileExists: fs.existsSync(paths.dataFile),
    vaultPath: paths.vaultPath
  };
});

// New vault system IPC handlers
ipcMain.handle('vault:getDiagnostics', () => {
  const diagnostics = vaultManager ? vaultManager.getDiagnostics() : {
    error: 'VaultManager not initialized',
    app_version: app.getVersion(),
    platform: process.platform
  };
  
  // Add preload path information
  const preloadPath = path.join(__dirname, 'preload.js');
  diagnostics.preload = {
    path: preloadPath,
    exists: fs.existsSync(preloadPath),
    resolved_dirname: __dirname
  };
  
  return diagnostics;
});

// Support bundle utilities
ipcMain.handle('support:copyDiagnostics', async () => {
  try {
    const diagnostics = vaultManager ? vaultManager.getDiagnostics() : {};
    const diagnosticsJson = JSON.stringify(diagnostics, null, 2);
    // Copy to clipboard
    const { clipboard } = require('electron');
    clipboard.writeText(diagnosticsJson);
    return { success: true, data: diagnosticsJson };
  } catch (error) {
    safeError('Error copying diagnostics:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('support:openLogsFolder', async () => {
  try {
    if (vaultManager && vaultManager.logPath) {
      const logsDir = path.dirname(vaultManager.logPath);
      await shell.openPath(logsDir);
      return { success: true };
    }
    return { success: false, error: 'Log path not available' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('support:openVaultFolder', async () => {
  try {
    const vaultPath = vaultManager ? vaultManager.getActiveVaultPath() : null;
    if (vaultPath && fs.existsSync(vaultPath)) {
      await shell.openPath(vaultPath);
      return { success: true };
    }
    return { success: false, error: 'Vault path not available or does not exist' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('support:exportBundle', async () => {
  try {
    // For now, return paths - actual zip creation would require archiver package
    const bundle = {
      diagnostics: vaultManager ? vaultManager.getDiagnostics() : {},
      logPath: vaultManager ? vaultManager.logPath : null,
      vaultPath: vaultManager ? vaultManager.getActiveVaultPath() : null,
      timestamp: new Date().toISOString()
    };
    return { success: true, bundle };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vault:discover', async () => {
  if (!vaultManager) {
    return { success: false, error: 'VaultManager not initialized' };
  }
  try {
    const discovered = await vaultManager.discoverVaults();
    return { success: true, vaults: discovered };
  } catch (error) {
    vaultManager.logger?.error('Error discovering vaults:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vault:create', async (event, vaultPath) => {
  if (!vaultManager) {
    return { success: false, error: 'VaultManager not initialized' };
  }
  try {
    const result = await vaultManager.createVault(vaultPath);
    return result;
  } catch (error) {
    vaultManager.logger?.error('Error creating vault:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vault:choose', async () => {
  if (!vaultManager || !mainWindow) {
    return { success: false, error: 'VaultManager or window not initialized' };
  }
  
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose or Create Petal Vault Folder',
      defaultPath: getDefaultVaultPath(),
      message: 'Select a folder for your Petal vault. If the folder doesn\'t exist, it will be created.'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const chosenPath = result.filePaths[0];
      
      // Check if it's already a vault
      if (vaultManager.isVaultPath(chosenPath)) {
        const manifest = await vaultManager.setActiveVault(chosenPath);
        
        // Send vault:resolved event to renderer
        mainWindow.webContents.send('vault:resolved', {
          vaultPath: chosenPath,
          manifest: manifest,
          source: 'user-choice'
        });
        
        return {
          success: true,
          vaultPath: chosenPath,
          wasExisting: true,
          manifest: manifest
        };
      } else {
        // Create new vault
        const createResult = await vaultManager.createVault(chosenPath);
        
        if (createResult.success) {
          // Start watching the new vault
          startWatchingDataFile(createResult.vaultPath);
          
          // Send vault:resolved event to renderer
          mainWindow.webContents.send('vault:resolved', {
            vaultPath: createResult.vaultPath,
            manifest: createResult.manifest,
            source: 'user-creation'
          });
        }
        
        return createResult;
      }
    }
    
    return { success: false, canceled: true };
  } catch (error) {
    vaultManager.logger?.error('Error choosing vault:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vault:setActive', async (event, vaultPath) => {
  if (!vaultManager) {
    return { success: false, error: 'VaultManager not initialized' };
  }
  try {
    const manifest = await vaultManager.setActiveVault(vaultPath);
    
    // Start watching the new vault
    startWatchingDataFile(vaultPath);
    
    // Send vault:resolved event to renderer
    if (mainWindow) {
      mainWindow.webContents.send('vault:resolved', {
        vaultPath: vaultPath,
        manifest: manifest,
        source: 'user-choice'
      });
    }
    
    return { success: true, vaultPath, manifest };
  } catch (error) {
    vaultManager.logger?.error('Error setting active vault:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vault:getStatus', () => {
  if (!vaultManager) {
    return {
      resolved: false,
      activeVaultPath: null,
      vaultId: null,
      lastError: 'VaultManager not initialized'
    };
  }
  
  const activePath = vaultManager.getActiveVaultPath();
  
  // Determine if vault is resolved (has active path and is valid)
  const resolved = activePath && 
                   fs.existsSync(activePath) && 
                   vaultManager.isVaultPath(activePath);
  
  let vaultId = null;
  let lastError = null;
  
  if (activePath) {
    if (!fs.existsSync(activePath)) {
      lastError = 'Vault path does not exist';
    } else if (!vaultManager.isVaultPath(activePath)) {
      lastError = 'Path is not a valid vault';
    } else {
      const manifest = vaultManager.readVaultManifest(activePath);
      if (manifest) {
        vaultId = manifest.vault_id;
      } else {
        lastError = 'Could not read vault manifest';
      }
    }
  } else {
    lastError = 'No active vault path set';
  }
  
  return {
    resolved: resolved,
    activeVaultPath: activePath,
    vaultId: vaultId,
    lastError: resolved ? null : lastError,
    // Keep backward compatibility fields
    initialized: true,
    activeVault: activePath ? {
      path: activePath,
      exists: fs.existsSync(activePath),
      isValid: vaultManager.isVaultPath(activePath),
      manifest: vaultManager.readVaultManifest(activePath)
    } : null,
    config: vaultManager.config
  };
});

// Ensure vault is resolved (trigger resolution if needed)
ipcMain.handle('vault:ensureResolved', async () => {
  if (!vaultManager) {
    return {
      resolved: false,
      activeVaultPath: null,
      vaultId: null,
      lastError: 'VaultManager not initialized'
    };
  }
  
  // Check if vault is already resolved
  const activePath = vaultManager.getActiveVaultPath();
  const isResolved = activePath && 
                     fs.existsSync(activePath) && 
                     vaultManager.isVaultPath(activePath);
  
  if (isResolved) {
    // Already resolved, return status
    const manifest = vaultManager.readVaultManifest(activePath);
    return {
      resolved: true,
      activeVaultPath: activePath,
      vaultId: manifest ? manifest.vault_id : null,
      lastError: null
    };
  }
  
  // Not resolved - trigger resolution
  try {
    const resolution = await vaultManager.resolveVault();
    
    if (resolution.success && resolution.vaultPath) {
      const manifest = resolution.manifest || vaultManager.readVaultManifest(resolution.vaultPath);
      
      // Send event to renderer
      if (mainWindow) {
        mainWindow.webContents.send('vault:resolved', {
          vaultPath: resolution.vaultPath,
          manifest: manifest,
          source: resolution.source || 'ensureResolved'
        });
      }
      
      return {
        resolved: true,
        activeVaultPath: resolution.vaultPath,
        vaultId: manifest ? manifest.vault_id : null,
        lastError: null
      };
    } else {
      // Resolution failed or needs user choice
      return {
        resolved: false,
        activeVaultPath: null,
        vaultId: null,
        lastError: resolution.needsUserChoice ? 'User choice required' : 'Vault resolution failed'
      };
    }
  } catch (error) {
    safeError('Error ensuring vault resolution:', error);
    return {
      resolved: false,
      activeVaultPath: null,
      vaultId: null,
      lastError: error.message || 'Unknown error during resolution'
    };
  }
});

// Open vault folder in file manager
ipcMain.handle('vault:openFolder', async (event, vaultPath) => {
  if (!vaultManager) {
    return { success: false, error: 'VaultManager not initialized' };
  }
  
  try {
    const pathToOpen = vaultPath || vaultManager.getActiveVaultPath();
    
    if (!pathToOpen) {
      return { success: false, error: 'No vault path specified' };
    }
    
    if (!fs.existsSync(pathToOpen)) {
      return { success: false, error: 'Vault path does not exist' };
    }
    
    await shell.openPath(pathToOpen);
    
    return { success: true };
  } catch (error) {
    safeError('Error opening vault folder:', error);
    return { success: false, error: error.message };
  }
});

// Support bundle utilities
ipcMain.handle('support:copyDiagnostics', async () => {
  if (!vaultManager) {
    return { success: false, error: 'VaultManager not initialized' };
  }
  try {
    const diagnostics = vaultManager.getDiagnostics();
    const diagnosticsJson = JSON.stringify(diagnostics, null, 2);
    // Copy to clipboard (requires clipboard API)
    const { clipboard } = require('electron');
    clipboard.writeText(diagnosticsJson);
    return { success: true, data: diagnosticsJson };
  } catch (error) {
    safeError('Error copying diagnostics:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('support:openLogsFolder', () => {
  try {
    if (!vaultManager) {
      return { success: false, error: 'VaultManager not initialized' };
    }
    const logsDir = path.dirname(vaultManager.logPath);
    shell.openPath(logsDir);
    return { success: true, path: logsDir };
  } catch (error) {
    safeError('Error opening logs folder:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('support:openVaultFolder', () => {
  try {
    const vaultPath = getVaultPath();
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { success: false, error: 'Vault path not available or does not exist' };
    }
    shell.openPath(vaultPath);
    return { success: true, path: vaultPath };
  } catch (error) {
    safeError('Error opening vault folder:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('support:reloadExternalChanges', async () => {
  try {
    // Reload data from file
    const result = await readDataFile();
    
    // Notify renderer to reload state
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vault:reloadState', {
        data: result.data,
        recoveredFromBackup: result.recoveredFromBackup
      });
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    safeError('Error reloading external changes:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('support:exportCurrentState', async (event, exportPath) => {
  try {
    // Get current state from renderer (they should pass it)
    // For now, read from file
    const result = await readDataFile();
    const exportData = {
      ...result.data,
      exportedAt: new Date().toISOString(),
      exportedBy: 'user-conflict-resolution',
      note: 'Exported during external modification conflict'
    };
    
    await fsPromises.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { success: true, path: exportPath };
  } catch (error) {
    safeError('Error exporting current state:', error);
    return { success: false, error: error.message };
  }
});

// Note: debug:pid handler moved earlier (right after file:open) to ensure registration
