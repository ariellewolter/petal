# Petal Mobile Application Guide

## Overview

Petal is fully compatible with iOS devices (iPhone and iPad) as a Progressive Web App (PWA). This guide covers setup, features, usage, and troubleshooting for mobile devices.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Features & Capabilities](#features--capabilities)
4. [Mobile-Specific Features](#mobile-specific-features)
5. [Limitations & Considerations](#limitations--considerations)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

- iOS device (iPhone or iPad) with Safari browser
- Computer running the app (for serving over HTTP)
- Both devices on the same Wi-Fi network

### 5-Minute Setup

1. **Start the server** on your computer:
   ```bash
   cd /path/to/task_tracker_app
   npx serve .
   ```

2. **Note the URL** shown (e.g., `http://192.168.1.100:3000`)

3. **Open Safari on your iPad/iPhone** and navigate to that URL

4. **Add to Home Screen**:
   - Tap Share button (□↑)
   - Tap "Add to Home Screen"
   - Tap "Add"

5. **Launch the app** from your Home Screen!

---

## Installation

### Method 1: Local Network (Recommended for Development)

**On Your Computer:**
```bash
# Option A: Using npx serve (easiest)
npx serve .

# Option B: Using Python
python3 -m http.server 8000

# Option C: Using Node.js http-server
npx http-server -p 3000
```

**On Your iPad/iPhone:**
1. Open Safari
2. Navigate to `http://YOUR_COMPUTER_IP:PORT`
   - Find your computer's IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
   - Example: `http://192.168.1.100:3000`
3. Add to Home Screen (see Quick Start)

### Method 2: Deployed Server (Production)

If you deploy the app to a web server (Netlify, Vercel, GitHub Pages, etc.):

1. Open Safari on your device
2. Navigate to your deployed URL
3. Add to Home Screen

**Note:** The app must be served over HTTPS (or localhost) for PWA features to work.

### Method 3: Using ngrok (For Testing)

If you need to test from a different network:

```bash
# Install ngrok: https://ngrok.com
ngrok http 3000
```

Use the ngrok URL on your iPad (works from any network).

---

## Features & Capabilities

### ✅ Fully Supported Features

- **All Core Functionality**
  - Create, edit, and delete tasks
  - Manage projects and subtasks
  - View and organize files
  - Calendar/planner view
  - Today view
  - Workflow matrix
  - Settings and preferences

- **Data Storage**
  - Uses localStorage (persists between sessions)
  - Export/Import functionality
  - Automatic saves

- **Offline Support**
  - Service worker caches assets
  - App works offline (view and edit data)
  - Syncs when connection restored

- **Responsive Design**
  - Optimized for iPhone and iPad
  - Portrait and landscape orientations
  - Touch-friendly interface

### 📱 Mobile-Optimized Features

- **Touch Gestures**
  - Swipe left to close sidebar
  - Swipe right from edge to open sidebar
  - Swipe down to dismiss modals
  - Long-press for context menus (future)

- **Touch-Friendly UI**
  - All buttons: 44x44px minimum (iOS HIG compliant)
  - Larger form inputs (48px height)
  - Touch-optimized cards and lists
  - Haptic feedback (where supported)

- **Mobile Navigation**
  - Hamburger menu button
  - Sidebar drawer (slides in from left)
  - Full-screen modals on mobile
  - Smooth animations and transitions

---

## Mobile-Specific Features

### Sidebar Drawer

On mobile devices, the sidebar converts to a slide-out drawer:

- **Open**: Tap hamburger menu (☰) or swipe right from left edge
- **Close**: Tap overlay, swipe left on sidebar, or tap a nav item
- **Keyboard shortcut**: Press Escape to close

### Touch Gestures

The app supports several touch gestures:

1. **Swipe Left on Sidebar** → Closes sidebar
2. **Swipe Right from Edge** → Opens sidebar
3. **Swipe Down on Modal** → Dismisses modal
4. **Long Press** → Context menu (future feature)

### iOS Safe Areas

The app automatically handles:
- iPhone notch
- Home indicator
- Status bar
- Safe area insets

Content never hides behind system UI elements.

### Keyboard Optimizations

- **Numeric inputs**: Show numeric keypad (`inputmode="numeric"`)
- **Text inputs**: 16px font size (prevents iOS zoom on focus)
- **Form inputs**: Larger touch targets (48px height)

### Orientation Support

- **Portrait**: Full-featured layout
- **Landscape**: Optimized spacing and layout
- **Auto-adjusts**: Layout adapts automatically

---

## Limitations & Considerations

### File Handling

**⚠️ Important:** iOS cannot open local `file://` links.

**What Works:**
- Files with `share_url` (OneDrive, iCloud, Google Drive links)
- Files with web URLs
- Export/Import JSON files

**What Doesn't Work:**
- Local file paths (`file://` URLs)
- Direct file system access
- Opening files from local storage

**Workaround:**
- Add share URLs to file links when creating them
- Use cloud storage (OneDrive, iCloud) for file sync
- Export/Import for data transfer

### Storage

- **Uses localStorage**: Limited to ~5-10MB per domain
- **Per-device**: Data is stored locally on each device
- **No automatic sync**: Use Export/Import to move data between devices

**Future Enhancement:**
- Cloud sync via API
- iCloud Drive integration
- Cross-device synchronization

### Performance

- **First load**: May be slower (downloads assets)
- **Subsequent loads**: Fast (cached by service worker)
- **Large datasets**: May experience slowdown with 1000+ tasks

### Browser Requirements

- **Safari**: Fully supported (recommended)
- **Chrome iOS**: Works but may have minor differences
- **Other browsers**: Not tested

---

## Troubleshooting

### App Won't Install

**Problem:** "Add to Home Screen" option doesn't appear

**Solutions:**
1. Make sure you're using Safari (not Chrome)
2. Ensure you're on HTTPS or localhost (not `file://`)
3. Check that manifest.json is accessible
4. Clear Safari cache and try again

### App Won't Load

**Problem:** Blank screen or error message

**Solutions:**
1. Check that server is running
2. Verify URL is correct (use IP address, not `localhost`)
3. Check both devices are on same Wi-Fi network
4. Open Safari console (Settings → Safari → Advanced → Web Inspector)
5. Check for JavaScript errors

### Sidebar Won't Open/Close

**Problem:** Menu button doesn't work

**Solutions:**
1. Refresh the page
2. Check browser console for errors
3. Try swiping gesture instead
4. Clear browser cache

### Data Not Saving

**Problem:** Changes disappear after refresh

**Solutions:**
1. Check localStorage is enabled (Safari Settings → Advanced → Website Data)
2. Ensure you're not in Private Browsing mode
3. Check browser console for errors
4. Try Export to backup data

### Offline Mode Not Working

**Problem:** App doesn't work without internet

**Solutions:**
1. Ensure service worker is registered (check console)
2. Visit app while online first (to cache assets)
3. Check service-worker.js is accessible
4. Clear cache and reload

### Touch Gestures Not Working

**Problem:** Swipes don't work

**Solutions:**
1. Ensure you're on a touch device
2. Check that touchGestures.js is loaded
3. Try refreshing the page
4. Check browser console for errors

---

## Best Practices

### For Users

1. **Regular Backups**
   - Use Export feature regularly
   - Store backups in iCloud/OneDrive
   - Export before major updates

2. **File Links**
   - Always add share URLs when possible
   - Use cloud storage for file sync
   - Test file links after adding

3. **Performance**
   - Archive old completed tasks
   - Keep projects organized
   - Use filters to reduce visible items

4. **Offline Usage**
   - Visit app while online first
   - Let service worker cache assets
   - Export data before going offline

### For Developers

1. **Testing**
   - Test on actual iOS devices (not just simulator)
   - Test in both portrait and landscape
   - Test with different screen sizes (iPhone SE to iPad Pro)

2. **Performance**
   - Monitor localStorage usage
   - Optimize for mobile networks
   - Test offline functionality

3. **Accessibility**
   - Ensure all touch targets are 44x44px minimum
   - Test with VoiceOver
   - Provide alternative text for icons

---

## Technical Details

### PWA Configuration

**Manifest.json:**
- `display: "standalone"` - App-like experience
- `orientation: "any"` - Supports all orientations
- `start_url: "./tasklist.html"` - Entry point
- Icons: 192x192 and 512x512

**Service Worker:**
- Caches assets for offline use
- Version: `petal-cache-v2`
- Auto-updates on new version

**iOS Meta Tags:**
- `apple-mobile-web-app-capable: yes`
- `apple-mobile-web-app-status-bar-style: default`
- `viewport-fit: cover` - Handles safe areas

### Touch Targets

All interactive elements meet iOS Human Interface Guidelines:
- Buttons: 44x44px minimum
- Form inputs: 48px height
- Links: 44px minimum height
- Icons: 44x44px touch area

### Breakpoints

- **Mobile**: < 768px (sidebar becomes drawer)
- **Small Mobile**: < 480px (compact layout)
- **Tablet**: 768px - 1024px (optimized layout)
- **Desktop**: > 1024px (full sidebar)

---

## Future Enhancements

### Planned Features

- [ ] Cloud sync (API-based)
- [ ] iCloud Drive file integration
- [ ] Push notifications
- [ ] Background sync
- [ ] Share extension (iOS)
- [ ] Widget support (iOS 14+)
- [ ] Siri shortcuts
- [ ] Apple Pencil support (iPad)

### Under Consideration

- [ ] Android support
- [ ] Tablet-optimized layouts
- [ ] Split-screen support (iPad)
- [ ] Drag and drop (iPad)
- [ ] Keyboard shortcuts (iPad with keyboard)

---

## Support & Resources

### Getting Help

- Check this guide first
- Review browser console for errors
- Test in Safari (recommended browser)
- Ensure latest iOS version

### Related Documentation

- [iOS Compatibility Plan](../plans/IOS_COMPATIBILITY_PLAN.md)
- [iOS Compatibility Checklist](../plans/IOS_COMPATIBILITY_CHECKLIST.md)
- [Design System](../design/DESIGN_SYSTEM.md)
- [Architecture Overview](../architecture/VAULT_ARCHITECTURE.md)

### Known Issues

- File links without share URLs won't open on iOS
- Large datasets may cause performance issues
- Some advanced features may differ from desktop version

---

## Version History

- **v1.7.0** (Current)
  - Initial iOS support
  - Touch gestures
  - Mobile-optimized UI
  - Offline support
  - PWA installation

---

## Appendix

### Testing Checklist

Before deploying to production, test:

- [ ] App installs on Home Screen
- [ ] App opens in standalone mode
- [ ] Sidebar drawer works (tap and swipe)
- [ ] All pages load correctly
- [ ] Forms are usable (keyboard appears correctly)
- [ ] Touch targets are large enough
- [ ] Data saves and persists
- [ ] Export/Import works
- [ ] Offline mode works
- [ ] Portrait and landscape orientations
- [ ] Safe areas handled correctly (notch, home indicator)
- [ ] File links with share URLs work
- [ ] Performance is acceptable

### Device Compatibility

**Tested On:**
- iPad (various models)
- iPhone (various models)
- iOS 14+
- Safari browser

**Not Tested:**
- Android devices
- Older iOS versions (< 14)
- Other browsers on iOS

---

*Last Updated: 2024*
*Version: 1.7.0*
