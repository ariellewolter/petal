// ═══════════════════════ SETTINGS PAGE ═══════════════════════
// Settings page with Import/Export and Vault management

import { esc } from '../utils/strings.js';
import { updateVaultBadge } from '../utils/vault.js';
import {
  THEME_OPTIONS,
  getThemePreference,
  getEffectiveTheme,
  setThemePreference
} from '../utils/theme.js';
import { buildImportStorePatch } from '../features/exportImport.js';
import { hasVaultStorage, isIOSApp, getNativeAPI } from '../platform/helpers.js';

/**
 * Render Settings page
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export async function renderSettingsPage(containerEl, state, handlers) {
  if (!containerEl) return;

  // Get vault info if in Electron
  let vaultPath = 'Not available (browser mode)';
  let vaultStatus = null;
  let vaultDetails = null;
  let dataPath = null;
  const nativeVault = hasVaultStorage();
  const onIPad = isIOSApp();
  const api = getNativeAPI();

  if (nativeVault && api) {
    try {
      vaultPath = (await api.getVaultPath()) || 'Not set';
    } catch (err) {
      console.error('Error getting vault path:', err);
      vaultPath = `Could not read vault path (${err.message || err})`;
    }
    try {
      const getDetails = api.getVaultDetails || api.vaultGetDetails;
      if (getDetails) {
        vaultDetails = await getDetails();
        if (vaultDetails?.activeVaultPath) {
          vaultPath = vaultDetails.activeVaultPath;
        }
      }
    } catch (err) {
      console.error('Error getting vault details:', err);
    }
    try {
      vaultStatus = await api.vaultGetStatus();
    } catch (err) {
      console.error('Error getting vault status:', err);
    }
    try {
      dataPath = await api.getDataPath();
    } catch (err) {
      console.error('Error getting data path:', err);
    }
  }

  const dataStats = vaultDetails?.dataStats;
  const otherDataVault = vaultDetails?.dataSourceWithContent;
  const dataSummary = dataStats
    ? `${dataStats.tasks} tasks, ${dataStats.projects} projects in this vault`
    : '';
  const otherDataSummary = otherDataVault
    ? `${otherDataVault.tasks} tasks, ${otherDataVault.projects} projects at:\n${otherDataVault.path}`
    : '';
  
  // Calculate settings stats
  const vaultReady = vaultStatus?.resolved === true;
  const vaultStatusText = vaultStatus
    ? (vaultReady ? 'ready' : (vaultStatus.lastError || 'not ready'))
    : 'unknown';

  const themePreference = getThemePreference(state.settings);
  const effectiveTheme = getEffectiveTheme(themePreference);
  const themeOptionsHtml = THEME_OPTIONS.map(opt => `
    <button type="button"
      class="theme-option${themePreference === opt.id ? ' active' : ''}"
      data-action="set-theme"
      data-theme-value="${opt.id}"
      aria-pressed="${themePreference === opt.id}">
      <span class="theme-option-label">${esc(opt.label)}</span>
      <span class="theme-option-desc">${esc(opt.desc)}</span>
      <span class="theme-option-swatch theme-option-swatch--${opt.id}" aria-hidden="true"></span>
    </button>
  `).join('');
  
  // Set content first
  containerEl.innerHTML = `
    <div class="settings-page">

      <!-- APPEARANCE -->
      <div class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>
        <p class="settings-section-desc">Choose light or dark mode, or match your system setting. Dark mode uses the magenta and violet palette from the Petal icon.</p>
        <div class="theme-picker" role="group" aria-label="Color theme">
          ${themeOptionsHtml}
        </div>
        <p class="settings-theme-active">Active: <strong>${esc(effectiveTheme === 'dark' ? 'Dark' : 'Light')}</strong>${themePreference === 'system' ? ' (from system)' : ''}</p>
      </div>

      <!-- VAULT SECTION -->
      <div class="settings-section">
        <h3 class="settings-section-title">Petal Vault</h3>
        <p class="settings-section-desc">Your data lives in a vault folder (petal.json). Changing location points the app at a different folder — use <strong>Copy data from another folder</strong> if you moved vaults and your tasks did not come along.</p>
        
        <div class="settings-vault-info">
          <div class="settings-vault-path">
            <label class="settings-label">Vault Location:</label>
            <div class="settings-vault-path-display">${esc(vaultPath)}</div>
          </div>
          
          ${nativeVault ? `
          <div class="settings-vault-actions">
            ${onIPad ? '' : '<button class="settings-btn" data-action="open-vault-folder">📁 Open Vault Folder</button>'}
            <button class="settings-btn" data-action="choose-vault-folder">📂 ${onIPad ? 'Choose iCloud Vault Folder' : 'Change Vault Location'}</button>
            ${onIPad ? '' : '<button class="settings-btn" data-action="copy-from-vault-folder">📋 Copy data from another folder</button>'}
            <button class="settings-btn" data-action="refresh-vault-status">🔄 Refresh Status</button>
          </div>
          ${onIPad ? `<p class="settings-section-desc" style="margin-top:10px;">For Mac sync: pick <strong>iCloud Drive → PetalVault</strong> (same folder as the Mac app).</p>` : ''}
          ` : `
          <div class="settings-info-box">
            <p>Vault management is only available in the desktop or iPad app.</p>
          </div>
          `}
        </div>

        ${vaultStatus ? `
        <div class="settings-vault-status">
          <div class="settings-status-item">
            <span class="settings-status-label">Status:</span>
            <span class="settings-status-value ${vaultReady ? 'status-ok' : 'status-warning'}">${esc(vaultStatusText)}</span>
          </div>
          ${dataPath ? `
          <div class="settings-status-item">
            <span class="settings-status-label">Data File:</span>
            <span class="settings-status-value">${esc(dataPath)}</span>
          </div>
          ` : ''}
          ${dataSummary ? `
          <div class="settings-status-item">
            <span class="settings-status-label">Data here:</span>
            <span class="settings-status-value ${dataStats?.hasData ? 'status-ok' : 'status-warning'}">${esc(dataSummary)}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
        ${otherDataVault ? `
        <div class="settings-info-box" style="margin-top:12px;border-color:var(--rose-soft);background:var(--rose-pale);">
          <p><strong>Data found in another vault folder.</strong> The active location may be empty or out of date.</p>
          <p style="font-size:12px;white-space:pre-wrap;margin-top:8px;">${esc(otherDataSummary)}</p>
          <p style="margin-top:8px;font-size:12px;">Use <strong>Copy data from another folder</strong> and select that path to load it here.</p>
        </div>
        ` : ''}
      </div>

      <!-- IMPORT/EXPORT SECTION -->
      <div class="settings-section">
        <h3 class="settings-section-title">Data Management</h3>
        <p class="settings-section-desc">Export your data for backup or import data from a previous export.</p>
        
        <div class="settings-import-export">
          <div class="settings-export">
            <h4 class="settings-subtitle">Export Data</h4>
            <p class="settings-subtitle-desc">Download all your tasks, projects, and settings as a JSON file.</p>
            <button class="settings-btn settings-btn-primary" data-action="export-data">📥 Export Data</button>
          </div>
          
          <div class="settings-import">
            <h4 class="settings-subtitle">Import Data</h4>
            <p class="settings-subtitle-desc">Import data from a previously exported JSON file.</p>
            <div class="settings-import-controls">
              <input type="file" id="settings-import-input" accept=".json" style="display:none;">
              <button class="settings-btn" data-action="import-data">📤 Import Data</button>
            </div>
          </div>
          
          ${nativeVault && !onIPad ? `
          <div class="settings-recovery" style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border);">
            <h4 class="settings-subtitle">Recover Data</h4>
            <p class="settings-subtitle-desc">If you've lost data, restore from an automatic backup file.</p>
            <button class="settings-btn" data-action="recover-data" style="background:var(--rose-soft);color:var(--rose);">🔧 Recover from Backup</button>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- ABOUT SECTION -->
      <div class="settings-section">
        <h3 class="settings-section-title">About</h3>
        <div class="settings-about">
          <p><strong>Petal</strong> — Task and project tracker</p>
          <p class="settings-version">Version information available in desktop app</p>
        </div>
      </div>
    </div>
  `;

  // Create or find header - must be first element (after innerHTML)
  let settingsHeader = containerEl.querySelector('.settings-header');
  if (!settingsHeader) {
    settingsHeader = document.createElement('header');
    settingsHeader.className = 'settings-header';
    // Insert at the very beginning of the container
    containerEl.insertBefore(settingsHeader, containerEl.firstChild);
  }
  
  // Render header
  settingsHeader.innerHTML = `
    <div class="settings-header-title">
      <span class="settings-header-name">Settings</span>
    </div>
    <div class="settings-header-right">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="settings-header-status">${nativeVault ? (vaultReady ? 'Vault ready' : 'Vault not ready') : 'Browser mode'}</span>
      </div>
    </div>
  `;

  window.Petal = window.Petal || {};
  window.Petal.pages = window.Petal.pages || {};
  window.Petal.pages.settings = {
    handleAction: (action, actionEl) =>
      handleSettingsAction(action, actionEl, containerEl, state, handlers, { nativeVault, onIPad, api, vaultPath })
  };

  // Handle file import
  const importInput = document.getElementById('settings-import-input');
  if (importInput) {
    importInput.onchange = async (event) => {
      await handleImport(event, state, handlers);
      // Re-render after import
      await renderSettingsPage(containerEl, state, handlers);
    };
  }
}

/**
 * Handle settings data-action clicks (via global delegation).
 */
