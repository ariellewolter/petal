// ═══════════════════════ CELL LOG PAGE ═══════════════════════
// Self-contained page module for Cell Log tab

import { esc, escAttr, escJsonForAttr } from '../utils/strings.js';

/**
 * Ensure cell log settings exist and are properly initialized
 */
function ensureCellLogSettings(settings) {
  if (!settings.cellLog || typeof settings.cellLog !== 'object') {
    settings.cellLog = {};
  }
  if (!Array.isArray(settings.cellLog.cellTypes)) {
    settings.cellLog.cellTypes = [];
  }
  if (!Array.isArray(settings.cellLog.mediaTypes)) {
    settings.cellLog.mediaTypes = [];
  }
  if (!Array.isArray(settings.cellLog.entries)) {
    settings.cellLog.entries = [];
  }
}

/**
 * Render the Cell Log page
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
function stableLegacyCellLogId(projectId, legacy, index) {
  if (legacy.id != null) return String(legacy.id);
  const fingerprint = [
    projectId,
    legacy.date || legacy.dayDone || '',
    legacy.line || legacy.cellType || '',
    legacy.passage ?? '',
    legacy.taskPerformed || '',
    legacy.notes || '',
    index
  ].join('|');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = ((hash << 5) - hash + fingerprint.charCodeAt(i)) | 0;
  }
  return `legacy_${projectId}_${Math.abs(hash).toString(36)}`;
}

/**
 * One-way sync: copy legacy project.cellLog[] into settings.cellLog.entries, then clear legacy arrays.
 */
function syncLegacyCellLogEntriesToGlobal(state) {
  if (!window.Petal?.store) return;
  const settings = state.settings || {};
  ensureCellLogSettings(settings);
  const entries = [...(settings.cellLog.entries || [])];
  const seen = new Set(entries.filter(e => e?.id != null).map(e => String(e.id)));

  let changed = false;
  let clearedLegacy = false;
  const projects = (state.projects || []).map(project => {
    if (!Array.isArray(project.cellLog) || project.cellLog.length === 0) {
      return project;
    }
    project.cellLog.forEach((legacy, index) => {
      const id = stableLegacyCellLogId(project.id, legacy, index);
      if (seen.has(id)) return;
      entries.push({
        id,
        projectId: project.id,
        dayDone: legacy.date || legacy.dayDone,
        cellType: legacy.line || legacy.cellType,
        passage: legacy.passage,
        seededDensity: legacy.seededDensity,
        location: legacy.location,
        taskPerformed: legacy.taskPerformed,
        notes: legacy.notes,
        isFrozen: legacy.isFrozen,
        vialsCount: legacy.vialsCount
      });
      seen.add(id);
      changed = true;
    });
    clearedLegacy = true;
    return { ...project, cellLog: [] };
  });

  if (changed || clearedLegacy) {
    window.Petal.store.setState({
      settings: {
        ...settings,
        cellLog: { ...settings.cellLog, entries }
      },
      projects
    });
  }
}

