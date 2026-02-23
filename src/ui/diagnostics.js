// ═══════════════════════ DIAGNOSTICS UTILITIES ═══════════════════════
// Functions for diagnostics modal and system information

/**
 * Refresh diagnostics information
 */
export async function refreshDiagnostics() {
  const contentEl = document.getElementById('diagnostics-content');
  if (!contentEl) return;
  
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const diagnostics = await window.electronAPI.vaultGetDiagnostics();
      
      // Format diagnostics for display
      let output = '=== Petal Diagnostics ===\n\n';
      
      output += `App Version: ${diagnostics.app_version || 'Unknown'}\n`;
      output += `Platform: ${diagnostics.platform || 'Unknown'}\n\n`;
      
      output += `Config Path:\n  ${diagnostics.config_path || 'N/A'}\n\n`;
      output += `Log Path:\n  ${diagnostics.log_path || 'N/A'}\n\n`;
      
      if (diagnostics.active_vault) {
        output += `Active Vault:\n`;
        output += `  Path: ${diagnostics.active_vault.path || 'N/A'}\n`;
        output += `  Exists: ${diagnostics.active_vault.exists ? 'Yes' : 'No'}\n`;
        output += `  Valid: ${diagnostics.active_vault.is_valid ? 'Yes' : 'No'}\n`;
        
        if (diagnostics.active_vault.data_file) {
          const df = diagnostics.active_vault.data_file;
          output += `\n  Data File (petal.json):\n`;
          output += `    Path: ${df.path || 'N/A'}\n`;
          output += `    Exists: ${df.exists ? 'Yes' : 'No'}\n`;
          if (df.size !== undefined) {
            output += `    Size: ${df.size} bytes\n`;
          }
          if (df.last_modified) {
            output += `    Last Modified: ${df.last_modified}\n`;
          }
        }
        
        if (diagnostics.active_vault.backups && diagnostics.active_vault.backups.length > 0) {
          output += `\n  Backups:\n`;
          diagnostics.active_vault.backups.forEach((backup, idx) => {
            output += `    ${idx + 1}. ${backup.filename} (${backup.size || 'N/A'} bytes, ${backup.created || 'N/A'})\n`;
          });
        }
      }
      
      if (diagnostics.discovered_vaults && diagnostics.discovered_vaults.length > 0) {
        output += `\nDiscovered Vaults:\n`;
        diagnostics.discovered_vaults.forEach((vault, idx) => {
          output += `  ${idx + 1}. ${vault.path || 'N/A'} (${vault.is_valid ? 'Valid' : 'Invalid'})\n`;
        });
      }
      
      output += `\n=== Store State ===\n`;
      const store = window.Petal?.store;
      if (store) {
        const state = store.getState();
        output += `Tasks: ${(state.tasks || []).length}\n`;
        output += `Projects: ${(state.projects || []).length}\n`;
        output += `Events: ${(state.events || []).length}\n`;
        output += `Recurring Rules: ${(state.recurringRules || []).length}\n`;
      } else {
        output += `Store: Not available\n`;
      }
      
      contentEl.textContent = output;
    } catch (error) {
      contentEl.textContent = `Error loading diagnostics: ${error.message}`;
      console.error('Error refreshing diagnostics:', error);
    }
  } else {
    contentEl.textContent = 'Diagnostics only available in Electron app';
  }
}

/**
 * Copy diagnostics to clipboard
 */
export async function copyDiagnostics() {
  const contentEl = document.getElementById('diagnostics-content');
  if (!contentEl) return;
  
  try {
    await navigator.clipboard.writeText(contentEl.textContent);
    // Show feedback
    const btn = document.querySelector('[data-action="diagnostics:copy"]');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  } catch (error) {
    console.error('Error copying diagnostics:', error);
    alert('Failed to copy diagnostics to clipboard');
  }
}

/**
 * Open logs folder
 */
export async function openLogsFolder() {
  if (!window.electronAPI) {
    alert('This feature is only available in the desktop app');
    return;
  }
  
  try {
    const diagnostics = await window.electronAPI.vaultGetDiagnostics();
    if (diagnostics.log_path) {
      const result = await window.electronAPI.vaultOpenFolder(diagnostics.log_path);
      if (!result || !result.success) {
        alert('Error opening logs folder: ' + (result?.error || 'Unknown error'));
      }
    } else {
      alert('Log path not available');
    }
  } catch (error) {
    console.error('Error opening logs folder:', error);
    alert('Error opening logs folder: ' + error.message);
  }
}

/**
 * Open vault folder
 */
export async function openVaultFolder() {
  if (!window.electronAPI) {
    alert('This feature is only available in the desktop app');
    return;
  }
  
  try {
    const diagnostics = await window.electronAPI.vaultGetDiagnostics();
    if (diagnostics.active_vault && diagnostics.active_vault.path) {
      const result = await window.electronAPI.vaultOpenFolder(diagnostics.active_vault.path);
      if (!result || !result.success) {
        alert('Error opening vault folder: ' + (result?.error || 'Unknown error'));
      }
    } else {
      alert('Vault path not available');
    }
  } catch (error) {
    console.error('Error opening vault folder:', error);
    alert('Error opening vault folder: ' + error.message);
  }
}

// Expose globally for backward compatibility
window.refreshDiagnostics = refreshDiagnostics;
window.copyDiagnostics = copyDiagnostics;
window.openLogsFolder = openLogsFolder;
window.openVaultFolder = openVaultFolder;
