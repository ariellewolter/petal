# iOS Compatibility Plan for Petal

## Overview

This document outlines the plan to make Petal fully compatible with iOS devices (iPhone and iPad) as a Progressive Web App (PWA). The app already has PWA infrastructure, but needs mobile-specific optimizations.

## Current State

### ✅ Already Working
- PWA manifest.json exists
- Service worker for offline support
- Storage abstraction (uses localStorage in browser mode)
- iOS meta tags partially implemented
- Service worker registration code exists

### ❌ Issues to Fix
1. **File naming inconsistency**: `manifest.json` and `service-worker.js` reference `tasklist (1).html` but actual file is `tasklist.html`
2. **Non-responsive layout**: Fixed 220px sidebar doesn't work on mobile
3. **Touch interactions**: Buttons/inputs may be too small for touch
4. **iOS-specific features**: Missing some iOS meta tags and icon sizes
5. **File handling**: iOS can't use `file://` links - need graceful fallback
6. **Viewport issues**: Need to handle iOS safe areas (notch, home indicator)
7. **Orientation**: Currently locked to portrait - should support both

---

## Implementation Plan

### Phase 1: Fix Critical Issues (Required for Basic Functionality)

#### 1.1 Fix File References
**Priority: CRITICAL**

- [ ] Update `manifest.json`:
  - Change `start_url` from `"./tasklist (1).html"` to `"./tasklist.html"`
  
- [ ] Update `service-worker.js`:
  - Change all references from `'./tasklist (1).html'` to `'./tasklist.html'`
  - Update cache assets list

**Files to modify:**
- `manifest.json` (line 5)
- `service-worker.js` (lines 7, 80)

---

#### 1.2 Make Layout Responsive
**Priority: CRITICAL**

The current CSS uses a fixed grid layout with a 220px sidebar. This needs to be responsive.

**Mobile-first approach:**
- [ ] Add media queries for mobile devices (< 768px)
- [ ] Convert sidebar to a slide-out drawer on mobile
- [ ] Make main content full-width on mobile
- [ ] Ensure proper touch targets (min 44x44px for iOS)

**CSS changes needed:**
- Add `@media (max-width: 768px)` breakpoint
- Sidebar: Hide by default, show as overlay when menu button clicked
- Main content: Full width on mobile
- Touch targets: Ensure all buttons/links are at least 44x44px
- Spacing: Adjust padding/margins for smaller screens

**Files to modify:**
- `src/styles/main.css`

**Key CSS additions:**
```css
/* Mobile sidebar as drawer */
@media (max-width: 768px) {
  .app {
    grid-template-columns: 1fr !important;
  }
  
  .global-sidebar {
    position: fixed;
    left: -220px;
    transition: left 0.3s ease;
    z-index: 1000;
  }
  
  .global-sidebar.open {
    left: 0;
  }
  
  /* Mobile menu button */
  .mobile-menu-toggle {
    display: block;
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 1001;
  }
}
```

---

#### 1.3 Enhance iOS Meta Tags
**Priority: HIGH**

- [ ] Add missing iOS meta tags to `tasklist.html`:
  - `apple-mobile-web-app-capable` (already exists)
  - `apple-mobile-web-app-status-bar-style` (already exists)
  - `apple-mobile-web-app-title` (already exists)
  - Add `apple-touch-icon` sizes (180x180, 152x152, 120x120)
  - Add `apple-touch-startup-image` for splash screens

**Files to modify:**
- `tasklist.html` (head section)

**Meta tags to add:**
```html
<!-- iOS specific -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Petal">
<link rel="apple-touch-icon" sizes="180x180" href="icon-180.png">
<link rel="apple-touch-icon" sizes="152x152" href="icon-152.png">
<link rel="apple-touch-icon" sizes="120x120" href="icon-120.png">
```

---

#### 1.4 Fix Manifest.json
**Priority: HIGH**

- [ ] Update `manifest.json`:
  - Fix `start_url` to point to correct file
  - Add `orientation: "any"` (or remove portrait lock)
  - Ensure icons are properly sized
  - Add `scope` field

**Files to modify:**
- `manifest.json`

**Changes:**
```json
{
  "start_url": "./tasklist.html",
  "scope": "./",
  "orientation": "any",
  "display": "standalone"
}
```

---

### Phase 2: Mobile UX Improvements (Enhanced Experience)

#### 2.1 Touch-Friendly Interactions
**Priority: HIGH**

- [ ] Increase touch target sizes:
  - Buttons: min 44x44px (iOS HIG requirement)
  - Links: min 44x44px
  - Form inputs: min 44px height
  - Checkboxes/radio: min 44x44px

- [ ] Add touch feedback:
  - Active states for buttons
  - Haptic feedback (if available via API)
  - Visual feedback on tap