export async function handleSettingsAction(action, actionEl, containerEl, state, handlers, ctx) {
  const { nativeVault, onIPad, api, vaultPath } = ctx;

  switch (action) {
    case 'set-theme': {
      const theme = actionEl.getAttribute('data-theme-value');
      if (theme) {
        setThemePreference(theme);
        await renderSettingsPage(containerEl, window.Petal?.store?.getState() || state, handlers);
      }
      break;
    }
    case 'export-data':
      await handleExport(state, handlers);
      break;
    case 'import-data':
      document.getElementById('settings-import-input')?.click();
      break;
    case 'open-vault-folder':
      if (nativeVault && api?.vaultOpenFolder && !onIPad) {
        try {
          await api.vaultOpenFolder(vaultPath);
        } catch (err) {
          alert('Error opening vault folder: ' + err.message);
        }
      }
      break;
    case 'choose-vault-folder':
      if (nativeVault && api) {
        try {
          const chooseResult = await api.vaultChoose();
          if (chooseResult?.canceled || chooseResult?.cancelled) break;
          if (chooseResult?.success) {
            const newPath = chooseResult.vaultPath || (await api.getVaultPath());
            await reloadStateAfterVaultChange(handlers);
            await updateVaultBadge();
            if (chooseResult.copiedFromPrevious) {
              alert(
                `Vault location updated and your data was copied.\n\n${newPath}\n\n` +
                  `Original vault (unchanged):\n${chooseResult.previousVaultPath}`
              );
            } else {
              alert(
                `Vault location updated.\n\n${newPath}\n\n` +
                  `Loaded data from this folder. If it looks empty, use "Copy data from another folder" to pull in your previous petal.json.`
              );
            }
            await renderSettingsPage(containerEl, state, handlers);
          } else {
            alert(
              'Could not change vault location' +
                (chooseResult?.error ? `:\n\n${chooseResult.error}` : '.')
            );
          }
        } catch (err) {
          alert('Error choosing vault folder: ' + err.message);
        }
      }
      break;
    case 'copy-from-vault-folder':
      if (nativeVault && api && !onIPad) {
        try {
          const copyVault = api.copyVaultFromFolder || api.vaultCopyFromFolder;
          if (!copyVault) {
            alert(
              'Copy vault is not available. Fully quit Petal (Cmd+Q) and reopen the app, then try again.'
            );
            break;
          }
          const copyResult = await copyVault();
          if (copyResult?.canceled) break;
          if (copyResult?.success) {
            await reloadStateAfterVaultChange(handlers);
            await updateVaultBadge();
            alert(
              `Data copied into your current vault.\n\n${copyResult.vaultPath}\n\nFrom:\n${copyResult.sourcePath}`
            );
            await renderSettingsPage(containerEl, state, handlers);
          } else {
            alert(
              'Could not copy vault data' +
                (copyResult?.error ? `:\n\n${copyResult.error}` : '.')
            );
          }
        } catch (err) {
          alert('Error copying vault data: ' + err.message);
        }
      }
      break;
    case 'refresh-vault-status':
      if (nativeVault) {
        await renderSettingsPage(containerEl, state, handlers);
      }
      break;
    case 'recover-data':
      if (nativeVault && !onIPad && window.recoverData) {
        await window.recoverData();
        await renderSettingsPage(containerEl, state, handlers);
      } else {
        alert('Recovery function not available. Please use the console: window.recoverData()');
      }
      break;
    default:
      return false;
  }
  return true;
}

