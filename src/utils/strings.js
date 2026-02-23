// ═══════════════════════ STRING UTILITIES ═══════════════════════

export function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fileIcon(fileLink) {
  // Handle both string (legacy) and object (new format)
  let path = '';
  if (typeof fileLink === 'string') {
    path = fileLink;
  } else if (fileLink) {
    path = fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '';
  }
  const ext = (path || '').split('.').pop().toLowerCase().split('?')[0].split('/')[0];
  const m = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📑', pptx: '📑', png: '🖼', jpg: '🖼', jpeg: '🖼',
    gif: '🖼', mp4: '🎬', mov: '🎬', mp3: '🎵', zip: '📦',
    txt: '📃', md: '📃', js: '💻', ts: '💻', py: '💻',
    html: '🌐', css: '🎨'
  };
  return m[ext] || '🔗';
}

export function escJsonForAttr(obj) {
  return JSON.stringify(obj).replace(/"/g, '&quot;');
}

export function escJsonForDataAttr(jsonObj) {
  const jsonStr = JSON.stringify(jsonObj);
  // For data attributes with single quotes, we only need to escape single quotes
  // HTML entities are not needed in data attributes - they're safe as-is
  return jsonStr.replace(/'/g, '&#39;');
}

/**
 * Escape a string for safe use in HTML attributes
 * Escapes quotes, apostrophes, and other attribute-sensitive characters
 */
export function escAttr(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape HTML entities using DOM API (more robust than regex)
 * Handles all HTML entities automatically, including edge cases
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Normalize priority value to standard format
 */
export function normalizePriorityValue(priority, fallback = 'medium') {
  const value = String(priority || '').toLowerCase().trim();
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return fallback;
}

/**
 * Get edit onclick handler string for a task
 */
export function getEditOnclick(task) {
  if (task.isSubtask) {
    return 'editSubtask(' + task.projectId + ',' + task.id + ')';
  } else {
    return 'editTask(' + task.id + ')';
  }
}

/**
 * Normalize due date input value
 */
export function normalizeDueInput(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return ''; // Allow blank to clear due date
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null; // Invalid format
}
