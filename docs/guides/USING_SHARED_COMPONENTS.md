# Using Shared Components

This guide shows how to use the standardized UI components across all pages for consistency.

## Import Components

```javascript
import { 
  Buttons, 
  EmptyState, 
  PageHeader, 
  StatCard, 
  Tabs, 
  Modal, 
  FormField, 
  Card, 
  Forms,
  LoadingState,
  showNotification
} from '../ui/components.js';

// Keyboard shortcuts and focus management are automatically initialized in app init
// Import if you need to use them directly:
// import { setupKeyboardShortcuts, getKeyboardShortcuts } from '../ui/keyboardShortcuts.js';
// import { trapFocus, restoreFocus, focusFirst } from '../ui/focusManagement.js';
```

## Button Components

### Primary Button
```javascript
Buttons.primary({
  text: '+ Add Task',
  action: 'task:add',
  id: 'add-task-btn',
  className: 'custom-class',
  dataAttrs: { 'task-type': 'quick' }
})
```

### Secondary Button
```javascript
Buttons.secondary({
  text: 'Cancel',
  action: 'close-modal'
})
```

### Icon Button
```javascript
Buttons.icon({
  icon: '✕',
  action: 'close-modal',
  title: 'Close'
})
```

## Empty State

```javascript
EmptyState({
  icon: '📝',
  message: 'No tasks yet',
  subtitle: 'Add your first task to get started',
  action: {
    text: '+ Add Task',
    action: 'task:add'
  }
})
```

## Page Header

```javascript
PageHeader({
  title: 'Tasks',
  icon: '⊡',
  status: '12 active · 5 done',
  actions: [
    {
      type: 'primary',
      text: '+ Add Task',
      action: 'task:add'
    },
    {
      type: 'icon',
      icon: '⚙',
      action: 'open-settings',
      title: 'Settings'
    }
  ]
})
```

## Stat Cards

```javascript
StatCard({
  label: 'Total Tasks',
  value: '24',
  subtitle: 'all tasks',
  variant: 1 // 1-4 for different colors
})
```

## Tabs

```javascript
Tabs({
  tabs: [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'done', label: 'Done' }
  ],
  activeTab: 'all',
  containerId: 'tasks-tabs'
})
```

## Modal

```javascript
Modal({
  id: 'add-task-modal',
  title: 'Add New Task',
  body: `
    ${FormField({ label: 'Task Name', name: 'title', placeholder: 'Enter task...' })}
    ${FormField({ label: 'Priority', name: 'priority', type: 'select', options: ['High', 'Medium', 'Low'] })}
  `,
  footer: `
    ${Buttons.secondary({ text: 'Cancel', action: 'close-modal' })}
    ${Buttons.primary({ text: 'Add Task', action: 'save-task' })}
  `,
  onCloseAction: 'close-modal'
})
```

## Form Fields

```javascript
// Text input
FormField({
  label: 'Task Name',
  name: 'title',
  placeholder: 'Enter task name',
  required: true,
  fullWidth: false
})

// Select
FormField({
  label: 'Priority',
  name: 'priority',
  type: 'select',
  options: [
    { value: 'high', label: 'High' },
    { value: 'med', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ],
  value: 'med'
})

// Textarea
FormField({
  label: 'Notes',
  name: 'notes',
  type: 'textarea',
  placeholder: 'Add notes...',
  fullWidth: true
})
```

## Form Utilities

The `Forms` object provides utilities for building complete forms:

```javascript
// Form Row (side-by-side fields)
Forms.row([
  { label: 'First Name', name: 'firstName' },
  { label: 'Last Name', name: 'lastName' }
])

// Form Actions (buttons)
Forms.actions({
  primary: { text: 'Save', action: 'save-form' },
  secondary: [
    { text: 'Draft', action: 'save-draft' }
  ],
  cancel: { text: 'Cancel', action: 'close-modal' }
})

// Form Card (wrapper)
Forms.card({
  title: 'Add New Task',
  subtitle: 'Fill in the details below',
  children: `
    ${FormField({ label: 'Title', name: 'title', required: true })}
    ${Forms.row([
      { label: 'Priority', name: 'priority', type: 'select', options: ['High', 'Medium', 'Low'] },
      { label: 'Due Date', name: 'due', type: 'date' }
    ])}
    ${Forms.actions({
      primary: { text: 'Add Task', action: 'save-task' },
      cancel: { text: 'Cancel', action: 'close-modal' }
    })}
  `
})

// Form Group (grouped fields)
Forms.group({
  label: 'Task Details',
  children: `
    ${FormField({ label: 'Title', name: 'title' })}
    ${FormField({ label: 'Description', name: 'description', type: 'textarea' })}
  `
})
```

## Card Component

Enhanced card component with header actions, badges, and variants:

```javascript
Card({
  id: 'task-123',
  title: 'Complete project proposal',
  subtitle: 'Due: Tomorrow',
  content: `
    <div class="task-tags">
      <span class="tag">#work</span>
      <span class="tag">#urgent</span>
    </div>
  `,
  footer: `
    <button data-action="edit-task" data-task-id="123">Edit</button>
  `,
  selected: false,
  onClick: 'select-task',
  priority: 'high', // 'high', 'med', 'low'
  variant: 'task', // 'default', 'task', 'project', 'file'
  icon: '📝', // Optional icon in header
  headerActions: [
    { icon: '✎', action: 'edit-task', title: 'Edit', dataAttrs: { 'task-id': '123' } },
    { icon: '✕', action: 'delete-task', title: 'Delete', dataAttrs: { 'task-id': '123' } }
  ],
  badges: [
    { text: 'High', class: 'high' },
    { text: 'Urgent', class: '' }
  ]
})
```