export async function renderCellLogPage(containerEl, state, handlers) {
  if (!containerEl) {
    console.error('❌ renderCellLogPage: containerEl is required');
    return;
  }

  syncLegacyCellLogEntriesToGlobal(state);
  if (window.Petal?.store) {
    state = window.Petal.store.getState();
  }

  // Create or find header - must be first element
  let cellLogHeader = containerEl.querySelector('.cell-log-header');
  if (!cellLogHeader) {
    cellLogHeader = document.createElement('header');
    cellLogHeader.className = 'cell-log-header';
    // Insert at the very beginning of the container, before any existing content
    const firstChild = containerEl.firstChild;
    if (firstChild && firstChild.nodeType === 1) { // Element node
      containerEl.insertBefore(cellLogHeader, firstChild);
    } else {
      containerEl.insertBefore(cellLogHeader, containerEl.firstChild);
    }
  }
  
  const settings = state.settings || {};
  const projects = state.projects || [];
  
  ensureCellLogSettings(settings);
  
  // Calculate cell log stats
  const entries = Array.isArray(settings?.cellLog?.entries) ? settings.cellLog.entries : [];
  const cellTypes = Array.isArray(settings?.cellLog?.cellTypes) ? settings.cellLog.cellTypes : [];
  
  // Render header
  cellLogHeader.innerHTML = `
    <div class="cell-log-header-title">
      <span class="cell-log-header-name">Cell Log</span>
    </div>
    <div class="cell-log-header-right">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="cell-log-header-status">${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'} · ${cellTypes.length} cell type${cellTypes.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `;

  const dateInput = document.getElementById('cell-log-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Refresh project select
  const cellLogProjectSelect = document.getElementById('cell-log-project-select');
  if (cellLogProjectSelect) {
    const selected = cellLogProjectSelect.value;
    cellLogProjectSelect.innerHTML = '<option value="">No project</option>' +
      projects.filter(p => !p.done).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    if (selected && projects.some((p) => String(p.id) === selected)) {
      cellLogProjectSelect.value = selected;
    }
  }

  const cellTypeSelect = document.getElementById('cell-log-cell-type-select');
  if (cellTypeSelect) {
    const current = cellTypeSelect.value;
    cellTypeSelect.innerHTML = '<option value="">Select a saved cell type</option>' +
      settings.cellLog.cellTypes.map(type => `<option value="${esc(type)}">${esc(type)}</option>`).join('');
    if (current && settings.cellLog.cellTypes.includes(current)) {
      cellTypeSelect.value = current;
    }
  }

  const mediaTypeSelect = document.getElementById('cell-log-media-type-select');
  if (mediaTypeSelect) {
    const current = mediaTypeSelect.value;
    mediaTypeSelect.innerHTML = '<option value="">Select a saved media type</option>' +
      settings.cellLog.mediaTypes.map(type => `<option value="${esc(type)}">${esc(type)}</option>`).join('');
    if (current && settings.cellLog.mediaTypes.includes(current)) {
      mediaTypeSelect.value = current;
    }
  }

  renderCellTypesList(settings);
  renderMediaTypesList(settings);
  
  // Get or initialize current tab selection
  if (typeof window.currentCellLogTab === 'undefined') {
    window.currentCellLogTab = 'all';
  }
  renderCellLogEntries(settings, projects, window.currentCellLogTab);
  
  // Update store if settings were modified
  if (window.Petal?.store && settings !== state.settings) {
    window.Petal.store.setState({ settings });
  }
}

/**
 * Set the active cell log tab
 */
export function setCellLogTab(cellType) {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  const settings = state.settings || {};
  const projects = state.projects || [];
  window.currentCellLogTab = cellType;
  renderCellLogEntries(settings, projects, cellType);
}

/**
 * Navigate to cell log and focus a specific entry (from Today dashboard, etc.)
 */
export async function openCellLogEntry(entryId, handlers) {
  if (!entryId) return;

  const state = window.Petal?.store?.getState();
  if (!state) return;

  const settings = state.settings || {};
  ensureCellLogSettings(settings);
  const entry = settings.cellLog.entries.find(e => String(e.id) === String(entryId));

  window.cellLogHighlightEntryId = String(entryId);
  if (entry?.cellType) {
    window.currentCellLogTab = entry.cellType;
  }

  const switchViewFn =
    handlers?.switchView || window.routerSwitchView || window.switchView;
  if (switchViewFn) {
    await switchViewFn('cell-log');
  }

  const containerEl = document.getElementById('view-cell-log');
  if (containerEl) {
    await renderCellLogPage(
      containerEl,
      window.Petal?.store?.getState() || state,
      handlers || window.Petal?.handlers
    );
  }

  requestAnimationFrame(() => highlightCellLogEntry(entryId));
}

function escapeSelectorId(value) {
  const s = String(value);
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(s);
  }
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function highlightCellLogEntry(entryId) {
  const el = document.querySelector(
    `[data-cell-log-entry-id="${escapeSelectorId(entryId)}"]`
  );
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('cell-log-entry-highlight');
  setTimeout(() => {
    el.classList.remove('cell-log-entry-highlight');
    if (String(window.cellLogHighlightEntryId) === String(entryId)) {
      window.cellLogHighlightEntryId = null;
    }
  }, 2500);
}

/**
 * Render cell types list
 */
function renderCellTypesList(settings) {
  ensureCellLogSettings(settings);
  const listEl = document.getElementById('cell-types-list');
  if (!listEl) return;

  if (settings.cellLog.cellTypes.length === 0) {
    listEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim);">No reusable cell types yet.</div>';
    return;
  }

  listEl.innerHTML = settings.cellLog.cellTypes.map(type => `
    <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--border);border-radius:999px;background:var(--bg2);font-size:11px;color:var(--text);">
      ${esc(type)}
      <button type="button" data-action="cell-log:remove-cell-type" data-cell-type="${escAttr(type)}" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px;line-height:1;padding:0;" title="Remove cell type">✕</button>
    </span>
  `).join('');
}

