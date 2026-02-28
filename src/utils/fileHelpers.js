// ═══════════════════════ FILE HELPER FUNCTIONS ═══════════════════════
// Helper functions for file operations

import { isIOS } from './deviceDetection.js';

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
  
  // iOS detection: iOS can't open file:// links, prefer share_url
  const iosDevice = isIOS();
  
  // Validate file existence before opening (updates last known locations)
  if (window.Petal?.features?.fileManagement?.validateFileExistence) {
    try {
      await window.Petal.features.fileManagement.validateFileExistence(fileLink, {
        fileHistory: window.Petal?.store?.getState()?.fileHistory,
        fileRegistry: window.Petal?.store?.getState()?.fileRegistry
      });
    } catch (e) {
      console.error('Error validating file existence:', e);
      // Continue with open attempt even if validation fails
    }
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
    // Browser mode (not Electron)
    if (iosDevice) {
      // iOS: Can't use file:// links, must use share_url or show message
      if (fileLink.share_url) {
        window.open(fileLink.share_url, '_blank');
      } else if (fileLink.onedrive_rel) {
        // Try to construct a OneDrive web URL (if possible)
        const message = `iOS devices can't open local files directly.\n\n` +
          `File: ${fileLink.label || fileLink.onedrive_rel || 'Unknown'}\n\n` +
          `Please use the OneDrive web interface or add a share link to this file.`;
        alert(message);
      } else {
        const message = `iOS devices can't open local files directly.\n\n` +
          `File: ${fileLink.label || fileLink.abs_path || 'Unknown'}\n\n` +
          `Please add a share URL (OneDrive, iCloud, etc.) to open this file on iOS.`;
        alert(message);
      }
    } else {
      // Non-iOS browser: try share_url first, then abs_path
      const url = fileLink.share_url || fileLink.abs_path;
      if (url) {
        // Don't try to open file:// URLs in browser (they won't work)
        if (url.startsWith('file://')) {
          console.warn('Cannot open file:// URL in browser:', url);
          if (fileLink.share_url) {
            window.open(fileLink.share_url, '_blank');
          } else {
            alert('Cannot open local file in browser. Please use the desktop app or add a share URL.');
          }
        } else {
          window.open(url, '_blank');
        }
      }
    }
  }
}
