# Migrating to Standard Components

This guide helps you migrate existing pages to use the standard component library for consistency.

## Migration Checklist

- [ ] Replace custom buttons with `Buttons.*` components
- [ ] Replace custom empty states with `EmptyState()` component
- [ ] Replace custom modals with `Modal()` component (or document why custom is needed)
- [ ] Replace custom forms with `FormField()` and `Forms.*` utilities
- [ ] Replace custom cards with `Card()` component
- [ ] Add `PageHeader()` if page doesn't have one
- [ ] Update CSS to use standard classes where possible

## Button Migration

### Before
```javascript
<button class="custom-btn" onclick="doSomething()">Click Me</button>
```

### After
```javascript
import { Buttons } from '../ui/components.js';

Buttons.primary({
  text: 'Click Me',
  action: 'do-something'
})
```

## Modal Migration

### Before (Custom Modal)
```javascript
function getModalTemplate() {
  return `
    <div class="custom-modal-backdrop" id="custom-modal-backdrop">
      <div class="custom-modal">
        <div class="custom-modal-head">
          <div class="custom-modal-title">Title</div>
          <button class="custom-modal-close">✕</button>
        </div>
        <div class="custom-modal-body">
          <!-- content -->
        </div>
        <div class="custom-modal-foot">
          <button class="cancel">Cancel</button>
          <button class="save">Save</button>
        </div>
      </div>
    </div>
  `;
}

function openModal() {
  const backdrop = document.getElementById('custom-modal-backdrop');
  backdrop.classList.add('open');
}
```

### After (Standard Modal)
```javascript
import { Modal, FormField, Forms } from '../ui/components.js';

function getModalContent() {
  return `
    ${FormField({ label: 'Name', name: 'name', placeholder: 'Enter name' })}
    ${FormField({ label: 'Type', name: 'type', type: 'select', options: ['A', 'B', 'C'] })}
  `;
}

function openModal() {
  const container = document.getElementById('view-your-page');
  const modalHTML = Modal({
    id: 'your-modal',
    title: 'Add New Item',
    body: getModalContent(),
    footer: Forms.actions({
      primary: { text: 'Save', action: 'save-item' },
      cancel: { text: 'Cancel', action: 'close-modal' }
    }),
    onCloseAction: 'close-modal'
  });
  
  // Remove existing modal if present
  const existing = container.querySelector('#your-modal-backdrop');
  if (existing) existing.remove();
  
  container.insertAdjacentHTML('beforeend', modalHTML);
  
  // Show modal
  const backdrop = document.getElementById('your-modal-backdrop');
  backdrop.classList.add('open');
}

function closeModal() {
  const backdrop = document.getElementById('your-modal-backdrop');
  if (backdrop) backdrop.classList.remove('open');
}
```

### Handling Custom Styling

If your modal needs custom styling that doesn't fit the standard Modal component:

1. **Option 1**: Use standard Modal but add scoped CSS
```css
#view-your-page .modal {
  /* Your custom styles */
  max-width: 600px;
}
```

2. **Option 2**: Keep custom modal but document why
```javascript
// Custom modal needed for:
// - Special layout requirements
// - Complex form interactions
// - Page-specific styling
```

## Form Migration

### Before
```javascript
<div class="form-row">
  <div class="form-group">
    <label>Name</label>
    <input type="text" id="name" placeholder="Enter name">
  </div>
  <div class="form-group">
    <label>Type</label>
    <select id="type">
      <option>A</option>
      <option>B</option>
    </select>
  </div>
</div>
```

### After
```javascript
import { FormField, Forms } from '../ui/components.js';

Forms.row([
  { label: 'Name', name: 'name', placeholder: 'Enter name' },
  { label: 'Type', name: 'type', type: 'select', options: ['A', 'B'] }
])
```

## Card Migration

### Before
```javascript
<div class="custom-card">
  <div class="custom-card-header">
    <h3>Title</h3>
    <button>Edit</button>
  </div>
  <div class="custom-card-body">
    Content here
  </div>
</div>
```

### After
```javascript
import { Card, Buttons } from '../ui/components.js';

Card({
  id: 'item-123',
  title: 'Title',
  content: 'Content here',
  headerActions: [
    { icon: '✎', action: 'edit-item', title: 'Edit' }
  ],
  variant: 'task'
})
```

## Empty State Migration

### Before
```javascript
if (items.length === 0) {
  return `
    <div class="empty">
      <div class="empty-icon">📝</div>
      <div class="empty-message">No items yet</div>
      <button onclick="addItem()">Add Item</button>
    </div>
  `;
}
```

### After
```javascript
import { EmptyState } from '../ui/components.js';

if (items.length === 0) {
  return EmptyState({
    icon: '📝',
    message: 'No items yet',
    subtitle: 'Get started by adding your first item',
    action: {
      text: 'Add Item',
      action: 'add-item'
    }
  });
}
```

## Page Header Migration

### Before
```javascript
<header class="page-header">
  <h1>Page Title</h1>
  <div class="header-actions">
    <button>Add</button>
  </div>
</header>
```

### After
```javascript
import { PageHeader, Buttons } from '../ui/components.js';

PageHeader({
  title: 'Page Title',
  icon: '⊡',
  status: '5 items',
  actions: [
    { type: 'primary', text: '+ Add', action: 'add-item' }
  ]
})
```

## Event Handling

When migrating, ensure event delegation still works:

```javascript
// In your page's bind() function
container.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  
  const action = btn.dataset.action;
  
  switch (action) {
    case 'close-modal':
      closeModal();
      break;
    case 'save-item':
      saveItem();
      break;
    // ... other actions
  }
});
```

## Scoped CSS

When migrating, you may need to scope CSS to your page:

```css
/* Scoped to your page */
#view-your-page .modal {
  /* Custom modal styles */
}

#view-your-page .card {
  /* Custom card styles */
}
```

## Testing After Migration

1. ✅ Test all buttons work
2. ✅ Test modals open/close correctly
3. ✅ Test forms submit correctly
4. ✅ Test empty states display correctly
5. ✅ Test responsive behavior
6. ✅ Test keyboard navigation
7. ✅ Verify styling matches design system

## Common Issues

### Modal not showing
- Check backdrop has `open` class
- Verify modal HTML is in DOM
- Check z-index conflicts

### Form fields not working
- Verify `name` attributes are set
- Check event delegation is bound
- Ensure form data is collected correctly

### Styling conflicts
- Use scoped CSS selectors
- Check CSS specificity
- Verify standard classes aren't overridden

## When to Keep Custom Components

Keep custom components if:
- They have complex, page-specific behavior
- They require special accessibility features
- They integrate with third-party libraries
- Migration would require significant refactoring

Document why you're keeping custom components:
```javascript
/**
 * Custom modal implementation
 * 
 * Why custom:
 * - Requires real-time file picker integration
 * - Has complex multi-step form flow
 * - Needs custom validation UI
 */
```

## Next Steps

1. Start with simple pages (fewer custom components)
2. Migrate one component type at a time
3. Test thoroughly after each migration
4. Update documentation as you go
5. Share learnings with team
