# Component Template

Quick reference template for creating new components in Petal.

## HTML Structure Template

```html
<!-- Card Component -->
<div class="component-name-card">
  <div class="component-name-header">
    <h3 class="component-name-title">Title</h3>
    <div class="component-name-actions">
      <button class="btn-del" title="Delete">✕</button>
    </div>
  </div>
  <div class="component-name-body">
    <!-- Content -->
  </div>
</div>
```

## CSS Template

```css
/* Component Card */
.component-name-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: box-shadow .2s;
  animation: fadeSlide .3s ease both;
}

.component-name-card:hover {
  box-shadow: 0 4px 24px rgba(160,110,100,.1);
}

/* Component Header */
.component-name-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.component-name-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 400;
  color: var(--text);
  line-height: 1.2;
}

/* Component Body */
.component-name-body {
  padding: 18px 20px;
}

/* Component Actions */
.component-name-actions {
  display: flex;
  gap: 4px;
}
```

## Button Template

```css
/* Primary Button */
.btn-component-primary {
  background: linear-gradient(135deg, #d4a0a0 0%, #c98b8b 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 10px 20px;
  cursor: pointer;
  transition: all .2s;
  box-shadow: 0 2px 8px rgba(201,139,139,.2);
}

.btn-component-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(201,139,139,.3);
}

/* Secondary Button */
.btn-component-secondary {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  font-weight: 400;
  padding: 10px 20px;
  cursor: pointer;
  transition: all .15s;
}

.btn-component-secondary:hover {
  background: var(--bg);
  border-color: var(--border2);
}
```

## Form Field Template

```html
<div class="field">
  <label>Field Label</label>
  <input type="text" placeholder="Placeholder text" />
</div>
```

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 10px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.field input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: 'Jost', sans-serif;
  font-weight: 300;
  font-size: 13px;
  padding: 9px 13px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  width: 100%;
}

.field input:focus {
  border-color: var(--rose-soft);
  box-shadow: 0 0 0 3px rgba(201,139,139,.08);
}

.field input::placeholder {
  color: var(--text-light);
}
```

## Badge/Tag Template

```html
<span class="component-badge component-badge-high">High</span>
```

```css
.component-badge {
  font-size: 8px;
  letter-spacing: .12em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 20px;
}

.component-badge-high {
  background: var(--rose-pale);
  color: var(--rose);
}

.component-badge-medium {
  background: var(--blush);
  color: var(--mauve);
}

.component-badge-low {
  background: var(--sage-pale);
  color: var(--sage);
}
```

## Modal Template

```html
<div class="component-modal" id="component-modal">
  <div class="component-modal-box">
    <div class="component-modal-header">
      <h3 class="component-modal-title">Modal Title</h3>
      <button class="component-modal-close" data-action="modal:close">✕</button>
    </div>
    <div class="component-modal-body">
      <!-- Content -->
    </div>
    <div class="component-modal-actions">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-submit">Submit</button>
    </div>
  </div>
</div>
```

```css
.component-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
  overflow-y: auto;
  padding: 20px;
}

.component-modal.active {
  display: flex;
}

.component-modal-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  animation: fadeSlide .2s ease-out;
}

.component-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.component-modal-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 22px;
  font-weight: 400;
  font-style: italic;
  color: var(--rose);
  margin: 0;
}

.component-modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-dim);
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all .15s;
}

.component-modal-close:hover {
  background: var(--bg2);
  color: var(--text);
}

.component-modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}
```

## Empty State Template

```html
<div class="empty-state">
  No items yet
  <small>Add your first item to get started</small>
</div>
```

```css
.empty-state {
  text-align: center;
  padding: 70px 20px;
  color: var(--text-light);
  font-family: 'Cormorant Garamond', serif;
  font-size: 24px;
  font-style: italic;
  font-weight: 300;
}

.empty-state small {
  display: block;
  font-family: 'Jost', sans-serif;
  font-size: 11px;
  letter-spacing: .15em;
  text-transform: uppercase;
  margin-top: 8px;
  font-style: normal;
  color: var(--text-light);
}
```

## Loading State Template

```html
<div class="component-loading">
  <div class="component-loading-spinner"></div>
  <span class="component-loading-text">Loading...</span>
</div>
```

```css
.component-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-dim);
}

.component-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--rose);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.component-loading-text {
  font-size: 12px;
  margin-top: 12px;
  color: var(--text-dim);
}
```

## Checklist for New Components

- [ ] Uses CSS variables for colors
- [ ] Follows spacing system (padding, margins)
- [ ] Uses correct typography (serif for titles, sans-serif for body)
- [ ] Includes hover states for interactive elements
- [ ] Has focus states for accessibility
- [ ] Includes transitions (0.15s standard)
- [ ] Uses appropriate border radius (8px, 16px)
- [ ] Tested at responsive breakpoints
- [ ] Matches existing component patterns
- [ ] Includes animation for entrance (fadeSlide)

## Quick Color Reference

```css
/* Primary Actions */
var(--rose)        /* Primary brand color */
var(--rose-soft)   /* Hover states */
var(--rose-pale)   /* Backgrounds */

/* Success/Positive */
var(--sage)        /* Success color */
var(--sage-pale)   /* Success background */

/* Secondary */
var(--mauve)       /* Secondary accent */
var(--mauve-pale)  /* Secondary background */

/* Text */
var(--text)        /* Primary text */
var(--text-dim)    /* Secondary text */
var(--text-light)  /* Disabled/light text */

/* Status */
var(--overdue)     /* Error/overdue */
var(--soon)        /* Warning/soon */

/* Surfaces */
var(--surface)     /* Cards/panels */
var(--bg)          /* Main background */
var(--bg2)         /* Secondary background */
var(--border)       /* Borders */
```
