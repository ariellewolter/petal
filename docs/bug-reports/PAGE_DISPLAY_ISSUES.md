# Page Display Issues Analysis

## Common Issues Found

### 1. **Inconsistent Display Property Values**

**Problem**: Different pages use different display values:
- Planner: `display: 'flex'` 
- Projects: `display: 'block'` (just fixed)
- Cell Log: `display: ''` (empty string - problematic!)
- Settings: `display: ''` (empty string - problematic!)
- 3D Print: `display: 'block'`

**Issue**: Empty string `''` doesn't reliably show elements. CSS might override it.

### 2. **CSS Conflicts with Inline Styles**

**Problem**: CSS has hardcoded `display:none` rules that conflict:
- `#view-planner{display:none;...}` (line 147)
- CSS selector `#view-planner[style*="display:flex"]` might not match `style.display = 'flex'` (space vs no space)

### 3. **Missing Visibility and Opacity Settings**

**Problem**: Only Projects and Settings set `visibility` and `opacity`, others don't:
- Planner: Only sets `display: 'flex'`
- Cell Log: Only sets `display: ''`
- 3D Print: Only sets `display: 'block'`

**Impact**: Elements might be hidden by CSS or parent containers.

### 4. **Container Element Existence Checks**

**Problem**: Some pages don't check if container exists before accessing:
- 3D Print: Creates element if missing (good)
- Others: Assume element exists (risky)

### 5. **Router Flag Conflicts**

**Problem**: Router flag `__routerJustSwitched` might prevent proper display:
- Projects view has router flag check
- Other views don't check router flag
- Inconsistent behavior

### 6. **CSS Class Conflicts**

**Problem**: `.view-projects-hidden` class might interfere:
- Projects: Removes class explicitly
- Settings: Removes class explicitly  
- Others: Don't check for conflicting classes

## Specific Page Issues

### Planner Page
**Issues**:
1. CSS has `display:none` hardcoded (line 147)
2. Uses `display: 'flex'` but CSS selector might not match
3. Missing `visibility: 'visible'` and `opacity: '1'`
4. No check for router flag

**Fix Needed**:
```javascript
plannerViewEl.style.display = 'flex';
plannerViewEl.style.visibility = 'visible';
plannerViewEl.style.opacity = '1';
plannerViewEl.classList.remove('view-projects-hidden'); // Remove any conflicting classes
```

### Cell Log Page
**Issues**:
1. Uses `display: ''` (empty string) - unreliable!
2. Missing `visibility` and `opacity` settings
3. No class cleanup
4. No router flag check

**Fix Needed**:
```javascript
cellLogViewEl.style.display = 'block';
cellLogViewEl.style.visibility = 'visible';
cellLogViewEl.style.opacity = '1';
cellLogViewEl.classList.remove('view-projects-hidden');
```

### Settings Page
**Issues**:
1. Uses `display: ''` (empty string) - unreliable!
2. Has visibility/opacity (good) but display should be explicit
3. Has class cleanup (good)

**Fix Needed**:
```javascript
settingsViewEl.style.display = 'block'; // Change from '' to 'block'
// Keep existing visibility and opacity
```

### 3D Print Page
**Issues**:
1. Creates element dynamically (good)
2. Sets display correctly
3. Missing `visibility` and `opacity`
4. No class cleanup

**Fix Needed**:
```javascript
print3dViewEl.style.display = 'block';
print3dViewEl.style.visibility = 'visible';
print3dViewEl.style.opacity = '1';
print3dViewEl.classList.remove('view-projects-hidden');
```

### Projects Page
**Status**: ✅ Just fixed by user - has all necessary properties

## Recommended Fixes

### Standard Pattern for All Views

All views should use this pattern when showing:

```javascript
viewEl.style.display = 'block'; // or 'flex' for flex containers
viewEl.style.visibility = 'visible';
viewEl.style.opacity = '1';
viewEl.classList.remove('view-projects-hidden'); // Remove any conflicting classes
```

When hiding:
```javascript
viewEl.style.display = 'none';
```

### CSS Fix Needed

The CSS rule `#view-planner[style*="display:flex"]` should be more robust:
```css
#view-planner[style*="display:flex"],
#view-planner[style*="display: flex"] {
  display: flex !important;
}
```

Or better: Remove hardcoded `display:none` from CSS and let JavaScript control it.
