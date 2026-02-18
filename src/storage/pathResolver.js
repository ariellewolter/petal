// ═══════════════════════ FILE PATH RESOLUTION ═══════════════════════
// Normalize and resolve file paths (OneDrive, absolute, share URLs)
// UI should never handle OS-specific path logic

/**
 * Normalize file link to standard format
 */
export function normalizeFileLink(fileLink) {
  if (typeof fileLink === 'string') {
    // Legacy string format - convert to object
    return {
      abs_path: fileLink,
      onedrive_rel: null,
      share_url: null
    };
  }
  
  // Ensure all path fields exist
  return {
    abs_path: fileLink.abs_path || null,
    onedrive_rel: fileLink.onedrive_rel || null,
    share_url: fileLink.share_url || null,
    label: fileLink.label || fileLink.name || 'File',
    name: fileLink.name || fileLink.label || 'File',
    ...fileLink // Preserve any other fields
  };
}

/**
 * Get file key for registry (prefer OneDrive relative, fallback to absolute)
 */
export function getFileKey(fileLink) {
  const normalized = normalizeFileLink(fileLink);
  return normalized.onedrive_rel || normalized.abs_path || normalized.share_url || JSON.stringify(fileLink);
}

/**
 * Resolve file link to absolute path (for opening)
 * In Electron, this would use path resolution
 * In browser, returns share_url or abs_path as-is
 */
export function resolveFileLink(fileLink) {
  const normalized = normalizeFileLink(fileLink);
  
  // Prefer absolute path if available
  if (normalized.abs_path) {
    return normalized.abs_path;
  }
  
  // Fallback to share URL
  if (normalized.share_url) {
    return normalized.share_url;
  }
  
  // Last resort: OneDrive relative (would need resolution in Electron)
  if (normalized.onedrive_rel) {
    return normalized.onedrive_rel;
  }
  
  return null;
}

/**
 * Store file link with preference for OneDrive relative path
 */
export function storeFileLink(fileLink, onedriveRelPath = null) {
  const normalized = normalizeFileLink(fileLink);
  
  // If we have a OneDrive relative path, prefer it
  if (onedriveRelPath) {
    return {
      ...normalized,
      onedrive_rel: onedriveRelPath,
      abs_path: normalized.abs_path || null
    };
  }
  
  return normalized;
}
