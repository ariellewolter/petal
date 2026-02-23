// ═══════════════════════ FILES PAGE ═══════════════════════
// Files view page with event delegation
// Replaces inline onclick handlers with delegated events

import { renderFiles } from '../ui/renderFiles.js';

let bound = false;

/**
 * Bind event handlers to the files container
 * Uses event delegation - only binds once
 */
function bind(container, features) {
  if (bound) return;
  bound = true;
  
  // Click delegation for all file actions
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    e.stopPropagation();
    
    // Handle different actions using data-action format
    const [namespace, actionName] = action.includes(':') ? action.split(':') : [null, action];
    
    switch (namespace) {
      case 'file':
        switch (actionName) {
          case 'add':
          case 'add-to-registry':
            if (features?.fileManagement?.addFileToRegistry) {
              features.fileManagement.addFileToRegistry();
            } else if (window.addFileToRegistry) {
              window.addFileToRegistry();
            }
            break;
            
          case 'open':
            const filePath = btn.dataset.path;
            if (filePath) {
              try {
                const fileLink = JSON.parse(filePath);
                // Use the openFile function from fileManagement (which is re-exported from fileHelpers)
                // This ensures consistent file opening behavior across the app
                const openFileFn = features?.fileManagement?.openFile || 
                                  window.Petal?.features?.fileManagement?.openFile ||
                                  window.openFile;
                
                if (openFileFn && typeof openFileFn === 'function') {
                  openFileFn(fileLink);
                } else {
                  console.error('❌ openFile function not available', {
                    hasFeatures: !!features,
                    hasFileManagement: !!features?.fileManagement,
                    hasOpenFile: !!features?.fileManagement?.openFile,
                    hasWindowPetal: !!window.Petal,
                    hasWindowOpenFile: !!window.openFile
                  });
                  // Last resort: try to import and use directly
                  import('../utils/fileHelpers.js').then(module => {
                    if (module.openFile) {
                      module.openFile(fileLink);
                    } else {
                      alert('Could not open file: openFile function not available');
                    }
                  }).catch(err => {
                    console.error('Failed to import fileHelpers:', err);
                    alert('Could not open file: ' + (err.message || 'Unknown error'));
                  });
                }
              } catch (e) {
                console.error('Error parsing file path:', e);
                alert('Error opening file: ' + (e.message || 'Invalid file data'));
              }
            }
            break;
            
          case 'show-relations':
            const fileKey = btn.dataset.fileKey;
            if (fileKey && features?.fileManagement?.showFileRelations) {
              features.fileManagement.showFileRelations(fileKey);
            } else if (fileKey && window.Petal?.features?.fileManagement?.showFileRelations) {
              window.Petal.features.fileManagement.showFileRelations(fileKey);
            }
            break;
            
          case 'notes':
          case 'open-notes':
            const fileId = btn.dataset.fileId;
            if (fileId && features?.fileManagement?.openFileNotesModal) {
              features.fileManagement.openFileNotesModal(fileId);
            } else if (fileId && window.openFileNotesModal) {
              window.openFileNotesModal(fileId);
            }
            break;
        }
        break;
        
      case 'view':
        // File view tabs: data-action="view:all", "view:active", etc.
        if (features?.handlers?.setFileView) {
          features.handlers.setFileView(actionName, btn);
        } else if (window.setFileView) {
          window.setFileView(actionName, btn);
        }
        break;
        
      default:
        // Fallback for legacy actions
        switch (action) {
          case 'add-file':
          case 'addFileToRegistry':
            if (window.addFileToRegistry) {
              window.addFileToRegistry();
            }
            break;
        }
    }
  });
  
  // Handle project filter change
  const projectFilter = container.querySelector('#file-project-filter') || container.querySelector('[data-file-project-filter]');
  if (projectFilter && !projectFilter.dataset.bound) {
    projectFilter.dataset.bound = 'true';
    projectFilter.addEventListener('change', (e) => {
      if (features?.handlers?.setFileProjectFilter) {
        features.handlers.setFileProjectFilter(e.target.value);
      } else if (window.setFileProjectFilter) {
        window.setFileProjectFilter(e.target.value);
      }
    });
  }
}

/**
 * Render Files page
 * @param {HTMLElement} container - Container element (#view-files)
 * @param {Object} state - Current app state
 * @param {Object} features - Features/handlers
 */
export async function renderFilesPage(container, state, features) {
  if (!container) {
    console.error('❌ renderFilesPage: Container not provided');
    return;
  }
  
  // Create or find header - must be first element
  let filesHeader = container.querySelector('.files-header');
  if (!filesHeader) {
    filesHeader = document.createElement('header');
    filesHeader.className = 'files-header';
    // Insert at the very beginning of the container, before any existing content
    const firstChild = container.firstChild;
    if (firstChild && firstChild.nodeType === 1) { // Element node
      container.insertBefore(filesHeader, firstChild);
    } else {
      container.insertBefore(filesHeader, container.firstChild);
    }
  }
  
  // Calculate files stats
  const files = Array.isArray(state.files) ? state.files : [];
  const fileRegistry = state.fileRegistry || {};
  const totalFiles = files.length || Object.keys(fileRegistry).length;
  
  // Render header
  filesHeader.innerHTML = `
    <div class="files-header-title">
      <span class="files-header-name">Files</span>
    </div>
    <div class="files-header-right">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="files-header-status">${totalFiles} file${totalFiles !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `;
  
  // Bind event handlers (only once)
  bind(container, features);
  
  // Render using existing renderFiles function
  // renderFiles now uses container-scoped selectors
  await renderFiles(container, state, features);
}

/**
 * Cleanup (optional - for when page is unmounted)
 */
export function cleanupFilesPage() {
  bound = false;
}
