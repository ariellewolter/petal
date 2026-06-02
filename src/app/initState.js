// ═══════════════════════ STATE INITIALIZATION ═══════════════════════
// Handles vault resolution, state loading, and migrations

import { setLoading, getSaveStatus } from '../storage/persistence.js';
import { render } from './viewManager.js';
import { updateVaultBadge, waitForVaultResolved, verifySaveLocation, updateFileButtons } from '../utils/vault.js';
import { migrateTasksForKanban, migrateSubtasksToTasks, migrateNotesFields, migrateToCanonicalFileRegistry } from '../utils/migrations.js';
import { ensureCellLogSettings, ensureAppearanceSettings } from '../utils/settings.js';
import { initTheme } from '../utils/theme.js';
import { refreshProjectSelects } from '../ui/selects.js';
import { showConflictBanner } from '../ui/conflictBanner.js';

function applyIncomingStateToStore(payload, sourceLabel) {
  const incoming = payload?.data || payload;
  const store = window.Petal?.store;
  if (!store || !incoming || typeof incoming !== 'object') {
    return false;
  }

  try {
    store.loadState(incoming);
    const storeState = store.getState();
    window.fileRegistry = storeState.fileRegistry || {};
    window.fileHistory = storeState.fileHistory || {};
    if (storeState.currentView) {
      window.currentView = storeState.currentView;
    }
    if (typeof render === 'function') {
      render();
    }
    console.log(`✓ Applied incoming state from ${sourceLabel}`);
    return true;
  } catch (error) {
    console.error(`Failed to apply incoming state from ${sourceLabel}:`, error);
    return false;
  }
}

/**
 * Initialize application state
 * This function handles:
 * - Vault resolution (Electron only)
 * - Loading state from storage
 * - Running migrations
 * - Setting up initial UI
 */
