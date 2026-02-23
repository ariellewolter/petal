# Petal Design System

## Overview

This document defines the design system for Petal, a task tracking application. All new features and components should follow these guidelines to maintain visual consistency.

---

## Color Palette

### Base Colors

```css
--bg:         #faf8f5  /* Main background */
--bg2:        #f5f0eb  /* Secondary background */
--surface:    #ffffff  /* Card/panel background */
--border:     #e8e0d8  /* Primary border */
--border2:    #d9cfc5  /* Secondary border */
```

### Brand Colors

```css
--rose:       #c98b8b  /* Primary brand color */
--rose-soft:  #e8c4c4  /* Soft rose variant */
--rose-pale:  #f5e9e9  /* Pale rose variant */
--blush:      #f0ddd8  /* Blush accent */
```

### Accent Colors

```css
--sage:       #9aab94  /* Success/positive actions */
--sage-pale:  #e8ede7  /* Pale sage variant */
--mauve:      #a08898  /* Secondary accent */
--mauve-pale: #ede5ec  /* Pale mauve variant */
--taupe:      #8a7e78  /* Neutral accent */
```

### Text Colors

```css
--text:       #5a4f4a  /* Primary text */
--text-dim:   #a09590  /* Secondary/dimmed text */
--text-light: #c4bab6  /* Light/disabled text */
--text-muted: #a09590  /* Muted text (alias) */
```

### Status Colors

```css
--overdue:    #c47a7a  /* Overdue/error states */
--soon:       #c9a060  /* Warning/soon states */
```

### Project Colors

```css
--proj-1: #c98b8b; --proj-1p: #f5e9e9;  /* Rose */
--proj-2: #9aab94; --proj-2p: #e8ede7;  /* Sage */
--proj-3: #a08898; --proj-3p: #ede5ec;  /* Mauve */
--proj-4: #b09070; --proj-4p: #f0e8dc;  /* Tan */
--proj-5: #7a9aac; --proj-5p: #e0ecf2;  /* Blue */
```

---

## Typography

### Font Families

- **Headings**: `'Cormorant Garamond', Georgia, 'Times New Roman', serif`
  - Used for titles, card headers, and prominent text
  - Font weight: 300-400 (light to regular)
  - Letter spacing: -1px to -0.5px for large headings
  
- **Body Text**: `'Jost', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
  - Used for all body text, labels, and UI elements
  - Font weight: 300-400 (light to regular)

### Type Scale

```css
/* Headings */
.wordmark-title: 28-48px (Cormorant Garamond, 300-400)
h1: 32px (Cormorant Garamond, 400)
h2: 22-24px (Cormorant Garamond, 400)
h3: 20px (Cormorant Garamond, 400, italic)

/* Body */
Body: 13px (Jost, 300)
Small: 11-12px (Jost, 300-400)
Tiny: 8-10px (Jost, 400)

/* Labels */
Uppercase labels: 9-12px (Jost, 400-500, letter-spacing: 0.12-0.18em)
```

### Text Styles

- **Uppercase Labels**: `letter-spacing: 0.12-0.18em`, `text-transform: uppercase`, `font-size: 9-12px`
- **Serif Headings**: Italic style for form titles and section headers
- **Monospace**: Used for file paths, code, and technical information (`'DM Mono', monospace`)

---

## Spacing System

### Padding

```css
/* Cards */
Card padding: 18-28px
Card inner padding: 12-16px
Section padding: 20-28px

/* Forms */
Form card padding: 28px
Field spacing: 12px vertical
Input padding: 9px 13px

/* Sidebar */
Sidebar padding: 20px 12px
Nav item padding: 8px 10px
```

### Margins

```css
/* Sections */
Section margin-bottom: 24-28px
Card margin-bottom: 16px
Group margin-top: 14-28px

/* Elements */
Element gap: 6-14px (flexbox gap)
Button spacing: 8-12px
```

### Border Radius

```css
Cards: 16px
Buttons: 8px
Inputs: 8px
Small elements: 6px
Pills/badges: 20px (or 999px for fully rounded)
```

---

## Component Patterns

### Cards

**Structure:**
```html
<div class="card-class">
  <div class="card-header">...</div>
  <div class="card-body">...</div>