/**
 * Reload app state from the active vault after the user changes vault location.
 */
async function reloadStateAfterVaultChange(handlers) {
  if (!window.storage?.loadState) return;

  const loadResult = await window.storage.loadState();
  if (loadResult?.ok === false) {
    throw new Error(loadResult.error || 'Failed to load data from vault');
  }

  const loadedData = loadResult?.data ?? loadResult;
  if (!loadedData || !window.Petal?.store) return;

  const store = window.Petal.store;
  const current = store.getState();
  store.loadState({
    ...loadedData,
    openProjects: Array.isArray(loadedData.openProjects)
      ? loadedData.openProjects
      : loadedData.openProjects instanceof Set
        ? Array.from(loadedData.openProjects)
        : [],
    prints3d: loadedData.prints3d || [],
    currentView: current.currentView,
    currentSort: current.currentSort,
    currentFilter: current.currentFilter,
    currentProjFilter: current.currentProjFilter,
    searchQuery: current.searchQuery,
    taskMode: current.taskMode,
    boardProjectFilter: current.boardProjectFilter,
    currentFileView: current.currentFileView,
    currentFileProjectFilter: current.currentFileProjectFilter,
    selectedProjectId: current.selectedProjectId,
    plannerViewDate: current.plannerViewDate,
    currentPlannerView: current.currentPlannerView,
    plannerWeekOffset: current.plannerWeekOffset,
    plannerCalYear: current.plannerCalYear,
    plannerCalMonth: current.plannerCalMonth
  });

  if (window.Petal?.utils?.initTheme) {
    window.Petal.utils.initTheme(loadedData.settings);
  }

  if (handlers?.render) {
    await handlers.render();
  }
}

