// ═══════════════════════ FILE HELPER FUNCTIONS ═══════════════════════
// Helper functions for file operations

/**
 * Open file (handles all path types)
 * @param {Object|string} fileLink - File link object or string path
 */
export async function openFile(fileLink) {
  if (!fileLink) return;
  
  // If it's a string (legacy format), convert to object
  if (typeof fileLink === 'string') {
    fileLink = { abs_path: fileLink };
  }
  
  if (window.electronAPI && window.electronAPI.resolveFilePath) {
    try {
      const resolved = await window.electronAPI.resolveFilePath(fileLink);
      
      if (resolved.success) {
        if (resolved.openInBrowser) {
          // Open share URL in browser
          window.open(resolved.path, '_blank');
        } else {
          // Open local file
          try {
            console.log('🖱️ renderer calling openFile', resolved.path, window.electronAPI);
            const result = await window.electronAPI.openFile(resolved.path);
            if (result && result.success === false) {
              console.error('Failed to open file:', result.error);
              // Fallback to share_url if available
              if (fileLink.share_url) {
                window.open(fileLink.share_url, '_blank');
              } else {
                alert('Could not open file: ' + (result.error || 'Unknown error'));
              }
            }
          } catch (openError) {
            console.error('Error calling openFile:', openError);
            // Fallback to share_url if available
            if (fileLink.share_url) {
              window.open(fileLink.share_url, '_blank');
            } else {
              alert('Could not open file: ' + (openError.message || 'Unknown error'));
            }
          }
        }
      } else {
        // Fallback: try share_url or show error
        if (fileLink.share_url) {
          window.open(fileLink.share_url, '_blank');
        } else {
          alert('Could not open file: ' + (resolved.error || 'File not found'));
        }
      }
    } catch (e) {
      console.error('Error opening file:', e);
      // Fallback to share_url if available
      if (fileLink.share_url) {
        window.open(fileLink.share_url, '_blank');
      }
    }
  } else {
    // Browser: use share_url or abs_path
    const url = fileLink.share_url || fileLink.abs_path;
    if (url) {
      window.open(url, '_blank');
    }
  }
}