</div>
```

**Styles:**
- Background: `var(--surface)`
- Border: `1px solid var(--border)`
- Border radius: `16px`
- Box shadow on hover: `0 4px 24px rgba(160,110,100,.1)`
- Animation: `fadeSlide .3s ease both`

**Examples:**
- `.task-card`
- `.project-card`
- `.form-card`
- `.today-card`

### Buttons

**Primary Button:**
```css
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
box-shadow: 0 2px 8px rgba(201,139,139,.2);
```

**Secondary Button:**
```css
background: var(--bg2);
border: 1px solid var(--border);
border-radius: 8px;
color: var(--text);
padding: 10px 20px;
```

**Icon Button:**
```css
width: 28-30px;
height: 28-30px;
border-radius: 50%;
background: none;
border: 1px solid transparent;
color: var(--text-dim);
```

### Form Elements

**Input Fields:**
```css
background: var(--bg);
border: 1px solid var(--border);
border-radius: 8px;
color: var(--text);
font-family: 'Jost', sans-serif;
font-weight: 300;
font-size: 13px;
padding: 9px 13px;
```

**Focus State:**
```css
border-color: var(--rose-soft);
box-shadow: 0 0 0 3px rgba(201,139,139,.08);
```

**Labels:**
```css
font-size: 10px;
letter-spacing: .18em;
text-transform: uppercase;
color: var(--text-dim);
```

### Checkboxes

**Unchecked:**
```css
width: 18px;
height: 18px;
border: 1.5px solid var(--border2);
border-radius: 50%;
background: white;
```

**Checked:**
```css
background: var(--rose);
border-color: var(--rose);
```

**Checkmark:**
```css
::after {
  content: '';
  width: 5px;
  height: 8px;
  border: 1.5px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg) translateY(-1px);
}
```

### Badges & Tags

**Priority Tags:**
```css
/* High */
background: var(--rose-pale);
color: var(--rose);

/* Medium */
background: var(--blush);
color: var(--mauve);

/* Low */
background: var(--sage-pale);
color: var(--sage);
```

**Status Pills:**
```css
font-size: 9px;
letter-spacing: .05em;
padding: 3px 8px;
border-radius: 20px;
```

### Modals

**Structure:**
```html
<div class="modal-class active">
  <div class="modal-box">
    <div class="modal-header">
      <h3>Title</h3>
      <button>✕</button>
    </div>
    <div class="modal-body">...</div>
  </div>