## Example: Updating a Page

```javascript
import { PageHeader, EmptyState, Buttons, StatCard } from '../ui/components.js';

export async function renderTasksPage(container, state, features) {
  const tasks = state.tasks || [];
  const activeTasks = tasks.filter(t => !t.done).length;
  const doneTasks = tasks.filter(t => t.done).length;
  
  // Render header
  const header = PageHeader({
    title: 'Tasks',
    icon: '⊡',
    status: `${activeTasks} active · ${doneTasks} done`,
    actions: [
      { type: 'primary', text: '+ Add Task', action: 'task:add' }
    ]
  });
  
  // Render stats
  const stats = `
    <div class="stats-row">
      ${StatCard({ label: 'Total', value: String(tasks.length), subtitle: 'tasks', variant: 1 })}
      ${StatCard({ label: 'Active', value: String(activeTasks), subtitle: 'in progress', variant: 2 })}
      ${StatCard({ label: 'Done', value: String(doneTasks), subtitle: 'completed', variant: 3 })}
    </div>
  `;
  
  // Render content
  let content = '';
  if (tasks.length === 0) {
    content = EmptyState({
      icon: '📝',
      message: 'No tasks yet',
      subtitle: 'Add your first task to get started',
      action: { text: '+ Add Task', action: 'task:add' }
    });
  } else {
    content = renderTaskList(tasks);
  }
  
  container.innerHTML = `
    ${header}
    <div class="page-content" style="margin-top: 74px;">
      ${stats}
      ${content}
    </div>
  `;
}
```

## Loading State

Show a loading indicator during async operations:

```javascript
// Show loading state
container.innerHTML = LoadingState({
  message: 'Loading tasks...',
  size: 'medium' // 'small', 'medium', 'large'
});

// After data loads, replace with content
const data = await fetchData();
container.innerHTML = renderContent(data);
```

### Sizes
- `small` - 20px spinner, compact for inline use
- `medium` - 32px spinner (default), standard size
- `large` - 48px spinner, for full-page loading

## Notifications/Toasts

Show user feedback with toast notifications:

```javascript
// Success notification
showNotification({
  message: 'Task saved successfully!',
  type: 'success',
  duration: 3000
});

// Error notification
showNotification({
  message: 'Failed to save task',
  type: 'error',
  duration: 5000
});

// Warning notification
showNotification({
  message: 'Task is overdue',
  type: 'warning'
});

// Info notification
showNotification({
  message: 'Task updated',
  type: 'info'
});
```

### Notification Types
- `success` - Green border, checkmark icon
- `error` - Red border, X icon
- `warning` - Yellow border, warning icon
- `info` - Purple border, info icon (default)

### Options
- `message` (required) - Text to display
- `type` (optional) - One of: 'success', 'error', 'warning', 'info' (default: 'info')
- `duration` (optional) - Auto-dismiss time in ms (default: 3000)

Notifications auto-dismiss after the duration, or can be dismissed by clicking the close button or clicking anywhere on the notification.

## Keyboard Shortcuts

Keyboard shortcuts are automatically enabled when the app initializes. Available shortcuts:

### Navigation
- `g` then `t` - Go to Tasks
- `g` then `p` - Go to Projects
- `g` then `f` - Go to Files
- `g` then `w` - Go to Workflow
- `g` then `c` - Go to Cell Log
- `g` then `d` - Go to Today
- `g` then `l` - Go to Planner

### Actions
- `n` - Quick Add (task/project)
- `a` - Add Task
- `p` - Add Project (focuses project name input)

### Modals & Search
- `Escape` - Close modal/drawer
- `/` - Focus search
- `Ctrl+K` or `Cmd+K` - Focus search

### Help
- `?` - Show keyboard shortcuts help (logs to console)

Shortcuts are disabled when typing in input fields, textareas, or contenteditable elements (except Escape and Ctrl/Cmd+K).

## Focus Management

Focus management is automatically set up for modals:
- Focus is trapped within open modals
- Focus is restored to previous element when modal closes
- First focusable element is automatically focused when modal opens

To manually manage focus:
```javascript
import { trapFocus, restoreFocus, focusFirst } from '../ui/focusManagement.js';

// Trap focus in a modal
trapFocus(modalElement);

// Restore focus when closing
restoreFocus();

// Focus first element in a container
focusFirst(containerElement);
```

## Benefits

1. **Consistency**: All pages use the same components
2. **Maintainability**: Update once, affects all pages
3. **Speed**: Faster development with reusable components
4. **Accessibility**: Components include proper ARIA attributes, keyboard shortcuts, and focus management
5. **Responsive**: Components work across screen sizes
6. **User Feedback**: Toast notifications for actions
7. **Loading States**: Better UX during async operations
8. **Keyboard Navigation**: Power-user shortcuts for faster workflow

## Migration Guide

When updating existing pages:

1. Import components at top of file
2. Replace custom button HTML with `Buttons.*` calls
3. Replace empty states with `EmptyState()` component
4. Add `PageHeader()` if page doesn't have one
5. Replace custom modals with `Modal()` component
6. Update CSS to use standard classes

## Notes

- All components use `escapeHtml()` for security
- Components return HTML strings (not DOM elements)
- Use template literals to combine components
- Components are scoped - add page-specific prefix if needed for CSS
