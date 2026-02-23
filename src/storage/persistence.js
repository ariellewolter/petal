// ═══════════════════════ PERSISTENCE LAYER ═══════════════════════
// Phase 3: Single deterministic save pipeline
// Handles saving state to storage (debounced, single-flight, latest-wins)
// Subscribes to store changes, never called directly from UI

import { appStore } from '../state/store.js';
// Use window.storage since storage.js is loaded as a regular script, not a module
const storage = window.storage;

// ═══════════════════════ PHASE 3 STATE ═══════════════════════
let saveTimeout = null;
let isLoading = false; // Prevent saves during initial load/migration
let isSaving = false; // Single-flight lock: prevents overlapping writes
let queuedState = null; // Latest-wins queue: stores most recent state snapshot
const SAVE_DEBOUNCE_MS = 500; // Wait 500ms after last change before saving

// Save status tracking (for UI indicator)
let lastSaveOk = null; // true = success, false = failure, null = never saved
let lastSaveTime = null; // timestamp of last save attempt
let lastSaveError = null; // error message if last save failed

/**
 * Set loading state (prevents saves during initial load/migration)
 * Phase 3.4: Loading gate
 */
export function setLoading(loading) {
  isLoading = loading;
  if (loading) {
    // Cancel any pending saves when starting to load
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    // Clear queue during load
    queuedState = null;
  }
}

/**
 * Get save status (for UI indicator)
 * Phase 3.5: Save status indicator
 */
export function getSaveStatus() {
  return {
    isSaving,
    lastSaveOk,
    lastSaveTime,
    lastSaveError,
    hasUnsavedChanges: queuedState !== null || saveTimeout !== null
  };
}

/**
 * Flush save immediately (for critical actions)
 * Phase 3.2: Replace direct save() calls with flush() where needed
 */
export async function flush() {
  // Cancel debounce
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  
  // Queue current state (create immutable snapshot)
  queuedState = createImmutableSnapshot(appStore.exportState());
  
  // Trigger save immediately
  await performSave();
}

/**
 * Perform the actual save operation (single-flight)
 * Phase 3.1: Single-flight + latest-wins queue
 */
