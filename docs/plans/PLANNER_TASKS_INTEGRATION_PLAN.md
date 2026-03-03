# Planner-Tasks Integration Plan

## Overview

This plan outlines how to integrate planner blocks made with tasks more cohesively, creating a bidirectional relationship between tasks and planner events/blocks.

---

## Current State Analysis

### What Exists Now

1. **Tasks have `timeBlock` field** (string: "morning", "afternoon", etc.)
   - Used for grouping in project views
   - NOT connected to actual planner events
   - Location: `src/features/taskOperations.js:205`

2. **Events can link to tasks** via `linkedTaskId`
   - Events can reference tasks
   - Tasks don't automatically create events
   - Location: `src/features/plannerOperations.js:158`

3. **Planner timeline supports drag & drop**
   - Routines and habits can be dragged to create events
   - Tasks cannot be dragged to planner yet
   - Location: `src/features/plannerOperations.js:426`

4. **Events are separate entities**
   - Stored in `state.events` array
   - Not derived from tasks
   - Have their own lifecycle

### Gaps Identified

1. ❌ Tasks with `timeBlock` don't appear in planner timeline
2. ❌ Tasks cannot be dragged onto planner to create blocks
3. ❌ Creating a task doesn't automatically create a planner block
4. ❌ Tasks and events are not synchronized (task completion doesn't update event)
5. ❌ No way to convert a task to a planner block or vice versa
6. ❌ Tasks with due dates don't automatically suggest planner blocks

---

## Integration Goals

### Primary Goals

1. **Bidirectional Linking**: Tasks and planner blocks should be tightly coupled
2. **Automatic Block Creation**: Tasks with time information should create planner blocks
3. **Drag & Drop**: Tasks should be draggable onto planner timeline
4. **Visual Integration**: Tasks should appear in planner with visual distinction
5. **Synchronization**: Task completion/updates should reflect in planner blocks

### Secondary Goals

6. **Smart Suggestions**: Suggest planner blocks based on task due dates and priorities
7. **Time Estimation**: Use task `estimatedMinutes` to set block duration
8. **Context Awareness**: Show task context (project, priority) in planner blocks

---

## Implementation Plan

### Phase 1: Task-to-Event Conversion (Foundation)

#### 1.1 Extend Task Schema

**File**: `src/domain/schema.js`

Add new fields to task schema:
```javascript
{
  // Existing fields...
  timeBlock: null, // Keep for backward compatibility
  
  // New fields for planner integration
  plannerEventId: null,        // ID of linked planner event
  scheduledDate: null,         // ISO date string (YYYY-MM-DD)
  scheduledStartTime: null,    // Time string (HH:MM)
  scheduledDurationMin: null,  // Duration in minutes (from estimatedMinutes or default)
  autoCreateBlock: false,      // Whether to auto-create block when task is created
}
```

#### 1.2 Create Task-to-Event Converter

**File**: `src/utils/taskEventConverter.js` (NEW)

```javascript
/**
 * Convert a task to a planner event
 */
export function taskToEvent(task, dateOverride = null) {
  const scheduledDate = dateOverride || task.scheduledDate || task.due || new Date().toISOString().split('T')[0];
  const startTime = task.scheduledStartTime || '09:00'; // Default to 9am
  const duration = task.scheduledDurationMin || task.estimatedMinutes || 60; // Default 1 hour
  
  return {
    id: `evt_task_${task.id}_${Date.now()}`,
    title: task.title,
    date: scheduledDate,
    startTime: startTime,
    durationMin: duration,
    category: getTaskCategory(task), // Based on project, lane, or priority
    location: null,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    notes: task.notes || '',
    linkedProjectId: task.projectId || null,
    linkedTaskId: task.id, // Bidirectional link
    isTaskBlock: true, // Flag to identify task-derived blocks
    taskPriority: task.priority || 2,
    taskStatus: task.status || 'Todo'
  };
}

/**
 * Convert a planner event back to task scheduling info
 */
export function eventToTaskScheduling(event) {
  return {
    scheduledDate: event.date,
    scheduledStartTime: event.startTime,
    scheduledDurationMin: event.durationMin,
    plannerEventId: event.id
  };
}
```

#### 1.3 Update Task Creation to Auto-Create Blocks

**File**: `src/features/taskOperations.js`

Modify `addTask()` function:
- Check if task has scheduling info (`scheduledDate`, `scheduledStartTime`)
- If yes, automatically create a planner event
- Link task and event bidirectionally

---

### Phase 2: Drag & Drop Integration

#### 2.1 Make Tasks Draggable

**File**: `src/ui/renderTasks.js` or `src/ui/renderLanes.js`

Add drag handlers to task cards:
```javascript
taskCard.setAttribute('draggable', 'true');
taskCard.ondragstart = (e) => handleTaskDragStart(e, task);
taskCard.ondragend = (e) => handleTaskDragEnd(e);
```

#### 2.2 Create Task Drag Handler

**File**: `src/features/plannerOperations.js`

Add task drag state and handlers:
```javascript
let draggedTask = null;

export function handleTaskDragStart(event, task) {
  draggedTask = {
    id: task.id,
    title: task.title,
    estimatedMinutes: task.estimatedMinutes || 60,
    priority: task.priority || 2,
    projectId: task.projectId || null
  };
  
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', task.title);
  event.target.closest('.task-card')?.classList.add('dragging');
}

export function handleTaskDragEnd(event) {
  event.target.closest('.task-card')?.classList.remove('dragging');
  draggedTask = null;
}
```

#### 2.3 Extend Timeline Drop Handler

**File**: `src/features/plannerOperations.js`

Modify `handleTimelineDrop()` to support tasks:
```javascript
export function handleTimelineDrop(ctx, event, hour, dateStr) {
  // ... existing routine/habit logic ...
  
  if (draggedTask) {
    // Create event from task
    const eventObj = taskToEvent(draggedTask, dateStr);
    eventObj.startTime = formatTimeFunction(hour * 60 + minutesIntoHour);
    
    // Update task with scheduling info
    updateTaskScheduling(draggedTask.id, {
      scheduledDate: dateStr,
      scheduledStartTime: eventObj.startTime,
      scheduledDurationMin: eventObj.durationMin,
      plannerEventId: eventObj.id
    });
    
    // Add event to store
    addEventToStore(eventObj);
    
    draggedTask = null;
    return;
  }
  
  // ... existing routine/habit logic ...
}
```

---

### Phase 3: Visual Integration in Planner

#### 3.1 Render Task Blocks in Planner

**File**: `src/pages/PlannerPage.js`

Modify `renderDailyPlanner()` to:
1. Get tasks with `plannerEventId` or `scheduledDate` matching current day
2. Convert tasks to events if they have scheduling info
3. Render task blocks with visual distinction (different color, icon)

```javascript
// In renderDailyPlanner()
const tasks = state.tasks || [];
const tasksForToday = tasks.filter(t => {
  if (t.plannerEventId) {
    // Task already has linked event
    return dayEvents.some(e => e.id === t.plannerEventId);
  }
  // Task has scheduling info for today
  return t.scheduledDate === dateStr;
});

// Convert tasks to events for display
const taskEvents = tasksForToday
  .filter(t => !t.plannerEventId) // Only tasks without linked events
  .map(t => taskToEvent(t, dateStr));

const allDayEvents = [...dayEvents, ...taskEvents];
```

#### 3.2 Visual Distinction for Task Blocks

**File**: `src/pages/PlannerPage.js` or CSS

Add visual indicators:
- Different background color for task blocks
- Task icon (✓ or 📋) in block
- Priority indicator (color border)
- Project badge if task belongs to project

#### 3.3 Task Block Interaction

**File**: `src/pages/PlannerPage.js`

When clicking a task block:
- Open task drawer (not event modal)
- Show task details
- Allow editing task scheduling from planner

---

### Phase 4: Synchronization

#### 4.1 Task Completion Sync

**File**: `src/features/taskOperations.js`

When task is marked done:
- If task has `plannerEventId`, mark linked event as completed
- Update event visual state (strikethrough, grayed out)
- Optionally remove event from planner (or keep as completed)

#### 4.2 Event Deletion Sync

**File**: `src/features/plannerOperations.js`

When event is deleted:
- If event has `linkedTaskId` and `isTaskBlock === true`:
  - Clear task's scheduling info (`scheduledDate`, `scheduledStartTime`, `plannerEventId`)
  - Keep task, just remove scheduling

#### 4.3 Event Time Change Sync

**File**: `src/features/plannerOperations.js`

When event time/duration is changed:
- If event has `linkedTaskId`:
  - Update task's `scheduledStartTime` and `scheduledDurationMin`
  - Update task's `estimatedMinutes` if changed

---

### Phase 5: Smart Suggestions

#### 5.1 Suggest Blocks from Tasks

**File**: `src/features/plannerOperations.js` (NEW function)

```javascript
/**
 * Suggest planner blocks based on tasks with due dates
 */
export function suggestBlocksFromTasks(ctx) {
  const { tasks, projects } = ctx;
  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  // Get tasks with due dates in next week that aren't scheduled
  const unscheduledTasks = tasks.filter(t => {
    if (t.done || t.deletedAt) return false;
    if (t.plannerEventId || t.scheduledDate) return false; // Already scheduled
    if (!t.due) return false;
    
    const dueDate = new Date(t.due);
    return dueDate >= new Date(today) && dueDate <= weekFromNow;
  });
  
  // Group by due date
  const suggestions = {};
  unscheduledTasks.forEach(task => {
    const dueDate = task.due.split('T')[0];
    if (!suggestions[dueDate]) {
      suggestions[dueDate] = [];
    }
    suggestions[dueDate].push({
      task,
      suggestedTime: suggestTimeForTask(task), // Based on priority, estimated time
      suggestedDuration: task.estimatedMinutes || 60
    });
  });
  
  return suggestions;
}
```

#### 5.2 UI for Suggestions

**File**: `src/pages/PlannerPage.js`

Add a "Suggest Blocks" button in planner header:
- Shows modal with suggested blocks
- User can accept/reject suggestions
- Accepted suggestions create events and link to tasks

---

### Phase 6: Enhanced Task Modal

#### 6.1 Add Scheduling Fields to Task Modal

**File**: `src/features/modalOperations.js`

Add to task modal:
- Date picker for `scheduledDate`
- Time picker for `scheduledStartTime`
- Duration input (defaults to `estimatedMinutes`)
- "Create Planner Block" checkbox (`autoCreateBlock`)

#### 6.2 Quick Schedule Actions

**File**: `src/features/taskOperations.js`

Add quick actions:
- "Schedule for Today" button
- "Schedule for Tomorrow" button
- "Schedule for This Week" button
- "Remove Schedule" button (if already scheduled)

---

## Data Flow

### Creating Task with Block

```
User creates task with scheduling info
  ↓
addTask() in taskOperations.js
  ↓
Check if scheduledDate/scheduledStartTime set
  ↓
If yes: taskToEvent() creates event
  ↓
Add event to store
  ↓
Link task.plannerEventId = event.id
  ↓
Link event.linkedTaskId = task.id
  ↓
Store updates → Planner re-renders
```

### Dragging Task to Planner

```
User drags task card
  ↓
handleTaskDragStart() sets draggedTask
  ↓
User drops on planner timeline
  ↓
handleTimelineDrop() detects draggedTask
  ↓
taskToEvent() creates event with drop time
  ↓
updateTaskScheduling() updates task
  ↓
addEventToStore() adds event
  ↓
Store updates → Planner shows new block
```

### Task Completion

```
User marks task done
  ↓
toggleTask() updates task.status = 'Done'
  ↓
Check if task.plannerEventId exists
  ↓
If yes: Update linked event (visual state)
  ↓
Store updates → Planner shows completed block
```

---

## UI/UX Considerations

### Visual Design

1. **Task Blocks**:
   - Color: Use task priority color (or project color)
   - Icon: Task icon (✓ or 📋) in top-left
   - Border: Priority-based border thickness/color
   - Badge: Project name if task belongs to project

2. **Event Blocks** (non-task):
   - Keep existing styling
   - No task icon

3. **Completed Task Blocks**:
   - Strikethrough title
   - Reduced opacity
   - Grayed out

### Interactions

1. **Click Task Block**:
   - Open task drawer (not event modal)
   - Show full task details
   - Allow editing scheduling

2. **Drag Task Block**:
   - Allow rescheduling by dragging
   - Update task's `scheduledStartTime`
   - Update linked event

3. **Hover Task Block**:
   - Show tooltip with task details
   - Show priority, project, due date

---

## Migration Strategy

### Backward Compatibility

1. **Existing Tasks**:
   - Tasks with `timeBlock` field: Keep for backward compatibility
   - Don't auto-convert (user can manually schedule)
   - `timeBlock` remains for project view grouping

2. **Existing Events**:
   - Events without `linkedTaskId`: Keep as-is
   - No breaking changes

3. **Gradual Migration**:
   - New tasks can opt-in to scheduling
   - Existing tasks can be scheduled manually
   - No forced migration

---

## Implementation Order

### Phase 1: Foundation (Week 1)
- [ ] Extend task schema
- [ ] Create `taskEventConverter.js`
- [ ] Update task creation to support scheduling fields

### Phase 2: Drag & Drop (Week 1-2)
- [ ] Make tasks draggable
- [ ] Create task drag handlers
- [ ] Extend timeline drop handler

### Phase 3: Visual Integration (Week 2)
- [ ] Render task blocks in planner
- [ ] Add visual distinction
- [ ] Implement task block interactions

### Phase 4: Synchronization (Week 2-3)
- [ ] Task completion sync
- [ ] Event deletion sync
- [ ] Event time change sync

### Phase 5: Smart Suggestions (Week 3)
- [ ] Implement suggestion algorithm
- [ ] Create suggestions UI
- [ ] Add accept/reject flow

### Phase 6: Enhanced Modals (Week 3-4)
- [ ] Add scheduling fields to task modal
- [ ] Add quick schedule actions
- [ ] Polish UI/UX

---

## Testing Checklist

### Functional Tests

- [ ] Create task with scheduling → Block appears in planner
- [ ] Drag task to planner → Block created and linked
- [ ] Complete task → Block shows as completed
- [ ] Delete event linked to task → Task scheduling cleared
- [ ] Change event time → Task scheduling updated
- [ ] Accept suggestion → Block created and linked

### Edge Cases

- [ ] Task with no `estimatedMinutes` → Default duration used
- [ ] Task with past due date → Handle gracefully
- [ ] Multiple tasks scheduled for same time → Show conflicts
- [ ] Task deleted → Linked event handled (delete or keep?)

### UI Tests

- [ ] Task blocks visually distinct from event blocks
- [ ] Task blocks show priority/project correctly
- [ ] Drag & drop works smoothly
- [ ] Clicking task block opens task drawer
- [ ] Suggestions UI is clear and usable

---

## Future Enhancements

1. **Recurring Task Blocks**: Tasks that repeat (daily, weekly)
2. **Time Block Templates**: Pre-defined time blocks for common task types
3. **Auto-Scheduling**: AI/ML to suggest optimal scheduling
4. **Conflict Resolution**: Smart suggestions for overlapping blocks
5. **Calendar Integration**: Sync with external calendars
6. **Time Tracking**: Track actual time spent vs. estimated

---

## Notes

- Keep `timeBlock` field for backward compatibility (project view grouping)
- New `scheduledDate`/`scheduledStartTime` fields are for planner integration
- Events and tasks remain separate entities, but tightly linked
- All changes should be opt-in (no forced migration)
