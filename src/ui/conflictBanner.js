// ═══════════════════════ CONFLICT BANNER ═══════════════════════
// UI for displaying data sync conflicts

/**
 * Show conflict banner when data conflicts are detected
 * @param {Array} conflicts - Array of conflict file paths
 * @param {Array} newerConflicts - Array of newer conflict file paths
 */
export function showConflictBanner(conflicts, newerConflicts) {
  const safeConflicts = Array.isArray(conflicts) ? conflicts : [];
  const safeNewerConflicts = Array.isArray(newerConflicts) ? newerConflicts : [];

  // Store conflicts globally (should be moved to store eventually)
  window.currentConflicts = safeConflicts;

  const { banner, details, actions } = ensureConflictBannerElements();
  const conflictCount = safeConflicts.length;
  const newerCount = safeNewerConflicts.length;
  
  let detailText = '';
  if (conflictCount === 1) {
    detailText = '1 conflict file found.';
  } else {
    detailText = `${conflictCount} conflict files found.`;
  }
  
  if (newerCount > 0) {
    if (newerCount === 1) {
      detailText += ' 1 file is newer than your local copy.';
    } else {
      detailText += ` ${newerCount} files are newer than your local copy.`;
    }
  }
  
  details.textContent = detailText;
  actions.innerHTML = '';

  const targetConflict = safeConflicts[0];
  if (targetConflict) {
    const keepLocalBtn = document.createElement('button');
    keepLocalBtn.className = 'btn btn-sm';
    keepLocalBtn.textContent = 'Keep Local';
    keepLocalBtn.onclick = () => resolveConflict('useMain', targetConflict);
    actions.appendChild(keepLocalBtn);

    const useRemoteBtn = document.createElement('button');
    useRemoteBtn.className = 'btn btn-sm';
    useRemoteBtn.textContent = 'Use Remote';
    useRemoteBtn.onclick = () => resolveConflict('useConflict', targetConflict);
    actions.appendChild(useRemoteBtn);

    const keepBothBtn = document.createElement('button');
    keepBothBtn.className = 'btn btn-sm';
    keepBothBtn.textContent = 'Keep Both';
    keepBothBtn.onclick = () => resolveConflict('keepBoth', targetConflict);
    actions.appendChild(keepBothBtn);
  }

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'btn btn-sm';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.onclick = hideConflictBanner;
  actions.appendChild(dismissBtn);

  banner.style.display = 'flex';
  
  // Scroll to top to show banner
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Hide conflict banner
 */
export function hideConflictBanner() {
  const banner = document.getElementById('conflict-banner');
  if (banner) {
    banner.style.display = 'none';
  }
  window.currentConflicts = null;
}

/**
 * Resolve a conflict by choosing an action
 * @param {string} action - 'useMain', 'useConflict', or 'keepBoth'
 * @param {string} filePath - Path to the conflict file
 */
export async function resolveConflict(action, filePath) {
  if (!window.electronAPI || !window.electronAPI.resolveConflict) {
    console.error('Electron API not available for conflict resolution');
    return;
  }
  
  try {
    const normalizedAction = normalizeConflictAction(action);
    const result = await window.electronAPI.resolveConflict(normalizedAction, filePath);
    if (result && result.success) {
      // Reload state after resolution
      if (window.storage && window.storage.loadState) {
        const loadResult = await window.storage.loadState();
        if (loadResult && loadResult.data) {
          const store = window.Petal?.store;
          if (store) {
            store.loadState(loadResult.data);
          }
        }
      }
      
      // Check if there are remaining conflicts
      if (window.currentConflicts && window.currentConflicts.length > 0) {
        const remaining = window.currentConflicts.filter(c => c !== filePath);
        if (remaining.length === 0) {
          hideConflictBanner();
        } else {
          window.currentConflicts = remaining;
        }
      } else {
        hideConflictBanner();
      }
      
      // Re-render
      if (window.render) {
        window.render();
      }
    } else {
      console.error('Conflict resolution failed:', result);
      alert('Failed to resolve conflict. Please try again.');
    }
  } catch (error) {
    console.error('Error resolving conflict:', error);
    alert('Error resolving conflict: ' + error.message);
  }
}

function normalizeConflictAction(action) {
  if (action === 'keep-local') return 'useMain';
  if (action === 'use-remote') return 'useConflict';
  if (action === 'merge') return 'keepBoth';
  return action;
}

function ensureConflictBannerElements() {
  let banner = document.getElementById('conflict-banner');
  let details = document.getElementById('conflict-details');
  let actions = document.getElementById('conflict-actions');

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'conflict-banner';
    banner.className = 'conflict-banner';
    banner.style.display = 'none';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;">
        <div>
          <strong>Sync conflict detected</strong>
          <div id="conflict-details" style="margin-top:4px;"></div>
        </div>
        <div id="conflict-actions" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
      </div>
    `;
    const parent = document.querySelector('.app-container') || document.body;
    parent.insertBefore(banner, parent.firstChild);
  }

  details = document.getElementById('conflict-details');
  actions = document.getElementById('conflict-actions');

  return { banner, details, actions };
}

// Expose globally for backward compatibility
window.showConflictBanner = showConflictBanner;
window.hideConflictBanner = hideConflictBanner;
window.resolveConflict = resolveConflict;
