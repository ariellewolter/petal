// ═══════════════════════ SETTINGS PAGE ═══════════════════════
// Settings page with Import/Export and Vault management

import { esc } from '../utils/strings.js';
import { updateVaultBadge } from '../utils/vault.js';

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
  const isElectron = typeof window.electronAPI !== 'undefined';

  if (isElectron) {
    try {
      vaultPath = (await window.electronAPI.getVaultPath()) || 'Not set';
    } catch (err) {
      console.error('Error getting vault path:', err);
      vaultPath = `Could not read vault path (${err.message || err})`;
    }
    try {
      const getDetails =
        window.electronAPI.getVaultDetails || window.electronAPI.vaultGetDetails;
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
      vaultStatus = await window.electronAPI.vaultGetStatus();
    } catch (err) {
      console.error('Error getting vault status:', err);
    }
    try {
      dataPath = await window.electronAPI.getDataPath();
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
  
  // Set content first
  containerEl.innerHTML = `
    <div class="settings-page">

      <!-- VAULT SECTION -->
      <div class="settings-section">
        <h3 class="settings-section-title">Petal Vault</h3>
        <p class="settings-section-desc">Your data lives in a vault folder (petal.json). Changing location points the app at a different folder — use <strong>Copy data from another folder</strong> if you moved vaults and your tasks did not come along.</p>
        
        <div class="settings-vault-info">
          <div class="settings-vault-path">
            <label class="settings-label">Vault Location:</label>
            <div class="settings-vault-path-display">${esc(vaultPath)}</div>
          </div>
          
          ${isElectron ? `
          <div class="settings-vault-actions">
            <button class="settings-btn" data-action="open-vault-folder">📁 Open Vault Folder</button>
            <button class="settings-btn" data-action="choose-vault-folder">📂 Change Vault Location</button>
            <button class="settings-btn" data-action="copy-from-vault-folder">📋 Copy data from another folder</button>
            <button class="settings-btn" data-action="refresh-vault-status">🔄 Refresh Status</button>
          </div>
          ` : `
          <div class="settings-info-box">
            <p>Vault management is only available in the desktop app. Open this app in Electron to manage your vault.</p>
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
          
          ${isElectron ? `
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
        <span class="settings-header-status">${isElectron ? (vaultReady ? 'Vault ready' : 'Vault not ready') : 'Browser mode'}</span>
      </div>
    </div>
  `;

  // Event delegation
  containerEl.onclick = async (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.getAttribute('data-action');

    switch (action) {
      case 'export-data':
        await handleExport(state, handlers);
        break;
      case 'import-data':
        document.getElementById('settings-import-input')?.click();
        break;
      case 'open-vault-folder':
        if (isElectron) {
          try {
            await window.electronAPI.vaultOpenFolder(vaultPath);
          } catch (err) {
            alert('Error opening vault folder: ' + err.message);
          }
        }
        break;
      case 'choose-vault-folder':
        if (isElectron) {
          try {
            const chooseResult = await window.electronAPI.vaultChoose();
            if (chooseResult?.canceled) {
              break;
            }
            if (chooseResult?.success) {
              const newPath = chooseResult.vaultPath || await window.electronAPI.getVaultPath();
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
        if (isElectron) {
          try {
            const copyVault =
              window.electronAPI.copyVaultFromFolder ||
              window.electronAPI.vaultCopyFromFolder;
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
        if (isElectron) {
          await renderSettingsPage(containerEl, state, handlers);
        }
        break;
      case 'recover-data':
        if (isElectron && window.recoverData) {
          await window.recoverData();
          // Re-render after recovery attempt
          await renderSettingsPage(containerEl, state, handlers);
        } else {
          alert('Recovery function not available. Please use the console: window.recoverData()');
        }
        break;
    }
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

  const current = window.Petal.store.getState();
  window.Petal.store.setState({
    tasks: loadedData.tasks || [],
    projects: loadedData.projects || [],
    openProjects: Array.isArray(loadedData.openProjects)
      ? loadedData.openProjects
      : loadedData.openProjects instanceof Set
        ? Array.from(loadedData.openProjects)
        : [],
    settings: loadedData.settings || {},
    events: loadedData.events || [],
    recurringRules: loadedData.recurringRules || [],
    files: loadedData.files || [],
    habits: loadedData.habits || current.habits || [],
    routines: loadedData.routines || current.routines || [],
    prints3d: loadedData.prints3d || current.prints3d || []
  });

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

    const exportData = {
      tasks: state.tasks || [],
      projects: state.projects || [],
      openProjects: Array.from(state.openProjects || []),
      events: state.events || [],
      recurringRules: state.recurringRules || [],
      settings: state.settings || {},
      files: state.files || []
    };

    const data = window.storage.exportState(exportData);
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

      // Update store
      if (window.Petal?.store) {
        window.Petal.store.setState({
          tasks: newState.tasks || [],
          projects: newState.projects || [],
          openProjects: Array.isArray(newState.openProjects)
            ? newState.openProjects
            : newState.openProjects instanceof Set
              ? Array.from(newState.openProjects)
              : [],
          settings: newState.settings || {},
          events: newState.events || [],
          recurringRules: newState.recurringRules || [],
          files: newState.files || []
        });
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
            <button class="settings-btn settings-btn-primary" onclick="exportData()">📥 Export Data</button>
          </div>
          
          <div class="settings-import">
            <h4 class="settings-subtitle">Import Data</h4>
            <p class="settings-subtitle-desc">Import data from a previously exported JSON file.</p>
            <div class="settings-import-controls">
              <input type="file" id="settings-import-input" accept=".json" style="display:none;" onchange="importData(event)">
              <button class="settings-btn" onclick="document.getElementById('settings-import-input').click()">📤 Import Data</button>
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
  console.log('🔍 DEBUG: Settings page fallback rendered, innerHTML length:', containerEl.innerHTML.length);
  // Ensure the view is visible
  containerEl.style.display = '';
  containerEl.style.visibility = 'visible';
  containerEl.style.opacity = '1';
  console.log('🔍 DEBUG: Settings fallback - visibility set', {
    display: containerEl.style.display,
    computedDisplay: window.getComputedStyle(containerEl).display,
    offsetHeight: containerEl.offsetHeight
  });
}
