// ═══════════════════════ FILE OPERATIONS ═══════════════════════
// UI-level file operations (file rows, URL normalization, etc.)

import { esc } from '../utils/strings.js';

/**
 * Add a file row to a container (for file input forms)
 */
export async function addFileRow(containerId, prefix, subtaskProjId, subtaskId) {
  const c = document.getElementById(containerId);
  if (!c) {
    console.error('Container not found:', containerId);
    alert('Error: Could not find file container. Please refresh the page.');
    return;
  }
  
  const id = Date.now();
  const row = document.createElement('div');
  row.className  = 'file-link-row';
  row.dataset.id = id;
  
  // Use file picker if in Electron, otherwise manual input
  if (!window.electronAPI) {
    console.warn('window.electronAPI is not available');
  } else if (!window.electronAPI.chooseFile) {
    console.warn('window.electronAPI.chooseFile is not available');
  }
  
  if (window.electronAPI && window.electronAPI.chooseFile) {
    try {
      console.log('Opening file picker for container:', containerId);
      console.log('Electron API available:', !!window.electronAPI);
      const fileLink = await window.electronAPI.chooseFile();
      console.log('File picker result:', fileLink);
      if (fileLink) {
        row.innerHTML = `
          <input type="text" placeholder="Label" id="${prefix}fn-${id}" value="${esc(fileLink.label)}">
          <input type="text" placeholder="File path" id="${prefix}fu-${id}" value="${esc(fileLink.abs_path || '')}" readonly style="background:var(--bg2);">
          <input type="hidden" id="${prefix}fl-${id}" value="${esc(JSON.stringify(fileLink))}">
          <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>`;
        c.appendChild(row);
        return;
      }
      // User cancelled file picker - don't add row
      console.log('File picker was cancelled');
      return;
    } catch (e) {
      console.error('File picker error:', e);
      alert('Could not open file picker: ' + e.message);
      // Don't fall back to manual input - let user try again
      return;
    }
  } else {
    console.log('Electron API not available, using manual input');
  }
  
  // Fallback: manual input (only if not in Electron)
  row.innerHTML = `
    <input type="text" placeholder="Label" id="${prefix}fn-${id}">
    <input type="url"  placeholder="URL or file path" id="${prefix}fu-${id}">
    <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>`;
  c.appendChild(row);
}

/**
 * Normalize file URL to use relative path if in vault attachments
 */
export async function normalizeFileUrl(url) {
  if (!url || !window.electronAPI) return url;
  
  try {
    const vaultPath = await window.electronAPI.getVaultPath();
    if (!vaultPath) return url;
    
    // Convert to absolute path if it's a file:// URL
    let absPath = url;
    if (url.startsWith('file://')) {
      absPath = decodeURIComponent(url.replace(/^file:\/\//, ''));
    }
    
    // Normalize path separators
    const normalizedVault = vaultPath.replace(/\\/g, '/');
    const normalizedAbs = absPath.replace(/\\/g, '/');
    
    // Check if file is in vault attachments folder
    const attachmentsPath = normalizedVault + '/attachments';
    if (normalizedAbs.toLowerCase().startsWith(attachmentsPath.toLowerCase())) {
      // Use relative path: attachments/filename
      const relative = normalizedAbs.substring(attachmentsPath.length + 1);
      return 'attachments/' + relative;
    }
    
    return url;
  } catch (e) {
    console.warn('Error normalizing file URL:', e);
    return url;
  }
}

/**
 * Resolve relative path to absolute (for display/opening)
 */
export async function resolveFileUrl(url) {
  if (!url || !window.electronAPI) return url;
  
  // If it's already absolute or a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return url;
  }
  
  // Windows absolute path (C:\...)
  if (url.length > 2 && url[1] === ':' && (url[2] === '\\' || url[2] === '/')) {
    return url;
  }
  
  // If it's a relative path starting with attachments/
  if (url.startsWith('attachments/')) {
    try {
      const vaultPath = await window.electronAPI.getVaultPath();
      if (vaultPath) {
        const fileName = url.substring('attachments/'.length);
        const fullPath = vaultPath.replace(/\\/g, '/') + '/attachments/' + fileName;
        return 'file:///' + fullPath.replace(/\\/g, '/');
      }
    } catch (e) {
      console.warn('Error resolving file URL:', e);
    }
  }
  
  return url;
}

/**
 * Get file links from DOM container
 */
export function getFileLinks(containerId, prefix) {
  return [...(document.getElementById(containerId)?.querySelectorAll('.file-link-row')||[])].map(r=>{
    const id=r.dataset.id;
    const name = document.getElementById(prefix+'fn-'+id)?.value.trim();
    const urlInput = document.getElementById(prefix+'fu-'+id)?.value.trim();
    const linkDataInput = document.getElementById(prefix+'fl-'+id);
    
    // If we have stored link data (from file picker), use it
    if (linkDataInput && linkDataInput.value) {
      try {
        const linkData = JSON.parse(linkDataInput.value);
        return {
          id: linkData.id || Date.now() + Math.random(), // Ensure ID exists
          label: name || linkData.label,
          onedrive_rel: linkData.onedrive_rel,
          abs_path: linkData.abs_path,
          share_url: linkData.share_url,
          type: linkData.type,
          note: linkData.note || '', // Preserve existing note or default to empty
          noteUpdatedAt: linkData.noteUpdatedAt || '' // Preserve timestamp or default to empty
        };
      } catch (e) {
        console.warn('Error parsing link data:', e);
      }
    }
    
    // Fallback: simple name/url (legacy format)
    if (name && urlInput) {
      return {
        id: Date.now() + Math.random(), // Add ID
        label: name,
        abs_path: urlInput,
        // Try to detect if it's a URL vs path
        share_url: (urlInput.startsWith('http://') || urlInput.startsWith('https://')) ? urlInput : undefined,
        note: '', // Note field
        noteUpdatedAt: '' // Timestamp for note updates
      };
    }
    
    return null;
  }).filter(f=>f && (f.label || f.abs_path || f.onedrive_rel));
}

/**
 * Get file links (already in normalized format)
 */
export function getFileLinksNormalized(containerId, prefix) {
  return getFileLinks(containerId, prefix);
}