async function performSave() {
  // Don't save during initial load/migration
  if (isLoading) {
    console.log('⏸️ SAVE skipped: loading in progress');
    return;
  }
  
  // If already saving, queue the latest state and return
  if (isSaving) {
    queuedState = createImmutableSnapshot(appStore.exportState());
    console.log('⏳ SAVE queued: write in progress, will save latest state after current write');
    return;
  }
  
  // Take latest queued state (or current state if nothing queued)
  // Create immutable snapshot to prevent mutation during save
  const stateToSave = queuedState ? queuedState : createImmutableSnapshot(appStore.exportState());
  queuedState = null; // Clear queue
  
  // Set saving lock
  isSaving = true;
  lastSaveTime = Date.now();
  
  // Update UI indicator to "saving"
  updateSaveIndicator('saving');
  
  try {
    // Phase 3 Fix: Debug log to prove files are being saved
    console.log('🧪 saving snapshot', { 
      files: (stateToSave.files || []).length, 
      first: (stateToSave.files || [])[0]?.name 
    });
    
    // Release-Safe: Explicit files count logging to catch persistence issues
    const filesCount = stateToSave.files?.length ?? 0;
    const tasksCount = stateToSave.tasks?.length ?? 0;
    const projectsCount = stateToSave.projects?.length ?? 0;
    
    console.log('💾 SAVE start:', {
      tasks: tasksCount,
      projects: projectsCount,
      files: filesCount, // ✅ Explicit files count
      filesFirst: filesCount > 0 ? stateToSave.files[0]?.name : null,
      timestamp: new Date().toISOString()
    });
    
    // Warn if files should exist but don't
    if (filesCount === 0 && typeof window !== 'undefined' && window.Petal?.store) {
      const currentState = window.Petal.store.getState();
      const currentFilesCount = currentState.files?.length ?? 0;
      if (currentFilesCount > 0) {
        console.warn('⚠️ WARNING: files count mismatch! Store has', currentFilesCount, 'files but snapshot has', filesCount);
      }
    }
    
    // Phase 3.3: Save ONLY store state (no fallbacks to window globals)
    // This is now illegal - store must be the single source of truth
    
    // Guard: Assert projects is an array before saving
    if (!Array.isArray(stateToSave.projects)) {
      console.error('❌ projects not array at save time:', stateToSave.projects);
      throw new Error('Projects must be an array');
    }
    
    // CRITICAL: Prevent saving empty state if we have data in store OR vault
    // This prevents accidental data loss from empty saves
    let shouldBlockSave = false;
    let blockReason = '';
    
    if (typeof window !== 'undefined' && window.Petal?.store) {
      const currentState = window.Petal.store.getState();
      const currentTasksCount = currentState.tasks?.length || 0;
      const currentProjectsCount = currentState.projects?.length || 0;
      
      // If store has data but snapshot is empty, block the save
      if (currentTasksCount > 0 && tasksCount === 0) {
        shouldBlockSave = true;
        blockReason = `Store has ${currentTasksCount} tasks but snapshot is empty`;
      }
      
      if (currentProjectsCount > 0 && projectsCount === 0) {
        shouldBlockSave = true;
        blockReason = `Store has ${currentProjectsCount} projects but snapshot is empty`;
      }
    }
    
    // Also check vault file if in Electron (prevent overwriting existing vault data with empty state)
    if (!shouldBlockSave && tasksCount === 0 && projectsCount === 0 && 
        typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getDataPath) {
      try {
        // This is a safety check - we can't easily read the vault file from renderer,
        // but we can check if this is the first save (no previous data in store)
        // If store was just initialized and is empty, but we're trying to save,
        // it might mean we're overwriting existing vault data
        const currentState = window.Petal?.store?.getState();
        const wasJustInitialized = window.Petal?.store?._isInitialLoad === true;
        
        if (wasJustInitialized && tasksCount === 0 && projectsCount === 0) {
          // CRITICAL: Block saving empty state on first initialization
          // This prevents overwriting existing vault data with empty state
          // The vault file should have been loaded - if we're trying to save empty,
          // something went wrong and we should not overwrite the vault
          shouldBlockSave = true;
          blockReason = 'Attempting to save empty state on first initialization - this would overwrite existing vault data';
          console.error('❌ BLOCKED SAVE: Attempting to save empty state on first initialization', {
            timestamp: new Date().toISOString(),
            stackTrace: new Error().stack
          });
        }
      } catch (e) {
        // Ignore errors in vault check
      }
    }
    
    if (shouldBlockSave) {
      console.error('❌ BLOCKED SAVE:', blockReason, {
        snapshotTasks: tasksCount,
        snapshotProjects: projectsCount,
        stackTrace: new Error().stack
      });
      throw new Error(`Cannot save empty state: ${blockReason}`);
    }
    
    if (stateToSave.projects.length === 0 && tasksCount === 0) {
      console.warn('⚠️ saving with 0 projects and 0 tasks — is this expected?', {
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await storage.saveState(stateToSave);
    
    // Handle result
    // Phase 3 Gotcha Fix: "Saved" only appears when write actually succeeds (result.ok === true)
    // This ensures we never show "Saved" for scheduled or started saves, only completed successful writes
    if (result && result.ok) {
      lastSaveOk = true;
      lastSaveError = null;
      console.log('✅ SAVE success:', {
        timestamp: new Date().toISOString(),
        tasks: tasksCount,
        projects: projectsCount,
        files: filesCount, // ✅ Explicit files count
        filesFirst: filesCount > 0 ? stateToSave.files[0]?.name : null
      });
      
      // Update UI indicator - only called when write actually succeeded
      updateSaveIndicator('saved');
    } else {
      // Failure - store error
      const errorMsg = result?.error || 'Unknown save error';
      lastSaveOk = false;
      lastSaveError = errorMsg;
      console.error('❌ SAVE failed:', errorMsg);
      
      // Update UI indicator - shows failure, never shows "Saved"
      updateSaveIndicator('failed', errorMsg);
      
      // Show user-friendly error (only for critical errors)
      if (errorMsg === 'Vault not resolved') {
        alert('Error: Cannot save - vault not resolved. Please restart the app.');
      }
    }
  } catch (error) {
    // Exception during save
    const errorMsg = error.message || String(error);
    lastSaveOk = false;
    lastSaveError = errorMsg;
    console.error('❌ SAVE exception:', errorMsg);
    
    // Update UI indicator
    updateSaveIndicator('failed', errorMsg);
  } finally {
    // Release saving lock
    isSaving = false;
    
    // If state was queued while we were saving, trigger another save
    if (queuedState) {
      console.log('🔄 SAVE requeue: new changes detected during save, scheduling immediate save');
      // Schedule immediate save (no debounce for requeue)
      setTimeout(() => performSave(), 0);
    }
  }
}

/**
 * Save state to storage (debounced, triggers performSave)
 * Phase 3.1: Latest-wins queue
 */
function saveState(state) {
  // Don't queue during initial load/migration
  if (isLoading) {
    return;
  }
  
  // Queue latest state (latest-wins) - create immutable snapshot
  queuedState = createImmutableSnapshot(appStore.exportState());
  
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // Set new timeout (debounce)
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    performSave();
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Create immutable snapshot of state (prevents reference capture)
 * Phase 3 Gotcha Fix: Ensures queued state cannot be mutated
 * 
 * This creates shallow clones of arrays and top-level objects.
 * For tasks/projects, we clone the objects themselves (not nested arrays like files/subtasks),
 * which is sufficient to prevent "wrong version saved" bugs since the task/project identity
 * and top-level properties are what matter for persistence.
 */
function createImmutableSnapshot(state) {
  // Clone arrays and top-level objects to prevent mutation
  // This ensures queuedState is truly immutable at the level that matters for persistence
  // Deep clone settings to preserve nested objects like cellLog
  let settingsClone = {};
  if (state.settings && typeof state.settings === 'object') {
    settingsClone = { ...state.settings };
    // Deep clone cellLog if it exists (preserves cellTypes, mediaTypes, entries)
    if (state.settings.cellLog && typeof state.settings.cellLog === 'object') {
      settingsClone.cellLog = {
        ...state.settings.cellLog,
        cellTypes: Array.isArray(state.settings.cellLog.cellTypes) ? [...state.settings.cellLog.cellTypes] : [],
        mediaTypes: Array.isArray(state.settings.cellLog.mediaTypes) ? [...state.settings.cellLog.mediaTypes] : [],
        entries: Array.isArray(state.settings.cellLog.entries) ? state.settings.cellLog.entries.map(e => ({ ...e })) : []
      };
    }
    // Deep clone any other nested settings objects if needed
    if (state.settings.board && typeof state.settings.board === 'object') {
      settingsClone.board = { ...state.settings.board };
    }
  }
  
  return {
    tasks: state.tasks ? state.tasks.map(t => ({ ...t })) : [],
    projects: state.projects ? state.projects.map(p => ({ ...p })) : [],
    openProjects: state.openProjects ? Array.from(state.openProjects) : [],
    settings: settingsClone,
    events: state.events ? state.events.map(e => ({ ...e })) : [],
    recurringRules: state.recurringRules ? state.recurringRules.map(r => ({ ...r })) : [],
    habits: state.habits ? state.habits.map(h => ({ ...h })) : [],
    habitCheckins: state.habitCheckins ? { ...state.habitCheckins } : {},
    routines: state.routines ? state.routines.map(r => ({ ...r })) : [],
    routineCheckins: state.routineCheckins ? { ...state.routineCheckins } : {},
    files: state.files ? state.files.map(f => ({ ...f })) : [], // ✅ Persisted files list
    workflow: state.workflow ? {
      laneOrder: Array.isArray(state.workflow.laneOrder) ? [...state.workflow.laneOrder] : [],
      columns: state.workflow.columns ? { ...state.workflow.columns } : {},
      placement: state.workflow.placement ? { ...state.workflow.placement } : {},
      rules: state.workflow.rules ? { ...state.workflow.rules } : {},
      ui: state.workflow.ui ? { ...state.workflow.ui } : {}
    } : {},
    fileRegistry: state.fileRegistry ? { ...state.fileRegistry } : {},
    fileHistory: state.fileHistory ? { ...state.fileHistory } : {}
  };
}

/**
 * Update save indicator in UI
 * Phase 3.5: Save status indicator with vault confirmation
 */
function updateSaveIndicator(status, error = null) {
  // Find or create save indicator container
  let container = document.getElementById('save-status-container');
  if (!container) {
    // Create container if it doesn't exist
    const footer = document.querySelector('.app-footer') || document.body;
    container = document.createElement('div');
    container.id = 'save-status-container';
    container.style.cssText = 'position:fixed;bottom:8px;right:8px;display:flex;flex-direction:column;gap:4px;align-items:flex-end;z-index:10000;';
    footer.appendChild(container);
  }
  
  // Get or create status indicator
  let indicator = document.getElementById('save-status-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'save-status-indicator';
    indicator.style.cssText = 'padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;';
    indicator.onclick = () => {
      // Click to open diagnostics
      if (window.electronAPI && window.electronAPI.vaultGetDiagnostics) {
        window.electronAPI.vaultGetDiagnostics().then(diag => {
          console.log('Vault Diagnostics:', diag);
          alert(`Vault: ${diag.activeVault?.path || 'Not set'}\n\nClick OK to open diagnostics modal.`);
        });
      }
    };
    container.appendChild(indicator);
  }
  
  // Get or create vault indicator
  let vaultIndicator = document.getElementById('vault-status-indicator');
  if (!vaultIndicator) {
    vaultIndicator = document.createElement('div');
    vaultIndicator.id = 'vault-status-indicator';
    vaultIndicator.style.cssText = 'padding:2px 6px;border-radius:4px;font-size:10px;color:var(--text-dim, #666);background:var(--bg2, #f5f5f5);cursor:pointer;';
    vaultIndicator.onclick = async () => {
      // Click to open vault folder
      if (window.electronAPI && window.electronAPI.vaultOpenFolder) {
        await window.electronAPI.vaultOpenFolder();
      }
    };
    container.appendChild(vaultIndicator);
    
    // Update vault indicator with current vault path
    updateVaultIndicator();
  }
  
  // Update indicator based on status
  if (status === 'saving') {
    indicator.textContent = 'Saving...';
    indicator.style.background = '#ffa500';
    indicator.style.color = '#fff';
  } else if (status === 'saved') {
    const saveTime = lastSaveTime ? new Date(lastSaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    indicator.textContent = saveTime ? `Saved · ${saveTime}` : 'Saved';
    indicator.style.background = '#4caf50';
    indicator.style.color = '#fff';
    // Fade out after 3 seconds
    setTimeout(() => {
      if (indicator.textContent.includes('Saved')) {
        indicator.style.opacity = '0.6';
      }
    }, 3000);
  } else if (status === 'failed') {
    indicator.textContent = `Save failed: ${error || 'Unknown error'}`;
    indicator.style.background = '#f44336';
    indicator.style.color = '#fff';
    indicator.title = error || 'Save failed';
  }
}

/**
 * Update vault indicator with current vault path
 */
async function updateVaultIndicator() {
  const vaultIndicator = document.getElementById('vault-status-indicator');
  if (!vaultIndicator) return;
  
  try {
    if (window.electronAPI && window.electronAPI.vaultGetStatus) {
      const status = await window.electronAPI.vaultGetStatus();
      if (status.resolved && status.activeVaultPath) {
        // Extract vault name from path
        const pathParts = status.activeVaultPath.split(/[/\\]/);
        const vaultName = pathParts[pathParts.length - 1] || 'PetalVault';
        
        // Detect cloud sync location
        let location = '';
        if (status.activeVaultPath.includes('OneDrive')) location = 'OneDrive';
        else if (status.activeVaultPath.includes('iCloud')) location = 'iCloud';
        else if (status.activeVaultPath.includes('CloudDocs')) location = 'iCloud';
        
        vaultIndicator.textContent = location ? `${vaultName} (${location})` : vaultName;
        vaultIndicator.title = `Vault: ${status.activeVaultPath}\nClick to open folder`;
      } else {
        vaultIndicator.textContent = 'No vault';
        vaultIndicator.title = 'Vault not resolved';
      }
    }
  } catch (e) {
    vaultIndicator.textContent = 'Vault unknown';
  }
}

/**
 * Initialize persistence subscription
 * Call this once during app initialization
 */
export function initPersistence() {
  // Subscribe to store changes
  appStore.subscribe(saveState);
  
  // Initialize vault indicator
  if (typeof window !== 'undefined' && window.electronAPI) {
    // Update vault indicator after a short delay (wait for vault resolution)
    setTimeout(() => {
      updateVaultIndicator();
    }, 1000);
  }
  
  console.log('✅ Persistence layer initialized - single deterministic save pipeline');
  console.log('   - Auto-save on state changes (debounced 500ms)');
  console.log('   - Single-flight writes (no overlapping saves)');
  console.log('   - Latest-wins queue (prevents old saves overwriting new state)');
}

// Expose API to window for backward compatibility and flush
if (typeof window !== 'undefined') {
  window.Petal = window.Petal || {};
  window.Petal.setLoading = setLoading;
  window.Petal.persistence = {
    flush,
    getSaveStatus,
    setLoading
  };
}