/**
 * Handle data export
 */
async function handleExport(state, handlers) {
  try {
    // Access storage - use window.storage (same as used elsewhere in app)
    if (!window.storage || !window.storage.exportState) {
      alert('Export functionality not available');
      return;
    }

    const exportPayload = window.Petal?.store?.exportState
      ? window.Petal.store.exportState()
      : state;

    const data = window.storage.exportState(exportPayload);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petal-tasks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Data exported successfully!');
  } catch (err) {
    alert('Export failed: ' + err.message);
    console.error('Export error:', err);
  }
}

/**
 * Handle data import
 */
async function handleImport(event, state, handlers) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // Access storage - use window.storage (same as used elsewhere in app)
      if (!window.storage || !window.storage.importState) {
        alert('Import functionality not available');
        return;
      }

      const shouldMerge = confirm('Merge with existing data? (Cancel to replace)');
      const newState = await window.storage.importState(e.target.result, shouldMerge);

      if (window.Petal?.store) {
        window.Petal.store.setState(buildImportStorePatch(newState, { allowFilesOverwrite: !shouldMerge }));
        if (newState.currentView) {
          window.currentView = newState.currentView;
        }
      }

      // Save and render
      if (handlers?.save) {
        await handlers.save();
      }
      if (handlers?.render) {
        await handlers.render();
      }

      alert('Data imported successfully!');
    } catch (err) {
      alert('Import failed: ' + err.message);
      console.error('Import error:', err);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset input
}

