// ═══════════════════════ RENDER FILES ═══════════════════════
// Pure rendering function for files view
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { fileIcon } from '../utils/strings.js';

/**
 * Render files view
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export async function renderFiles(containerEl, state, handlers) {
  const { fileRegistry, fileHistory, currentFileView, tasks, projects } = state;
  
  // Build registry using new module (if available)
  if (window.Petal?.features?.fileManagement?.buildFileRegistry) {
    window.Petal.features.fileManagement.buildFileRegistry();
  }
  
  const c = containerEl || document.getElementById('files-view-container');
  if (!c) {
    console.error('Files view container not found!');
    return;
  }
  
  // Get files from registry
  let files = Object.values(fileRegistry || {});
  
  // Filter by view
  if (currentFileView === 'active') {
    files = files.filter(f => {
      return (f.tasks || []).some(t => t.status === 'Doing' && !t.done) ||
             (f.projects || []).some(p => !p.done);
    });
  } else if (currentFileView === 'stale') {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    files = files.filter(f => {
      const lastMod = fileHistory?.[f.key]?.lastModified;
      if (!lastMod) return false;
      return lastMod < thirtyDaysAgo && 
             (f.tasks || []).some(t => !t.done && t.status === 'Doing');
    });
  } else if (currentFileView === 'submissions') {
    files = files.filter(f => f.submissionMeta || 
                               f.status === 'submitted' || 
                               f.status === 'accepted');
  }
  
  if (files.length === 0) {
    c.innerHTML = `<div class="empty-state" style="text-align:center;padding:60px 20px;">
      <div style="font-size:20px;margin-bottom:12px;color:var(--text);">No files yet</div>
      <small style="display:block;margin-bottom:24px;color:var(--text-dim);">Link files to tasks or projects, or add files directly</small>
      <button onclick="addFileToRegistry()" style="background:linear-gradient(135deg,#d4a0a0 0%,#c98b8b 100%) !important;border:none !important;border-radius:10px !important;color:white !important;font-size:14px !important;padding:12px 24px !important;cursor:pointer !important;display:block !important;margin:0 auto !important;box-shadow:0 4px 14px rgba(201,139,139,.25) !important;">+ Add Your First File</button>
    </div>`;
    return;
  }
  
  // Render file cards
  const fileHtmls = await Promise.all(files.map(async f => {
    return renderFileCard(f, fileHistory);
  }));
  
  // Update container (preserve buttons and filters)
  const fileListEl = c.querySelector('#files-list') || c;
  if (fileListEl) {
    fileListEl.innerHTML = fileHtmls.join('');
  } else {
    // Fallback: replace entire container
    c.innerHTML = fileHtmls.join('');
  }
}

/**
 * Render a single file card
 * @param {Object} file - File object from registry
 * @param {Object} fileHistory - File history object
 */
function renderFileCard(file, fileHistory) {
  const icon = fileIcon(file.abs_path || file.onedrive_rel || file.share_url || '');
  const label = file.label || file.name || 'File';
  
  // Get metadata
  const history = fileHistory?.[file.key] || {};
  const lastMod = history.lastModified ? new Date(history.lastModified) : null;
  const lastOpened = file.lastOpened ? new Date(file.lastOpened) : null;
  
  // Check for warnings
  const warnings = [];
  if ((file.tasks || []).some(t => t.done && lastMod && lastMod > new Date(t.done))) {
    warnings.push('Modified after task completed');
  }
  if (lastMod && (Date.now() - lastMod.getTime()) > (30 * 24 * 60 * 60 * 1000) && 
      (file.tasks || []).some(t => !t.done && t.status === 'Doing')) {
    warnings.push('Stale (not modified in 30+ days)');
  }
  
  // Check if outside vault
  const isOutsideVault = !file.isInOneDrive && file.abs_path;
  
  const tasksCount = (file.tasks || []).length;
  const projectsCount = (file.projects || []).length;
  
  return `<div class="file-card" data-file-key="${esc(file.key)}">
    <div class="file-card-header">
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        <span style="font-size:18px;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;color:var(--text);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(label)}</div>
          ${lastMod ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Modified: ${lastMod.toLocaleDateString()}</div>` : ''}
        </div>
      </div>
      ${warnings.length > 0 ? `<div style="color:var(--soon);font-size:12px;">⚠️ ${warnings.join(', ')}</div>` : ''}
      ${isOutsideVault ? `<div style="color:var(--text-dim);font-size:11px;">⚠️ Outside vault</div>` : ''}
    </div>
    <div class="file-card-meta" style="display:flex;gap:12px;margin-top:12px;font-size:11px;color:var(--text-dim);">
      ${tasksCount > 0 ? `<span>📋 ${tasksCount} task${tasksCount > 1 ? 's' : ''}</span>` : ''}
      ${projectsCount > 0 ? `<span>📁 ${projectsCount} project${projectsCount > 1 ? 's' : ''}</span>` : ''}
    </div>
    <div class="file-card-actions" style="margin-top:12px;display:flex;gap:8px;">
      <button onclick="openFile(${esc(JSON.stringify(file))})" class="btn-secondary" style="font-size:11px;padding:6px 12px;">Open</button>
      <button onclick="window.Petal?.features?.fileManagement?.showFileRelations('${esc(file.key)}')" class="btn-secondary" style="font-size:11px;padding:6px 12px;">Relations</button>
    </div>
  </div>`;
}