- [ ] Improve form inputs:
  - Use appropriate input types for mobile keyboards
  - Add `inputmode` attributes where helpful
  - Ensure date pickers work on iOS

**Files to modify:**
- `src/styles/main.css`
- `tasklist.html` (input elements)

---

#### 2.2 Handle iOS Safe Areas
**Priority: MEDIUM**

- [ ] Add CSS for safe areas:
  - Use `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, etc.
  - Ensure content doesn't hide behind notch/home indicator
  - Adjust padding/margins accordingly

**CSS additions:**
```css
/* iOS safe areas */
.app {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

**Files to modify:**
- `src/styles/main.css`

---

#### 2.3 File Handling for iOS
**Priority: MEDIUM**

iOS doesn't support `file://` links. Need to handle this gracefully.

- [ ] Detect iOS platform
- [ ] For file links:
  - If file is in iCloud Drive: Show "Open in Files" option
  - If file has share URL: Use that
  - Otherwise: Show message that file access is limited on iOS
  - Consider using File System Access API (if available)

**Files to modify:**
- `src/utils/vaultImprovements.js` (file linking logic)
- `src/features/modalOperations.js` (file operations)

**Detection code:**
```javascript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
```

---

#### 2.4 Responsive Typography
**Priority: MEDIUM**

- [ ] Adjust font sizes for mobile:
  - Use relative units (rem, em)
  - Scale down headings on mobile
  - Ensure readable line heights

**Files to modify:**
- `src/styles/main.css`

---

### Phase 3: PWA Enhancements (Polish)

#### 3.1 Service Worker Improvements
**Priority: MEDIUM**

- [ ] Update service worker to cache all necessary assets:
  - All JS modules
  - All CSS files
  - Fonts (with fallback)
  - Icons

- [ ] Add offline fallback page
- [ ] Implement cache versioning
- [ ] Add update notification for users

**Files to modify:**
- `service-worker.js`

---

#### 3.2 Add iOS Splash Screens
**Priority: LOW**

- [ ] Create splash screen images for different iOS devices:
  - iPhone (various sizes)
  - iPad (various sizes)
- [ ] Add to manifest and meta tags

**Files to create:**
- `splash-iphone-*.png` (various sizes)
- `splash-ipad-*.png` (various sizes)

---

#### 3.3 Icon Generation
**Priority: LOW**

- [ ] Ensure all required iOS icon sizes exist:
  - 180x180 (iPhone)
  - 152x152 (iPad)
  - 120x120 (iPhone)
  - 1024x1024 (App Store if needed)

**Files to check/create:**
- `icon-180.png`
- `icon-152.png`
- `icon-120.png`

---

### Phase 4: Testing & Validation

#### 4.1 Device Testing
**Priority: HIGH**

- [ ] Test on actual iOS devices:
  - iPhone (Safari)
  - iPad (Safari)
  - Test "Add to Home Screen"
  - Test offline functionality
  - Test file operations
  - Test all major features

#### 4.2 PWA Validation
**Priority: MEDIUM**

- [ ] Run Lighthouse PWA audit
- [ ] Fix any issues found
- [ ] Ensure installability score is 100

#### 4.3 Cross-Platform Testing
**Priority: MEDIUM**

- [ ] Ensure desktop version still works
- [ ] Test responsive breakpoints
- [ ] Verify Electron app unaffected

---

## Implementation Order

1. **Week 1: Critical Fixes**
   - Fix file references (1.1)
   - Make layout responsive (1.2)
   - Fix manifest (1.4)
   - Enhance iOS meta tags (1.3)

2. **Week 2: Mobile UX**
   - Touch-friendly interactions (2.1)
   - Safe areas (2.2)
   - File handling (2.3)
   - Responsive typography (2.4)

3. **Week 3: Polish & Testing**
   - Service worker improvements (3.1)
   - Splash screens (3.2)
   - Icon generation (3.3)
   - Device testing (4.1)
   - PWA validation (4.2)

---

## Success Criteria

✅ **Basic Functionality:**
- App loads on iOS Safari
- Can be added to Home Screen
- Works offline (basic functionality)
- Layout is usable on mobile

✅ **Enhanced Experience:**
- All touch targets are 44x44px minimum
- Sidebar works as drawer on mobile
- File operations handle iOS limitations gracefully
- Safe areas are respected

✅ **PWA Standards:**
- Lighthouse PWA score: 90+
- Installable on iOS
- Works offline
- Fast loading

---

## Notes

- **Storage**: Already handled - uses localStorage in browser mode
- **File Sync**: iOS version will use localStorage (no file system access)
- **Future**: Could add iCloud Drive integration via WebDAV API if needed
- **Backward Compatibility**: All changes should maintain desktop/Electron functionality

---

## Resources

- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [iOS Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/Introduction/Introduction.html)
- [Safe Area Insets](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