/**
 * Fallback function to render settings page directly (simpler version with inline handlers)
 * Used when the full module isn't available
 */
export async function renderSettingsFallback(containerEl, state) {
  if (!containerEl) return;

  const handlers = window.Petal?.handlers;
  if (typeof window.electronAPI !== 'undefined') {
    return renderSettingsPage(containerEl, state, handlers);
  }

  const isElectron = false;
  let vaultPath = 'Not available (browser mode)';
  
  if (isElectron) {
    try {
      vaultPath = await window.electronAPI.getVaultPath() || 'Not set';
    } catch (err) {
      console.error('Error getting vault path:', err);
      vaultPath = 'Error loading path';
    }
  }
  
  // Escape vaultPath for safe HTML insertion
  const safeVaultPath = esc(vaultPath || 'Not available');
  
  containerEl.innerHTML = `
    <div class="settings-page">
      <h2 class="settings-page-title">Settings</h2>

      <!-- VAULT SECTION -->
      <div class="settings-section">
        <h3 class="settings-section-title">Petal Vault</h3>
        <p class="settings-section-desc">Your data is stored in a vault folder that syncs via iCloud Drive (Mac) or OneDrive (Windows).</p>
        
        <div class="settings-vault-info">
          <div class="settings-vault-path">
            <label class="settings-label">Vault Location:</label>
            <div class="settings-vault-path-display">${safeVaultPath}</div>
          </div>
          
          ${isElectron ? `
          <div class="settings-vault-actions">
            <button class="settings-btn" data-action="open-vault-folder">📁 Open Vault Folder</button>
            <button class="settings-btn" data-action="choose-vault-folder">📂 Change Vault Location</button>
          </div>
          ` : `
          <div class="settings-info-box">
            <p>Vault management is only available in the desktop app. Open this app in Electron to manage your vault.</p>
          </div>
          `}
        </div>
      </div>

      <!-- IMPORT/EXPORT SECTION -->
      <div class="settings-section">
        <h3 class="settings-section-title">Data Management</h3>
        <p class="settings-section-desc">Export your data for backup or import data from a previous export.</p>
        
        <div class="settings-import-export">
          <div class="settings-export">
            <h4 class="settings-subtitle">Export Data</h4>
            <p class="settings-subtitle-desc">Download all your tasks, projects, and settings as a JSON file.</p>
            <button type="button" class="settings-btn settings-btn-primary" data-action="export-data">📥 Export Data</button>
          </div>
          
          <div class="settings-import">
            <h4 class="settings-subtitle">Import Data</h4>
            <p class="settings-subtitle-desc">Import data from a previously exported JSON file.</p>
            <div class="settings-import-controls">
              <input type="file" id="settings-import-input" accept=".json" style="display:none;">
              <button type="button" class="settings-btn" data-action="import-data">📤 Import Data</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ABOUT SECTION -->
      <div class="settings-section">
        <h3 class="settings-section-title">About</h3>
        <div class="settings-about">
          <p><strong>Petal</strong> — Task and project tracker</p>
          <p class="settings-version">Version information available in desktop app</p>
        </div>
      </div>
    </div>
  `;
  window.Petal = window.Petal || {};
  window.Petal.pages = window.Petal.pages || {};
  window.Petal.pages.settings = {
    handleAction: (action, actionEl) =>
      handleSettingsAction(action, actionEl, containerEl, state, handlers, { isElectron: false, vaultPath: '' })
  };

  const importInput = document.getElementById('settings-import-input');
  if (importInput) {
    importInput.onchange = async (event) => {
      await handleImport(event, state, handlers);
      await renderSettingsFallback(containerEl, window.Petal?.store?.getState() || state);
    };
  }

  console.log('🔍 DEBUG: Settings page fallback rendered, innerHTML length:', containerEl.innerHTML.length);
  containerEl.style.display = '';
  containerEl.style.visibility = 'visible';
  containerEl.style.opacity = '1';
}
