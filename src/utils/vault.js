// ═══════════════════════ VAULT UTILITIES ═══════════════════════
// Vault-related utility functions for Electron app

/**
 * Update the vault badge in the UI
 */
export async function updateVaultBadge() {
  if (typeof window === 'undefined' || !window.electronAPI) return;
  
  const el = document.getElementById("vaultBadge");
  if (!el) return;
  
  try {
    const s = await window.electronAPI.vaultGetStatus();
    if (s?.resolved && s?.activeVaultPath) {
      // Show shortened path (just folder name)
      const pathParts = s.activeVaultPath.split(/[/\\]/);
      const displayName = pathParts[pathParts.length - 1] || 'Vault';
      el.textContent = displayName;
      el.title = `Vault: ${s.activeVaultPath}\nClick to open folder`;
      el.dataset.status = "ok";
      el.style.display = "inline-flex";
      
      // Add click handler to open folder
      el.onclick = async () => {
        if (s.activeVaultPath) {
          await window.electronAPI.vaultOpenFolder(s.activeVaultPath);
        }
      };
    } else {
      el.textContent = "Vault: Not resolved";
      el.title = "Vault not resolved";
      el.dataset.status = "bad";
      el.style.display = "inline-flex";
      el.onclick = null;
    }
  } catch (e) {
    console.error("Error updating vault badge:", e);
    el.textContent = "Vault: Error";
    el.dataset.status = "bad";
    el.style.display = "inline-flex";
  }
}

/**
 * Wait for vault to be resolved (polling)
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} Vault resolution data
 */
export async function waitForVaultResolved(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await window.electronAPI.vaultGetStatus();
    // Check resolved flag first, then fallback to activeVaultPath
    if (status?.resolved && status?.activeVaultPath) {
      return {
        resolved: true,
        vaultPath: status.activeVaultPath,
        vaultId: status.vaultId,
        source: 'polling'
      };
    }
    // Also check backward compatibility shape
    if (status?.initialized && status?.activeVault && status?.activeVault?.is_valid && status?.activeVault?.path) {
      return {
        resolved: true,
        vaultPath: status.activeVault.path,
        manifest: status.activeVault.manifest,
        source: 'polling'
      };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error("Vault did not resolve in time");
}

/**
 * Verify save location and log status
 */
export async function verifySaveLocation() {
  if (!window.electronAPI) {
    console.log('Running in browser - data saved to localStorage');
    console.log('Tasks:', localStorage.getItem('petal-tasks') ? 'Found' : 'Not found');
    console.log('Projects:', localStorage.getItem('petal-projects') ? 'Found' : 'Not found');
    return;
  }
  
  try {
    const vaultPath = await window.electronAPI.getVaultPath();
    const dataPath = await window.electronAPI.getDataPath();
    const vaultCheck = await window.electronAPI.checkVaultExists();
    
    // Phase 3 Fix: One-line vault status (reduces noise, keeps confirmation)
    if (vaultCheck.dataFileExists) {
      // Try to read and show file info
      try {
        const data = await window.electronAPI.loadState();
        const state = data.data || data;
        const displayPath = vaultPath.replace(/\\/g, '/').split('/').slice(-2).join('/');
        console.log(`✓ Vault ready: ${displayPath} (petal.json: exists, tasks: ${state.tasks?.length || 0}, projects: ${state.projects?.length || 0})`);
      } catch (e) {
        console.warn('⚠️ Could not read data file:', e);
      }
    } else {
      const displayPath = vaultPath.replace(/\\/g, '/').split('/').slice(-2).join('/');
      console.log(`✓ Vault ready: ${displayPath} (petal.json: missing)`);
    }
  } catch (e) {
    console.error('Error verifying save location:', e);
  }
}

/**
 * Update file button text and hints based on Electron API availability
 */
export function updateFileButtons() {
  const hasElectron = window.electronAPI && window.electronAPI.chooseFile;
  
  // Update task file button
  const taskBtn = document.getElementById('btn-add-file-task');
  const taskHint = document.getElementById('file-hint-task');
  if (taskBtn) {
    taskBtn.textContent = hasElectron ? '＋ Choose file' : '＋ Attach a file link';
  }
  if (taskHint) {
    taskHint.style.display = hasElectron ? 'block' : 'none';
  }
  
  // Update project file button
  const projBtn = document.getElementById('btn-add-file-project');
  const projHint = document.getElementById('file-hint-project');
  if (projBtn) {
    projBtn.textContent = hasElectron ? '＋ Choose file' : '＋ Attach a file link';
  }
  if (projHint) {
    projHint.style.display = hasElectron ? 'block' : 'none';
  }
}

// Expose globally for backward compatibility
window.updateVaultBadge = updateVaultBadge;
window.waitForVaultResolved = waitForVaultResolved;
window.verifySaveLocation = verifySaveLocation;
window.updateFileButtons = updateFileButtons;
