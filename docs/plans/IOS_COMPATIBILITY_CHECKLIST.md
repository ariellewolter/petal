# iOS Compatibility Checklist

Quick reference checklist for making Petal iOS compatible.

## 🔴 Critical (Must Fix)

- [ ] **Fix manifest.json** - Change `start_url` from `"./tasklist (1).html"` to `"./tasklist.html"`
- [ ] **Fix service-worker.js** - Update all references from `tasklist (1).html` to `tasklist.html`
- [ ] **Make sidebar responsive** - Convert to drawer on mobile (< 768px)
- [ ] **Add mobile menu button** - Toggle sidebar on mobile
- [ ] **Fix manifest orientation** - Change from `portrait-primary` to `any` (or remove)

## 🟡 High Priority

- [ ] **Touch targets** - Ensure all buttons/links are min 44x44px
- [ ] **iOS meta tags** - Add missing apple-touch-icon sizes (180x180, 152x152, 120x120)
- [ ] **Safe areas** - Add CSS for iOS notch/home indicator
- [ ] **File handling** - Detect iOS and handle file:// links gracefully
- [ ] **Form inputs** - Add proper input types and inputmode for mobile keyboards

## 🟢 Medium Priority

- [ ] **Responsive typography** - Scale fonts appropriately for mobile
- [ ] **Service worker** - Cache all JS modules and assets
- [ ] **Offline fallback** - Add offline page
- [ ] **Touch feedback** - Add active states for buttons

## 🔵 Low Priority (Polish)

- [ ] **Splash screens** - Create iOS splash screen images
- [ ] **Icon sizes** - Generate all required iOS icon sizes
- [ ] **PWA validation** - Run Lighthouse and fix issues
- [ ] **Device testing** - Test on actual iPhone/iPad

---

## Quick Start (First 5 Tasks)

1. Fix `manifest.json` line 5: `"start_url": "./tasklist.html"`
2. Fix `service-worker.js` lines 7, 80: Change to `'./tasklist.html'`
3. Add mobile CSS breakpoint in `src/styles/main.css`
4. Add mobile menu toggle button in `tasklist.html`
5. Update manifest orientation to `"any"`

---

## Testing Checklist

- [ ] Loads in Safari on iPhone
- [ ] Loads in Safari on iPad
- [ ] Can be added to Home Screen
- [ ] Works offline (basic functionality)
- [ ] Sidebar works as drawer
- [ ] All buttons are tappable
- [ ] Forms work with mobile keyboard
- [ ] No horizontal scrolling
- [ ] Content doesn't hide behind notch
- [ ] File operations handle iOS limitations

---

## Files to Modify

### Critical
- `manifest.json`
- `service-worker.js`
- `src/styles/main.css`
- `tasklist.html` (head section, add menu button)

### High Priority
- `src/utils/vaultImprovements.js` (iOS detection)
- `src/features/modalOperations.js` (file handling)

### Medium Priority
- `service-worker.js` (enhance caching)

---

## Estimated Time

- **Critical fixes**: 2-3 hours
- **High priority**: 4-6 hours
- **Medium priority**: 3-4 hours
- **Low priority**: 2-3 hours
- **Testing**: 4-6 hours

**Total**: ~15-22 hours
