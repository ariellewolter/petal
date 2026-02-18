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
