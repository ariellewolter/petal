// ═══════════════════════ SETTINGS PAGE ═══════════════════════
// Settings page with Import/Export and Vault management

import { esc } from '../utils/strings.js';

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
  let dataPath = null;
  const isElectron = typeof window.electronAPI !== 'undefined';

  if (isElectron) {
    try {
      vaultPath = await window.electronAPI.getVaultPath() || 'Not set';
      vaultStatus = await window.electronAPI.vaultGetStatus();
      dataPath = await window.electronAPI.getDataPath();
    } catch (err) {
      console.error('Error getting vault info:', err);
      vaultPath = 'Error loading path';
    }
  }
  
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
        <p class="settings-section-desc">Your data is stored in a vault folder that syncs via iCloud Drive (Mac) or OneDrive (Windows).</p>
        
        <div class="settings-vault-info">
          <div class="settings-vault-path">
            <label class="settings-label">Vault Location:</label>
            <div class="settings-vault-path-display">${esc(vaultPath)}</div>
          </div>
          
          ${isElectron ? `
          <div class="settings-vault-actions">
            <button class="settings-btn" data-action="open-vault-folder">📁 Open Vault Folder</button>
            <button class="settings-btn" data-action="choose-vault-folder">📂 Change Vault Location</button>
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
            if (chooseResult?.success) {
              alert('Vault location changed. Please restart the app for changes to take effect.');
              // Re-render to show new path
              await renderSettingsPage(containerEl, state, handlers);
            }
          } catch (err) {
            alert('Error choosing vault folder: ' + err.message);
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
          openProjects: new Set(newState.openProjects || []),
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
  
  const isElectron = typeof window.electronAPI !== 'undefined';
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
            <button class="settings-btn" onclick="if(window.electronAPI)window.electronAPI.vaultOpenFolder('${safeVaultPath.replace(/'/g, "\\'")}')">📁 Open Vault Folder</button>
            <button class="settings-btn" onclick="alert('Change vault location in desktop app')">📂 Change Vault Location</button>
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