/**
 * Render media types list
 */
function renderMediaTypesList(settings) {
  ensureCellLogSettings(settings);
  const listEl = document.getElementById('media-types-list');
  if (!listEl) return;

  if (settings.cellLog.mediaTypes.length === 0) {
    listEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim);">No reusable media types yet.</div>';
    return;
  }

  listEl.innerHTML = settings.cellLog.mediaTypes.map(type => `
    <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--border);border-radius:999px;background:var(--bg2);font-size:11px;color:var(--text);">
      ${esc(type)}
      <button type="button" data-action="cell-log:remove-media-type" data-media-type="${escAttr(type)}" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px;line-height:1;padding:0;" title="Remove media type">✕</button>
    </span>
  `).join('');
}

/**
 * Toggle freeze fields visibility
 */
/** Alias for inline handlers (tasklist.html freeze checkbox). */
export function toggleFreeze() {
  toggleFreezeFields();
}

export function toggleFreezeFields() {
  const freezeCheckbox = document.getElementById('cell-log-freeze');
  const vialsField = document.getElementById('cell-log-vials-field');
  if (freezeCheckbox && vialsField) {
    vialsField.style.display = freezeCheckbox.checked ? 'block' : 'none';
  }
}

/**
 * Render cell log entries
 */
function renderCellLogEntries(settings, projects, selectedCellType = 'all') {
  ensureCellLogSettings(settings);
  const entriesEl = document.getElementById('cell-log-entries');
  const tabsEl = document.getElementById('cell-log-tabs');
  if (!entriesEl) return;

  // Get all entries
  const allEntries = [...settings.cellLog.entries];
  
  // Get cell types from reusable list (so tabs appear even if no entries yet)
  const reusableCellTypes = [...settings.cellLog.cellTypes].sort();
  
  // Also include any cell types from entries that aren't in the reusable list
  const entryCellTypes = [...new Set(allEntries.map(e => e.cellType).filter(Boolean))];
  const allCellTypes = [...new Set([...reusableCellTypes, ...entryCellTypes])].sort();
  
  // Render tabs
  if (tabsEl) {
    const tabs = ['all', ...allCellTypes];
    tabsEl.innerHTML = tabs.map(cellType => {
      const isActive = cellType === selectedCellType;
      const label = cellType === 'all' ? 'All' : esc(cellType);
      const count = cellType === 'all' ? allEntries.length : allEntries.filter(e => e.cellType === cellType).length;
      return `
        <button type="button" data-action="cell-log:set-tab" data-tab="${escAttr(cellType)}"
                style="background:${isActive ? 'var(--rose-pale)' : 'none'};
                       border:none;
                       border-radius:6px;
                       color:${isActive ? 'var(--rose)' : 'var(--text-dim)'};
                       font-size:11px;
                       padding:6px 12px;
                       cursor:pointer;
                       transition:all .15s;
                       font-family:'Jost',sans-serif;">
          ${label} (${count})
        </button>
      `;
    }).join('');
  }

  // Filter entries by selected cell type
  let entries = [...allEntries];
  if (selectedCellType !== 'all') {
    entries = entries.filter(e => e.cellType === selectedCellType);
  }

  // Sort entries
  entries.sort((a, b) => {
    const dateA = a.dayDone ? new Date(a.dayDone).getTime() : 0;
    const dateB = b.dayDone ? new Date(b.dayDone).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  if (entries.length === 0) {
    entriesEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:6px 0;">No entries yet.</div>';
    return;
  }

  entriesEl.innerHTML = entries.map(entry => {
    const project = entry.projectId ? projects.find(p => String(p.id) === String(entry.projectId)) : null;
    const day = entry.dayDone ? new Date(entry.dayDone + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown day';
    const wellsText = entry.wellCount !== '' && entry.wellCount !== null && entry.wellCount !== undefined ? `${entry.wellCount} wells` : 'Wells n/a';
    const passageText = entry.passage !== null && entry.passage !== undefined ? `P${entry.passage}` : '';
    const freezeText = entry.isFrozen && entry.vialsCount ? ` • Frozen: ${entry.vialsCount} vial${entry.vialsCount !== 1 ? 's' : ''}` : '';
    const highlightClass =
      window.cellLogHighlightEntryId &&
      String(window.cellLogHighlightEntryId) === String(entry.id)
        ? ' cell-log-entry-highlight'
        : '';
    return `
      <div class="cell-log-entry-card${highlightClass}" data-cell-log-entry-id="${escAttr(String(entry.id))}" style="padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <div style="font-size:12px;color:var(--text-dim);">${day}${project ? ` • ${esc(project.name)}` : ''}</div>
          <div style="display:flex;gap:8px;">
            <button type="button" data-action="cell-log:edit-entry" data-entry-id="${escAttr(String(entry.id))}" style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:12px;">Edit</button>
            <button type="button" data-action="cell-log:delete-entry" data-entry-id="${escAttr(String(entry.id))}" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px;">Delete</button>
          </div>
        </div>
        <div style="font-size:14px;color:var(--text);margin-top:4px;">${esc(entry.taskPerformed || 'No task description')}</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">
          <span style="margin-right:12px;">Cell type: ${esc(entry.cellType || 'n/a')}${passageText ? ` ${passageText}` : ''}</span>
          ${entry.mediaType ? `<span style="margin-right:12px;">Media: ${esc(entry.mediaType)}</span>` : ''}
          <span style="margin-right:12px;">Plate: ${esc(entry.plateType || 'n/a')}</span>
          <span>${esc(wellsText)}${freezeText}</span>
        </div>
        ${entry.notes ? `<div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${esc(entry.notes)}</div>` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Add a cell type
 */
export async function addCellType() {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  const settings = { ...state.settings };
  ensureCellLogSettings(settings);
  const input = document.getElementById('cell-type-input');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;

  const exists = settings.cellLog.cellTypes.some(type => type.toLowerCase() === value.toLowerCase());
  if (exists) {
    input.value = '';
    return;
  }

  settings.cellLog.cellTypes.push(value);
  settings.cellLog.cellTypes.sort((a, b) => a.localeCompare(b));
  input.value = '';
  
  // Update store
  if (window.Petal?.store) {
    window.Petal.store.setState({ settings });
  }
  
  // Re-render
  const containerEl = document.getElementById('view-cell-log');
  if (containerEl) {
    await renderCellLogPage(containerEl, window.Petal.store.getState(), window.Petal.handlers);
  }
}

/**
 * Remove a cell type
 */
export async function removeCellType(cellType) {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  const settings = { ...state.settings };
  ensureCellLogSettings(settings);
  settings.cellLog.cellTypes = settings.cellLog.cellTypes.filter(type => type !== cellType);
  
  // Update store
  if (window.Petal?.store) {
    window.Petal.store.setState({ settings });
  }
  
  // Re-render
  const containerEl = document.getElementById('view-cell-log');
  if (containerEl) {
    await renderCellLogPage(containerEl, window.Petal.store.getState(), window.Petal.handlers);
  }
}

/**
 * Add a media type
 */
export async function addMediaType() {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  const settings = { ...state.settings };
  ensureCellLogSettings(settings);
  const input = document.getElementById('media-type-input');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;

  const exists = settings.cellLog.mediaTypes.some(type => type.toLowerCase() === value.toLowerCase());
  if (exists) {
    input.value = '';
    return;
  }

  settings.cellLog.mediaTypes.push(value);
  settings.cellLog.mediaTypes.sort((a, b) => a.localeCompare(b));
  input.value = '';
  
  // Update store
  if (window.Petal?.store) {
    window.Petal.store.setState({ settings });
  }
  
  // Re-render
  const containerEl = document.getElementById('view-cell-log');
  if (containerEl) {
    await renderCellLogPage(containerEl, window.Petal.store.getState(), window.Petal.handlers);
  }
}

/**
 * Remove a media type
 */
export async function removeMediaType(mediaType) {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  const settings = { ...state.settings };
  ensureCellLogSettings(settings);
  settings.cellLog.mediaTypes = settings.cellLog.mediaTypes.filter(type => type !== mediaType);
  
  // Update store
  if (window.Petal?.store) {
    window.Petal.store.setState({ settings });
  }
  
  // Re-render
  const containerEl = document.getElementById('view-cell-log');
  if (containerEl) {
    await renderCellLogPage(containerEl, window.Petal.store.getState(), window.Petal.handlers);
  }
}

/**
 * Add or update a cell log entry
 */
export async function addCellLogEntry() {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  const settings = { ...state.settings };
  ensureCellLogSettings(settings);

  const editId = document.getElementById('cell-log-edit-id')?.value || '';
  const isEditing = !!editId;

  const dayDone = document.getElementById('cell-log-date')?.value || '';
  const taskPerformed = document.getElementById('cell-log-task')?.value.trim() || '';
  const selectedType = document.getElementById('cell-log-cell-type-select')?.value || '';
  const customType = document.getElementById('cell-log-cell-type-custom')?.value.trim() || '';
  const cellType = customType || selectedType;
  const passageValue = document.getElementById('cell-log-passage')?.value || '';
  const passage = passageValue === '' ? null : Number(passageValue);
  const selectedMediaType = document.getElementById('cell-log-media-type-select')?.value || '';
  const customMediaType = document.getElementById('cell-log-media-type-custom')?.value.trim() || '';
  const mediaType = customMediaType || selectedMediaType;
  const plateType = document.getElementById('cell-log-plate-type')?.value || '';
  const wellCountValue = document.getElementById('cell-log-well-count')?.value || '';
  const confluenceValue = document.getElementById('cell-log-confluence')?.value || '';
  const confluence = confluenceValue === '' ? null : Number(confluenceValue);
  const viabilityValue = document.getElementById('cell-log-viability')?.value || '';
  const viability = viabilityValue === '' ? null : Number(viabilityValue);
  const freezeCheckbox = document.getElementById('cell-log-freeze');
  const isFrozen = freezeCheckbox ? freezeCheckbox.checked : false;
  const vialsCountValue = document.getElementById('cell-log-vials-count')?.value || '';
  const vialsCount = isFrozen && vialsCountValue ? Number(vialsCountValue) : null;
  const projectId = document.getElementById('cell-log-project-select')?.value || '';
  const notes = document.getElementById('cell-log-notes')?.value.trim() || '';

  if (!dayDone) {
    alert('Please add the day this was done.');
    return;
  }
  if (!taskPerformed) {
    alert('Please add the task performed.');
    return;
  }

  if (cellType && !settings.cellLog.cellTypes.includes(cellType)) {
    settings.cellLog.cellTypes.push(cellType);
    settings.cellLog.cellTypes.sort((a, b) => a.localeCompare(b));
  }

  if (mediaType && !settings.cellLog.mediaTypes.includes(mediaType)) {
    settings.cellLog.mediaTypes.push(mediaType);
    settings.cellLog.mediaTypes.sort((a, b) => a.localeCompare(b));
  }

  if (isEditing) {
    // Update existing entry
    const entryIndex = settings.cellLog.entries.findIndex(e => String(e.id) === String(editId));
    if (entryIndex !== -1) {
      const existingEntry = settings.cellLog.entries[entryIndex];
      settings.cellLog.entries[entryIndex] = {
        ...existingEntry,
        dayDone,
        taskPerformed,
        cellType,
        passage,
        mediaType,
        plateType,
        wellCount: wellCountValue === '' ? '' : Number(wellCountValue),
        confluence,
        viability,
        isFrozen,
        vialsCount,
        projectId,
        notes
      };
    }
  } else {
    // Add new entry
    settings.cellLog.entries.push({
      id: Date.now(),
      createdAt: Date.now(),
      dayDone,
      taskPerformed,
      cellType,
      passage,
      mediaType,
      plateType,
      wellCount: wellCountValue === '' ? '' : Number(wellCountValue),
      confluence,
      viability,
      isFrozen,
      vialsCount,
      projectId,
      notes
    });
  }

  // Clear form (with null checks)
  const editIdEl = document.getElementById('cell-log-edit-id');
  if (editIdEl) editIdEl.value = '';
  
  const taskEl = document.getElementById('cell-log-task');
  if (taskEl) taskEl.value = '';
  
  const cellTypeSelectEl = document.getElementById('cell-log-cell-type-select');
  if (cellTypeSelectEl) cellTypeSelectEl.value = '';
  
  const cellTypeCustomEl = document.getElementById('cell-log-cell-type-custom');
  if (cellTypeCustomEl) cellTypeCustomEl.value = '';
  
  const passageEl = document.getElementById('cell-log-passage');
  if (passageEl) passageEl.value = '';
  
  const mediaTypeSelectEl = document.getElementById('cell-log-media-type-select');
  if (mediaTypeSelectEl) mediaTypeSelectEl.value = '';
  
  const mediaTypeCustomEl = document.getElementById('cell-log-media-type-custom');
  if (mediaTypeCustomEl) mediaTypeCustomEl.value = '';
  
  const plateTypeEl = document.getElementById('cell-log-plate-type');
  if (plateTypeEl) plateTypeEl.value = '';
  
  const wellCountEl = document.getElementById('cell-log-well-count');
  if (wellCountEl) wellCountEl.value = '';
  
  const confluenceEl = document.getElementById('cell-log-confluence');
  if (confluenceEl) confluenceEl.value = '';
  
  const viabilityEl = document.getElementById('cell-log-viability');
  if (viabilityEl) viabilityEl.value = '';
  
  const freezeEl = document.getElementById('cell-log-freeze');
  if (freezeEl) freezeEl.checked = false;
  
  const vialsCountEl = document.getElementById('cell-log-vials-count');
  if (vialsCountEl) vialsCountEl.value = '1';
  
  if (typeof toggleFreezeFields === 'function') {
    toggleFreezeFields();
  }
  
  const notesEl = document.getElementById('cell-log-notes');
  if (notesEl) notesEl.value = '';
  
  // Update button text and hide cancel button
  const submitBtn = document.getElementById('cell-log-submit-btn');
  const cancelBtn = document.getElementById('cell-log-cancel-btn');
  if (submitBtn) submitBtn.textContent = 'Add Cell Log Entry';
  if (cancelBtn) cancelBtn.style.display = 'none';

  // Update store
  if (window.Petal?.store) {
    window.Petal.store.setState({ settings });
  }
  
  // Re-render
  const containerEl = document.getElementById('view-cell-log');
  if (containerEl) {
    await renderCellLogPage(containerEl, window.Petal.store.getState(), window.Petal.handlers);
  }
}

/**
 * Edit a cell log entry
 */
export function editCellLogEntry(entryId) {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  const settings = state.settings || {};
  ensureCellLogSettings(settings);
  const entry = settings.cellLog.entries.find(e => String(e.id) === String(entryId));
  if (!entry) return;

  // Populate form with entry data
  document.getElementById('cell-log-edit-id').value = entry.id;
  document.getElementById('cell-log-date').value = entry.dayDone || '';
  document.getElementById('cell-log-task').value = entry.taskPerformed || '';
  
  // Handle cell type - check if it's in saved types or use custom
  if (entry.cellType) {
    if (settings.cellLog.cellTypes.includes(entry.cellType)) {
      document.getElementById('cell-log-cell-type-select').value = entry.cellType;
      document.getElementById('cell-log-cell-type-custom').value = '';
    } else {
      document.getElementById('cell-log-cell-type-select').value = '';
      document.getElementById('cell-log-cell-type-custom').value = entry.cellType;
    }
  }
  
  document.getElementById('cell-log-passage').value = entry.passage !== null && entry.passage !== undefined ? entry.passage : '';
  
  // Handle media type - check if it's in saved types or use custom
  if (entry.mediaType) {
    if (settings.cellLog.mediaTypes.includes(entry.mediaType)) {
      document.getElementById('cell-log-media-type-select').value = entry.mediaType;
      document.getElementById('cell-log-media-type-custom').value = '';
    } else {
      document.getElementById('cell-log-media-type-select').value = '';
      document.getElementById('cell-log-media-type-custom').value = entry.mediaType;
    }
  }
  
  document.getElementById('cell-log-plate-type').value = entry.plateType || '';
  document.getElementById('cell-log-well-count').value = entry.wellCount !== '' && entry.wellCount !== null && entry.wellCount !== undefined ? entry.wellCount : '';
  document.getElementById('cell-log-confluence').value = entry.confluence !== null && entry.confluence !== undefined ? entry.confluence : '';
  document.getElementById('cell-log-viability').value = entry.viability !== null && entry.viability !== undefined ? entry.viability : '';
  document.getElementById('cell-log-freeze').checked = entry.isFrozen || false;
  document.getElementById('cell-log-vials-count').value = entry.vialsCount || '1';
  toggleFreezeFields();
  document.getElementById('cell-log-project-select').value = entry.projectId || '';
  document.getElementById('cell-log-notes').value = entry.notes || '';
  
  // Update button text and show cancel button
  const submitBtn = document.getElementById('cell-log-submit-btn');
  const cancelBtn = document.getElementById('cell-log-cancel-btn');
  if (submitBtn) submitBtn.textContent = 'Update Entry';
  if (cancelBtn) cancelBtn.style.display = 'block';
  
  // Scroll to form
  document.getElementById('view-cell-log').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Alias for editCellLogEntry (for HTML onclick compatibility)
 */
export function editEntry(entryId) {
  return editCellLogEntry(entryId);
}

/**
 * Cancel editing a cell log entry
 */
export function cancelEditCellLogEntry() {
  // Clear form
  document.getElementById('cell-log-edit-id').value = '';
  document.getElementById('cell-log-task').value = '';
  document.getElementById('cell-log-cell-type-select').value = '';
  document.getElementById('cell-log-cell-type-custom').value = '';
  document.getElementById('cell-log-passage').value = '';
  document.getElementById('cell-log-media-type-select').value = '';
  document.getElementById('cell-log-media-type-custom').value = '';
  document.getElementById('cell-log-plate-type').value = '';
  document.getElementById('cell-log-well-count').value = '';
  document.getElementById('cell-log-confluence').value = '';
  document.getElementById('cell-log-viability').value = '';
  document.getElementById('cell-log-freeze').checked = false;
  document.getElementById('cell-log-vials-count').value = '1';
  toggleFreezeFields();
  document.getElementById('cell-log-notes').value = '';
  
  // Update button text and hide cancel button
  const submitBtn = document.getElementById('cell-log-submit-btn');
  const cancelBtn = document.getElementById('cell-log-cancel-btn');
  if (submitBtn) submitBtn.textContent = 'Add Cell Log Entry';
  if (cancelBtn) cancelBtn.style.display = 'none';
}

/**
 * Delete a cell log entry
 */
export async function deleteCellLogEntry(entryId) {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  const settings = { ...state.settings };
  ensureCellLogSettings(settings);
  settings.cellLog.entries = settings.cellLog.entries.filter(entry => String(entry.id) !== String(entryId));
  
  // Update store
  if (window.Petal?.store) {
    window.Petal.store.setState({ settings });
  }
  
  // Re-render
  const containerEl = document.getElementById('view-cell-log');
  if (containerEl) {
    await renderCellLogPage(containerEl, window.Petal.store.getState(), window.Petal.handlers);
  }
}

/** Alias for deleteCellLogEntry */
export async function deleteEntry(entryId) {
  return deleteCellLogEntry(entryId);
}

/** Alias for cancelEditCellLogEntry */
export function cancelEdit() {
  return cancelEditCellLogEntry();
}

/** Backward-compat aliases (legacy tasklist / delegation fallbacks) */
export function setTab(cellType) {
  return setCellLogTab(cellType);
}

export async function addEntry() {
  return addCellLogEntry();
}