</div>
```

**Styles:**
- Backdrop: `rgba(0,0,0,0.4)` with `backdrop-filter: blur(2px)`
- Modal box: `background: var(--surface)`, `border-radius: 16px`, `padding: 28px`
- Box shadow: `0 8px 32px rgba(0,0,0,0.2)`

---

## Layout Patterns

### Grid System

**Main App Layout:**
```css
.app {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  min-height: 100vh;
}
```

**Card Grids:**
```css
/* Responsive grid */
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 18px;
```

### Sidebar

**Global Sidebar:**
- Width: `220px`
- Background: `var(--surface)`
- Border right: `1px solid var(--border)`
- Sticky positioning
- Height: `100vh`
- Overflow: `auto`

**Sidebar Navigation:**
- Padding: `20px 12px`
- Nav items: `8px 10px` padding
- Active state: `background: var(--rose-pale)`, `color: var(--rose)`
- Active indicator: `2px` left border in `var(--rose)`

### View Containers

**Standard View:**
```css
padding: 52px 36px 100px;
height: 100vh;
max-height: 100vh;
overflow-y: auto;
overflow-x: hidden;
```

---

## Animation Patterns

### Transitions

**Standard:**
```css
transition: all .15s;
```

**Smooth:**
```css
transition: all .18s;
```

**Slow:**
```css
transition: all .2s;
```

### Keyframe Animations

**Fade Slide (entrance):**
```css
@keyframes fadeSlide {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

**Rise (entrance):**
```css
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Pulse (status indicator):**
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .4;
  }
}
```

### Hover Effects

**Cards:**
```css
:hover {
  box-shadow: 0 4px 24px rgba(160,110,100,.1);
}
```

**Buttons:**
```css
:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(201,139,139,.3);
}
```

**Interactive Elements:**
```css
:hover {
  background: var(--bg2);
  border-color: var(--rose-soft);
  color: var(--rose);
}
```

---

## Iconography

### Icon Usage

- **Emoji icons**: Used for file types, status indicators, and decorative elements
- **Unicode symbols**: Used for navigation (→, ✕, ✓)
- **Size**: Typically `12-16px` for UI icons

### Common Icons

- Close: `✕`
- Check: `✓` or `::after` pseudo-element
- Chevron: `→` (rotated for expand/collapse)
- File: `📁`
- Search: `🔍`

---

## Status Indicators

### Priority Levels

**High:**
- Color: `var(--rose)`
- Background: `var(--rose-pale)`
- Border accent: `4px solid var(--rose)` on left

**Medium:**
- Color: `var(--mauve)`
- Background: `var(--blush)`
- Border accent: `4px solid var(--rose-soft)` on left

**Low:**
- Color: `var(--sage)`
- Background: `var(--sage-pale)`
- Border accent: `4px solid var(--sage)` on left

### Due Date States

**Overdue:**
- Color: `var(--overdue)`
- Font weight: `500`

**Soon:**
- Color: `var(--soon)`

**Normal:**
- Color: `var(--text-dim)`

---

## Responsive Design

### Breakpoints

```css
/* Mobile */
@media (max-width: 600px) {
  /* Stack layouts, reduce padding */
}

/* Tablet */
@media (max-width: 768px) {
  /* Adjust grid columns */
}

/* Desktop */
@media (max-width: 1200px) {
  /* Reduce gaps */
}
```

### Mobile Adaptations

- Reduce padding: `28px` → `16-20px`
- Stack grid columns: `grid-template-columns: 1fr`
- Full-width buttons
- Simplified navigation

---

## Accessibility

### Color Contrast

- Text on surface: Minimum 4.5:1 ratio
- Interactive elements: Clear hover/focus states
- Status colors: Not the only indicator (use icons/labels too)

### Focus States

All interactive elements should have visible focus states:
```css
:focus {
  outline: none;
  border-color: var(--rose-soft);
  box-shadow: 0 0 0 3px rgba(201,139,139,.08);
}
```

### Keyboard Navigation

- All interactive elements should be keyboard accessible
- Tab order should follow visual flow
- Skip links for main content

---

## Design Principles

1. **Elegance over complexity**: Clean, minimal interfaces
2. **Consistent spacing**: Use the spacing system consistently
3. **Subtle interactions**: Gentle hover effects and transitions
4. **Readable typography**: Appropriate font sizes and line heights
5. **Visual hierarchy**: Use color, size, and weight to guide attention
6. **Gentle colors**: Soft, muted palette for reduced eye strain
7. **Serif for personality**: Serif fonts for headings add character
8. **Sans-serif for clarity**: Sans-serif for body text and UI

---

## Component Library

### Task Card
- See `.task-card` in CSS
- Includes: checkbox, title, metadata, notes toggle, file links

### Project Card
- See `.project-card` in CSS
- Includes: color bar, name, description, progress, subtasks

### Form Card
- See `.form-card` in CSS
- Includes: title, fields, submit button

### Toolbar
- See `.toolbar` in CSS
- Includes: search, filters, sort buttons

### Modal
- See `.quick-capture-modal` in CSS
- Includes: backdrop, modal box, header, body, actions

---

## Usage Guidelines

### When Creating New Components

1. **Use CSS variables** for all colors
2. **Follow spacing system** for padding/margins
3. **Match typography scale** for text sizes
4. **Include hover states** for interactive elements
5. **Add transitions** for smooth interactions
6. **Test responsive** behavior at breakpoints
7. **Ensure accessibility** with focus states

### When Modifying Existing Components

1. **Maintain visual consistency** with existing patterns
2. **Preserve animation timing** (0.15s standard)
3. **Keep border radius** consistent (8px, 16px)
4. **Use same color palette** (don't introduce new colors)
5. **Follow naming conventions** (BEM-like class names)

---

## File Structure

Design-related files:
- `src/styles/main.css` - Main stylesheet with all design tokens
- `tasklist (1).html` - Inline styles for specific components
- `docs/design/DESIGN_SYSTEM.md` - This file

---

## Version History

- **v1.0** - Initial design system documentation
- Based on Petal app codebase analysis

---

## Resources

- **Fonts**: Google Fonts (Jost, Cormorant Garamond, DM Mono)
- **Color Tool**: Use browser dev tools to inspect CSS variables
- **Spacing Reference**: See spacing system section above
