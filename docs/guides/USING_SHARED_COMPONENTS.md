# Using Shared Components

This guide shows how to use the standardized UI components across all pages for consistency.

## Import Components

```javascript
import { Buttons, EmptyState, PageHeader, StatCard, Tabs, Modal, FormField, Card } from '../ui/components.js';
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

## Card Component

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
  priority: 'high'
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

## Benefits

1. **Consistency**: All pages use the same components
2. **Maintainability**: Update once, affects all pages
3. **Speed**: Faster development with reusable components
4. **Accessibility**: Components include proper ARIA attributes
5. **Responsive**: Components work across screen sizes

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