export async function initStateInternal() {
  // CRITICAL: Wait for vault resolution before loading state
  let vaultResolved = false;
  let vaultResolvedData = null;
  
  // Check vault setup if in Electron
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      // Set up event listeners for vault resolution (for UI updates, but we poll for certainty)
      window.electronAPI.onVaultResolved((data) => {
        console.log('✓ Vault resolved event received:', data);
      });
      
      window.electronAPI.onVaultNeedsChoice((data) => {
        console.log('⚠️ Vault needs user choice:', data);
      });

      window.electronAPI.onVaultExternalModification(async (data) => {
        console.warn('⚠️ External vault modification detected:', data);
        if (data?.hasUnsavedChanges) {
          const reload = confirm(
            'The vault file was changed externally (e.g. iCloud sync). You have unsaved local changes. Reload from disk and discard local edits?'
          );
          if (!reload) return;
        }
        if (window.electronAPI?.supportReloadExternalChanges) {
          const result = await window.electronAPI.supportReloadExternalChanges();
          if (result?.success) {
            applyIncomingStateToStore(result.data, 'external modification');
          }
        }
      });

      window.electronAPI.onVaultCorruptionRecovered(async (data) => {
        console.warn('⚠️ Vault recovered from backup:', data);
        alert('Petal detected a corrupted vault file and recovered from backup.');
        if (window.electronAPI?.supportReloadExternalChanges) {
          const result = await window.electronAPI.supportReloadExternalChanges();
          if (result?.success) {
            applyIncomingStateToStore(result.data, 'corruption recovery');
          }
        }
      });

      window.electronAPI.onVaultRelocated((data) => {
        console.log('ℹ️ Vault relocation detected:', data);
      });

      window.electronAPI.onVaultNeedsRelocation((data) => {
        console.warn('⚠️ Vault needs relocation:', data);
      });

      window.electronAPI.onStorageStateChanged(async (data) => {
        const hasUnsaved = getSaveStatus()?.hasUnsavedChanges;
        if (hasUnsaved) {
          const reload = confirm(
            'Data on disk was updated (e.g. vault sync or optimize). You have unsaved local changes. Reload from disk and discard local edits?'
          );
          if (!reload) return;
        }
        applyIncomingStateToStore(data, 'storage:stateChanged');
      });

      window.electronAPI.onVaultReloadState((payload) => {
        applyIncomingStateToStore(payload, 'vault:reloadState');
      });
      
      // Check vault status using new vault system
      const vaultStatus = await window.electronAPI.vaultGetStatus();
      
      // If vault is already resolved, proceed
      if (vaultStatus.resolved && vaultStatus.activeVaultPath) {
        console.log('✓ Vault already resolved:', vaultStatus.activeVaultPath);
        vaultResolved = true;
        vaultResolvedData = {
          vaultPath: vaultStatus.activeVaultPath,
          vaultId: vaultStatus.vaultId,
          source: 'config'
        };
        // Update UI badge
        await updateVaultBadge();
      } else if (vaultStatus.initialized && vaultStatus.activeVault && (vaultStatus.activeVault.isValid || vaultStatus.activeVault.is_valid)) {
        // Backward compatibility check
        console.log('✓ Vault already resolved (legacy format):', vaultStatus.activeVault.path);
        vaultResolved = true;
        vaultResolvedData = {
          vaultPath: vaultStatus.activeVault.path,
          manifest: vaultStatus.activeVault.manifest,
          source: 'config'
        };
        // Update UI badge
        await updateVaultBadge();
      } else {
        // Wait for vault resolution using polling (deterministic)
        console.log('⏳ Waiting for vault resolution...');
        
        // If no vault is active, prompt user to create/choose one
        if (!vaultStatus.initialized || !vaultStatus.activeVault) {
          // Discover existing vaults first
          const discovered = await window.electronAPI.vaultDiscover();
          
          let message = 'Welcome to Petal!\n\n';
          if (discovered.success && discovered.vaults && discovered.vaults.length > 0) {
            message += `Found ${discovered.vaults.length} existing vault${discovered.vaults.length > 1 ? 's' : ''}.\n\n`;
            message += 'Would you like to:\n';
            message += '• Use an existing vault\n';
            message += '• Create a new vault\n\n';
            message += 'Click OK to choose, or Cancel to use the default location.';
          } else {
            message += 'Choose a folder for your Petal Vault. This is where your tasks will be stored.\n\n';
            message += 'Recommended: Choose a folder in OneDrive (Windows) or iCloud Drive (Mac) for automatic sync.\n\n';
            message += 'Click OK to choose a folder, or Cancel to use the default location.';
          }
          
          const shouldChoose = confirm(message);
          
          if (shouldChoose) {
            const result = await window.electronAPI.vaultChoose();
            if (!result || !result.success) {
              console.log('Using default vault location');
            } else {
              console.log('Vault selected:', result.vaultPath);
            }
          }
        }
        
        // Ensure resolution is triggered, then poll until vault is resolved (deterministic - no "proceed anyway")
        try {
          // Trigger resolution state machine first
          console.log('Triggering vault resolution...');
          await window.electronAPI.vaultEnsureResolved();
          
          // Poll until resolved
          vaultResolvedData = await waitForVaultResolved();
          vaultResolved = true;
          console.log("✓ Vault resolved:", vaultResolvedData.vaultPath);
          // Update UI badge
          await updateVaultBadge();
        } catch (e) {
          console.error("✗ Vault resolution failed:", e);
          // Show a blocking modal instead of proceeding
          alert("Vault not ready. Please restart the app or choose a vault.");
          return; // Don't proceed without a vault
        }
      }
      
      // Check OneDrive root (for file linking)
      const oneDriveRoot = await window.electronAPI.getOneDriveRoot();
      if (!oneDriveRoot) {
        const shouldSetOneDrive = confirm(
          'OneDrive Detection\n\n' +
          'Petal can detect your OneDrive folder to make file links work across devices.\n\n' +
          'Would you like to set your OneDrive folder now? (You can skip and set it later)'
        );
        
        if (shouldSetOneDrive) {
          await window.electronAPI.chooseOneDriveRoot();
        }
      }
      
      // Show vault path
      const vaultPath = vaultResolvedData?.vaultPath || await window.electronAPI.getVaultPath();
      const dataPath = await window.electronAPI.getDataPath();
      const pathEl = document.getElementById('data-path');
      if (pathEl && vaultPath) {
        const displayPath = vaultPath.replace(/\\/g, '/').split('/').slice(-2).join('/');
        pathEl.textContent = '📁 ' + displayPath;
        pathEl.title = `Vault: ${vaultPath}\nData file: ${dataPath}\n\nClick to open in Finder`;
        pathEl.style.cursor = 'pointer';
        pathEl.style.display = 'block';
        pathEl.onclick = async () => {
          // Open vault folder in Finder/Explorer
          if (window.electronAPI && window.electronAPI.openFile) {
            await window.electronAPI.openFile(vaultPath);
          } else {
            // Fallback: show path
            alert(`Vault location:\n${vaultPath}\n\nData file:\n${dataPath}`);
          }
        };
        // Right-click or Ctrl+Click to open diagnostics
        pathEl.oncontextmenu = (e) => {
          e.preventDefault();
          if (typeof window !== 'undefined' && window.electronAPI && window.openDiagnosticsModal) {
            window.openDiagnosticsModal();
          }
        };
      }
      
      // Verify save location (log to console)
      await verifySaveLocation();
    } catch (e) {
      console.warn('Could not check vault:', e);
    }
  }
  
  // Update file button text and hints based on Electron API availability
  updateFileButtons();
  
  // CRITICAL: Only load state after vault is resolved
  if (typeof window !== 'undefined' && window.electronAPI && !vaultResolved) {
    console.warn('⚠️ WARNING: Loading state without confirmed vault resolution');
  }
  
  // Prevent saves during initial load/migration
  setLoading(true);
  
  // Load state (with conflict detection)
  const loadResult = await window.storage.loadState();
  
  // Check for vault resolution errors
  if (loadResult.ok === false && loadResult.error === 'Vault not resolved') {
    console.error('❌ ERROR: Cannot load state - vault not resolved');
    alert('Error: Vault not resolved. Please restart the app.');
    return;
  }
  
  // Extract data (handle both Electron and browser formats)
  let loadedData;
  if (loadResult.hasConflicts !== undefined) {
    // Electron: has conflict info
    loadedData = loadResult.data;
    
    // Show corruption recovery banner if recovered from backup
    if (loadResult.recoveredFromBackup) {
      console.log('✅ Data recovered from backup');
      // Banner will be shown by event listener
    }
    
    // Show conflict banner if conflicts exist
    if (loadResult.hasConflicts && loadResult.conflicts && loadResult.conflicts.length > 0) {
      showConflictBanner(loadResult.conflicts, loadResult.newerConflicts || []);
    }
  } else {
    // Browser: simple state
    loadedData = loadResult;
  }
  
  // DEBUG: Log what was loaded
  console.log('🔍 DEBUG: Loaded data from vault:', {
    tasksCount: loadedData.tasks?.length || 0,
    projectsCount: loadedData.projects?.length || 0,
    filesCount: loadedData.files?.length || 0,
    eventsCount: loadedData.events?.length || 0,
    openProjects: loadedData.openProjects || [],
    hasSettings: !!loadedData.settings,
    hasCellLog: !!(loadedData.settings?.cellLog),
    cellLogEntries: loadedData.settings?.cellLog?.entries?.length || 0,
    cellLogCellTypes: loadedData.settings?.cellLog?.cellTypes?.length || 0,
    cellLogMediaTypes: loadedData.settings?.cellLog?.mediaTypes?.length || 0,
    habitsCount: loadedData.habits?.length || 0,
    routinesCount: loadedData.routines?.length || 0
  });
  
  // Load data into store (Step 2: Wire store)
  // Wait for module to load if needed (module scripts are deferred)
  if (!window.Petal || !window.Petal.store) {
    console.warn('Store not available yet, waiting...');
    // Retry after a short delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (window.Petal && window.Petal.store) {
    // Get current UI state from window (these are set before initState is called)
    const currentView = loadedData.currentView || window.currentView || 'today';
    const currentSort = window.currentSort || loadedData.currentSort || 'all';
    const currentFilter = window.currentFilter || loadedData.currentFilter || 'all';
    const currentProjFilter = window.currentProjFilter || loadedData.currentProjFilter || 'all';
    const selectedColor = window.selectedColor || loadedData.selectedColor || 1;
    const taskMode = window.taskMode || loadedData.taskMode || 'list';
    const boardProjectFilter = window.boardProjectFilter || loadedData.boardProjectFilter || 'all';
    const searchQuery = window.searchQuery || loadedData.searchQuery || '';
    const currentFileView = window.currentFileView || loadedData.currentFileView || 'all';
    const selectedProjectId = window.selectedProjectId || loadedData.selectedProjectId || null;
    
    const stateToLoad = {
      schemaVersion: loadedData.schemaVersion,
      tasks: loadedData.tasks || [],
      projects: loadedData.projects || [],
      openProjects: loadedData.openProjects || [],
      settings: loadedData.settings || {},
      events: loadedData.events || [],
      recurringRules: loadedData.recurringRules || [],
      habits: loadedData.habits || [],
      habitCheckins: loadedData.habitCheckins || {},
      routines: loadedData.routines || [],
      routineCheckins: loadedData.routineCheckins || {},
      workflow: loadedData.workflow || {},
      prints3d: loadedData.prints3d || [], // 3D print queue
      currentView,
      currentSort,
      currentFilter,
      currentProjFilter,
      selectedColor,
      taskMode,
      boardProjectFilter,
      searchQuery,
      currentFileView,
      selectedProjectId: loadedData.selectedProjectId ?? selectedProjectId,
      plannerViewDate: loadedData.plannerViewDate ?? null,
      currentPlannerView: loadedData.currentPlannerView || 'daily',
      plannerWeekOffset: loadedData.plannerWeekOffset ?? 0,
      plannerCalYear: loadedData.plannerCalYear ?? null,
      plannerCalMonth: loadedData.plannerCalMonth ?? null,
      fileRegistry: loadedData.fileRegistry || {},
      fileHistory: loadedData.fileHistory || {},
      files: loadedData.files || [] // Phase 3 Fix: Load persisted files
    };
    
    // Also set window.currentView to ensure it's in sync
    window.currentView = currentView;
    
    // Phase 3 Fix: Debug log to prove files are being loaded
    console.log('🧪 loaded snapshot', { 
      files: (loadedData.files || []).length, 
      first: (loadedData.files || [])[0]?.name 
    });
    
    console.log('🔍 DEBUG: Loading into store:', {
      tasksCount: stateToLoad.tasks.length,
      projectsCount: stateToLoad.projects.length,
      openProjectsCount: stateToLoad.openProjects.length,
      filesCount: stateToLoad.files.length
    });
    
    window.Petal.store.loadState(stateToLoad);
    
    // GUARANTEE: Ensure registry is always initialized (defensive check)
    if (window.Petal.store.ensureRegistryInitialized) {
      window.Petal.store.ensureRegistryInitialized();
    }
    // Also ensure via FileManagement module if available
    if (window.Petal?.features?.fileManagement?.ensureRegistryInitialized) {
      window.Petal.features.fileManagement.ensureRegistryInitialized();
    }
    
    // Verify what's in the store after loading
    const storeState = window.Petal.store.getState();
    window.fileRegistry = storeState.fileRegistry || {};
    window.fileHistory = storeState.fileHistory || {};
    
    // Step 3: Test debug IPC to verify we're talking to the right main process
    if (window.electronAPI?.debugPid) {
      try {
        const debugInfo = await window.electronAPI.debugPid();
        console.log('🔍 debugPid result:', debugInfo);
      } catch (e) {
        console.error('❌ debugPid failed:', e);
      }
    }
    
    // Phase 3 Fix: Invariant logging after load (exact types)
    console.log('INVARIANT after load:', {
      projectsCount: storeState.projects?.length || 0,
      tasksCount: storeState.tasks?.length || 0,
      openProjectsType: storeState.openProjects instanceof Set ? 'Set' : Array.isArray(storeState.openProjects) ? 'Array' : typeof storeState.openProjects,
      openProjectsValue: storeState.openProjects instanceof Set ? Array.from(storeState.openProjects) : storeState.openProjects,
      openProjectsLength: Array.isArray(storeState.openProjects) ? storeState.openProjects.length : (storeState.openProjects?.size || 0)
    });
    
    // Render subscription is wired once in init.js (avoid double render)
    console.log('✓ Store loaded');
  } else {
    console.error('❌ ERROR: Store not available!', {
      hasPetal: !!window.Petal,
      hasStore: !!(window.Petal && window.Petal.store)
    });
  }
  
  // Keep global variables as sync proxies for backward compatibility (Step 2f)
  // Sync from store to globals (read-only - window globals are now getters)
  const loadedState = window.Petal?.store?.getState() || {};
  
  // NOTE: window.tasks, window.projects, etc. are now read-only getters
  // They automatically read from store, so no assignment needed
  
  console.log('✓ Globals synced from store:', {
    tasksCount: loadedState.tasks?.length || 0,
    projectsCount: loadedState.projects?.length || 0,
    windowTasksCount: window.tasks?.length,
    eventsCount: loadedState.events?.length || 0
  });
  
  // DEBUG: Verify data is actually there
  if ((loadedState.tasks?.length || 0) === 0 && (loadedState.projects?.length || 0) === 0) {
    console.error('❌ WARNING: No tasks or projects loaded! Check data file.');
  }

  // Run migrations
  migrateTasksForKanban();
  ensureCellLogSettings();
  ensureAppearanceSettings();
  initTheme(window.Petal?.store?.getState()?.settings || loadedData.settings);
  const subtasksMigrated = migrateSubtasksToTasks();
  
  // Normalize projects data
  if (window.Petal?.utils?.normalizeProjectsData) {
    window.Petal.utils.normalizeProjectsData();
  } else if (window.normalizeProjectsData) {
    window.normalizeProjectsData();
  }
  
  migrateNotesFields();
  const fileRegistryMigrated = migrateToCanonicalFileRegistry();
  
  // If migrations changed data, save it
  if (subtasksMigrated || fileRegistryMigrated) {
    // Phase 3: Use flush() for critical operations like migrations
    if (window.Petal?.persistence?.flush) {
      await window.Petal.persistence.flush();
    } else if (window.save) {
      await window.save(); // Fallback
    }
  }
  
  // Re-enable saves after migrations complete
  setLoading(false);
  
  // Phase 3 Fix: Only refresh dropdowns if store is ready and has data
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    if (state && state.projects) {
      refreshProjectSelects();
    }
  } else {
    // Fallback: refresh anyway (old behavior)
    refreshProjectSelects();
  }
  
  // Note: Event delegation is now set up when Today page renders
  
  // Get the final state after all migrations
  const finalState = window.Petal?.store?.getState() || loadedState;
  // Always load on today page initially
  const currentView = 'today';
  
  // Ensure currentView is set in both store and window
  if (window.Petal?.store) {
    window.Petal.store.setState({ currentView });
  }
  window.currentView = currentView;
  
  console.log('🔍 Initial render setup:', { currentView, hasStore: !!window.Petal?.store, hasSwitchView: !!window.switchView });
  
  // Render sidebar first (always render sidebar)
  if (typeof window.renderGlobalSidebar === 'function') {
    window.renderGlobalSidebar(finalState);
  } else {
    console.warn('⚠️ renderGlobalSidebar function not available');
  }
  
  // Switch to initial view (this will also render the view)
  if (window.switchView) {
    console.log('🔍 Switching to initial view:', currentView);
    window.switchView(currentView).catch(err => {
      console.error('❌ Error switching to initial view:', err);
      // Fallback: manually show the view
      const viewEl = document.getElementById(`view-${currentView}`);
      if (viewEl) {
        document.querySelectorAll('[id^="view-"]').forEach(el => {
          el.style.display = el.id === `view-${currentView}` ? 'block' : 'none';
        });
      }
      // Also call render as fallback
      if (typeof render === 'function') {
        render();
      }
    });
  } else {
    console.warn('⚠️ switchView not available, using fallback');
    // Fallback: manually show the view
    const viewEl = document.getElementById(`view-${currentView}`);
    if (viewEl) {
      document.querySelectorAll('[id^="view-"]').forEach(el => {
        el.style.display = el.id === `view-${currentView}` ? 'block' : 'none';
      });
    }
    // Also call render as fallback
    if (typeof render === 'function') {
      render();
    }
  }
}
