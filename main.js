// ═══════════════════════ ELECTRON MAIN PROCESS ═══════════════════════
// SET UP ERROR HANDLING FIRST - before any other code runs
// This prevents EPIPE errors from crashing the app

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
const VAULT_FOLDER_NAME = 'PetalVault';
const DATA_FILE_NAME = 'petal.json';
const BACKUP_FILE_NAME = 'petal.json.bak';

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

// Get the current vault path (stored preference or default)
function getVaultPath() {
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
  
  // Create directories
  [paths.vaultPath, paths.exportsDir, paths.attachmentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
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

// Read data file with conflict detection
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
    
    // Read main data file
    let mainData = null;
    let mainMtime = null;
    
    if (fs.existsSync(paths.dataFile)) {
      const stats = await fsPromises.stat(paths.dataFile);
      mainMtime = stats.mtime;
      const data = await fsPromises.readFile(paths.dataFile, 'utf-8');
      mainData = JSON.parse(data);
      
      // DEBUG: Log what was loaded
      safeLog(`🔍 DEBUG: Loaded data from file:`);
      safeLog(`  Tasks: ${mainData.tasks?.length || 0}`);
      safeLog(`  Projects: ${mainData.projects?.length || 0}`);
      safeLog(`  Events: ${mainData.events?.length || 0}`);
      safeLog(`  Open Projects: ${mainData.openProjects?.length || 0}`);
    } else {
      safeWarn(`⚠️ WARNING: Data file not found at ${paths.dataFile}`);
    }
    
    // Check if we have conflicts that are newer than main file
    const newerConflicts = allConflicts.filter(c => {
      return mainMtime ? c.mtime > mainMtime : true;
    });
    
    // Return data with conflict info
    return {
      data: mainData || { tasks: [], projects: [], openProjects: [], settings: {} },
      hasConflicts: allConflicts.length > 0,
      conflicts: allConflicts,
      newerConflicts: newerConflicts,
      mainFileMtime: mainMtime
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        data: { tasks: [], projects: [], openProjects: [], settings: {} },
        hasConflicts: false,
        conflicts: [],
        newerConflicts: []
      };
    }
    throw error;
  }
}

// Write data file atomically with backup
async function writeDataFile(data) {
  const paths = ensureVaultStructure();
  
  try {
    const jsonData = JSON.stringify(data, null, 2);
    
    // 1. Create backup of existing file if it exists
    if (fs.existsSync(paths.dataFile)) {
      await fsPromises.copyFile(paths.dataFile, paths.backupFile);
    }
    
    // 2. Write to temp file first (atomic write)
    await fsPromises.writeFile(paths.tempFile, jsonData, 'utf-8');
    
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
    return { success: false, error: error.message };
  }
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

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

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
    const paths = getVaultPaths();
    const vaultPath = getVaultPath();
    const isStored = getStoredVaultPath() !== null;
    safeLog(`📂 Loading from vault: ${vaultPath}`);
    safeLog(`  ${isStored ? '✓ Using user-selected vault' : '⚠ Using default vault (no user selection)'}`);
    safeLog(`  Data file: ${paths.dataFile}`);
    
    const result = await readDataFile();
    
    if (result.data) {
      safeLog(`  ✓ Loaded ${result.data.tasks?.length || 0} tasks, ${result.data.projects?.length || 0} projects`);
    }
    
    return result;
  } catch (error) {
    safeError('Error loading data:', error);
    return {
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

ipcMain.handle('storage:save', async (event, state) => {
  try {
    const vaultPath = getVaultPath();
    const isStored = getStoredVaultPath() !== null;
    const result = await writeDataFile(state);
    if (result.success) {
      const paths = getVaultPaths();
      const stats = fs.existsSync(paths.dataFile) ? fs.statSync(paths.dataFile) : null;
      safeLog(`💾 Saved successfully to vault: ${vaultPath}`);
      safeLog(`  ${isStored ? '✓ Using user-selected vault' : '⚠ Using default vault (no user selection)'}`);
      safeLog(`  Data file: ${paths.dataFile}`);
      safeLog(`  Tasks: ${state.tasks?.length || 0}, Projects: ${state.projects?.length || 0}`);
      if (stats) {
        safeLog(`  File size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
      }
    } else {
      safeError('✗ Save failed:', result);
    }
    return result.success || false;
  } catch (error) {
    safeError('Error saving data:', error);
    return false;
  }
});

ipcMain.handle('storage:getPath', () => {
  const paths = getVaultPaths();
  return paths.dataFile;
});

ipcMain.handle('storage:getVaultPath', () => {
  return getVaultPath();
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

ipcMain.handle('file:open', async (event, filePath) => {
  try {
    // Remove file:// prefix if present
    const cleanPath = filePath.replace(/^file:\/\//, '').replace(/^file:\/\/\//, '');
    await shell.openPath(cleanPath);
    return true;
  } catch (error) {
    safeError('Error opening file:', error);
    return false;
  }
});
