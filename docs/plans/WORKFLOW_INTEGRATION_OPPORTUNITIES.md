# Workflow Integration Opportunities

## Overview

This document identifies additional workflow integration opportunities across the app, similar to the planner-tasks integration we just completed. Each opportunity follows the same pattern: bidirectional linking, drag & drop, visual integration, and synchronization.

---

## Current State Analysis

### Existing Integrations ✅
1. **Tasks ↔ Planner** - ✅ COMPLETE (just implemented)
   - Tasks can be scheduled in planner
   - Drag & drop from tasks to planner
   - Visual distinction for task blocks
   - Bidirectional sync

2. **Habits/Routines ↔ Planner** - ✅ EXISTS
   - Habits/routines can be dragged to planner
   - Creates events from habits/routines

3. **Tasks ↔ Projects** - ✅ EXISTS (basic)
   - Tasks can belong to projects (`projectId`)
   - Projects show their tasks
   - Limited bidirectional sync

4. **Files ↔ Tasks/Projects** - ✅ EXISTS (basic)
   - Files can be linked to tasks (`fileIds`)
   - Files can belong to projects
   - File registry tracks links
   - Limited visual integration

5. **Tasks ↔ Workflow** - ✅ EXISTS (basic)
   - Tasks have lanes/stages
   - Workflow view shows tasks
   - Limited drag & drop

---

## Integration Opportunities

### 1. Files ↔ Tasks Integration (High Priority)

#### Current State
- Files can be linked to tasks via `fileIds` array
- Files page shows files but doesn't show linked tasks prominently
- Task drawer shows files but files page doesn't show tasks
- No drag & drop between files and tasks

#### Opportunities

**1.1 Visual Integration in Files Page**
- Show linked tasks in file cards
- Show task status (Todo, Doing, Done) on file cards
- Color-code files by linked task priority
- Show project badges if file linked to project tasks

**1.2 Drag & Drop**
- Drag files from Files page to Tasks page to create tasks
- Drag files to task cards to link them
- Drag files to project cards to add to project

**1.3 Quick Actions**
- "Create Task from File" button in Files page
- "Link to Task" quick action
- "View Linked Tasks" modal/drawer

**1.4 Synchronization**
- When task is deleted, update file registry
- When file is deleted, remove from task's `fileIds`
- Show file status (missing, stale) in task cards

**Implementation Priority:** HIGH
**Complexity:** Medium
**Impact:** High - Files are central to workflow

---

### 2. Workflow ↔ Tasks Enhanced Integration (High Priority)

#### Current State
- Tasks have `lane` and `stage` fields
- Workflow view shows tasks in lanes/columns
- Limited drag & drop (only in workflow matrix)
- Tasks can be moved between lanes but not easily

#### Opportunities

**2.1 Enhanced Drag & Drop**
- Drag tasks from task list to workflow lanes
- Drag tasks between workflow columns
- Visual feedback during drag (lane highlighting)
- Auto-suggest lane based on task properties

**2.2 Visual Integration**
- Show workflow lane/stage in task cards (all views)
- Color-code tasks by lane in task list
- Show workflow progress in project view
- Lane badges in task cards

**2.3 Smart Suggestions**
- Suggest workflow placement based on:
  - Task title/keywords
  - Project's `workflowLanes` setting
  - Task priority
  - Task dependencies

**2.4 Workflow Timeline Integration**
- Show tasks in workflow timeline view
- Link workflow timeline to planner timeline
- Show task dependencies in timeline

**Implementation Priority:** HIGH
**Complexity:** Medium-High
**Impact:** High - Core workflow feature

---

### 3. Projects ↔ Tasks Enhanced Integration (Medium Priority)

#### Current State
- Tasks belong to projects (`projectId`)
- Projects show their tasks
- Limited project-level task management

#### Opportunities

**3.1 Project Timeline View**
- Show project tasks on a timeline
- Group tasks by date/due date
- Show project milestones
- Visual project progress tracking

**3.2 Project-Task Synchronization**
- When project is archived, archive all tasks
- Project completion based on task completion
- Project progress bar based on tasks
- Auto-create project tasks from templates

**3.3 Quick Actions**
- "Create Task for Project" from project card
- "View All Project Tasks" modal
- "Schedule Project Tasks" bulk action

**3.4 Visual Integration**
- Show project color in task cards
- Project badges in task list
- Project progress indicators
- Project timeline in project view

**Implementation Priority:** MEDIUM
**Complexity:** Medium
**Impact:** Medium - Improves project management

---

### 4. Files ↔ Projects Enhanced Integration (Medium Priority)

#### Current State
- Files belong to projects
- Projects show their files
- Limited file-project workflow

#### Opportunities

**4.1 File Status Tracking**
- Link file status to project progress
- Show file status in project view
- File version tracking linked to project milestones
- File submission status tracking

**4.2 Visual Integration**
- Show project files in Files page with project badges
- Show file status in project view
- File progress indicators
- Project file organization

**4.3 Quick Actions**
- "Add File to Project" from Files page
- "View Project Files" from project card
- Bulk file operations per project

**Implementation Priority:** MEDIUM
**Complexity:** Low-Medium
**Impact:** Medium - Improves file organization

---

### 5. Today Page ↔ Planner Integration (Low Priority)

#### Current State
- Today page shows today's tasks and events
- Planner shows scheduled events
- Limited cross-page integration

#### Opportunities

**5.1 Quick Schedule Actions**
- "Schedule for Today" button in Today page
- "Schedule for Tomorrow" button
- "Add to Planner" quick action
- Drag tasks from Today to Planner

**5.2 Visual Integration**
- Show planner blocks in Today page schedule card
- Link Today page events to planner
- Show upcoming planner blocks

**Implementation Priority:** LOW
**Complexity:** Low
**Impact:** Low - Nice to have

---

### 6. Habits/Routines ↔ Tasks Integration (Low Priority)

#### Current State
- Habits/routines are separate from tasks
- Can be dragged to planner to create events
- No direct task linking

#### Opportunities

**6.1 Convert to Tasks**
- "Convert Habit to Task" action
- "Convert Routine to Task" action
- Create recurring tasks from habits/routines

**6.2 Link Habits to Tasks**
- Link habits to specific tasks
- Track habit completion with task completion
- Show habit progress in task view

**Implementation Priority:** LOW
**Complexity:** Low
**Impact:** Low - Nice to have

---

### 7. Workflow ↔ Planner Integration (Medium Priority)

#### Current State
- Workflow shows tasks in lanes/columns
- Planner shows scheduled events
- No connection between workflow and planner

#### Opportunities

**7.1 Workflow Timeline ↔ Planner Timeline**
- Show workflow tasks in planner timeline
- Link workflow stages to time blocks
- Show workflow progress over time
- Schedule workflow tasks in planner

**7.2 Visual Integration**
- Show planner blocks in workflow view
- Show workflow lane in planner blocks
- Link workflow placement to scheduling

**Implementation Priority:** MEDIUM
**Complexity:** Medium-High
**Impact:** Medium - Connects two major views

---

### 8. Files ↔ Planner Integration (Low Priority)

#### Current State
- Files can be linked to tasks
- Tasks can be scheduled in planner
- No direct file-planner connection

#### Opportunities

**8.1 File-Based Time Blocks**
- Schedule time blocks for file work
- "Work on File" planner blocks
- Link files to planner events
- Show file deadlines in planner

**Implementation Priority:** LOW
**Complexity:** Low
**Impact:** Low - Nice to have

---

## Recommended Implementation Order

### Phase 1: High-Impact Integrations (Next)
1. **Files ↔ Tasks Integration**
   - Visual integration in Files page
   - Drag & drop files to tasks
   - Quick actions for file-task linking
   - Synchronization

2. **Workflow ↔ Tasks Enhanced Integration**
   - Enhanced drag & drop
   - Visual integration
   - Smart suggestions

### Phase 2: Medium-Impact Integrations
3. **Projects ↔ Tasks Enhanced Integration**
   - Project timeline view
   - Project-task synchronization
   - Quick actions

4. **Workflow ↔ Planner Integration**
   - Timeline integration
   - Visual cross-linking

5. **Files ↔ Projects Enhanced Integration**
   - File status tracking
   - Visual integration

### Phase 3: Nice-to-Have Integrations
6. **Today Page ↔ Planner Integration**
7. **Habits/Routines ↔ Tasks Integration**
8. **Files ↔ Planner Integration**

---

## Implementation Patterns

### Pattern 1: Bidirectional Linking (like planner-tasks)
```javascript
// Entity A has reference to Entity B
entityA.linkedEntityBId = entityB.id;

// Entity B has reference to Entity A
entityB.linkedEntityAId = entityA.id;

// Sync on changes
```

### Pattern 2: Drag & Drop Integration
```javascript
// Make source draggable
sourceElement.setAttribute('draggable', 'true');
sourceElement.addEventListener('dragstart', handleDragStart);

// Make target droppable
targetElement.addEventListener('drop', handleDrop);
targetElement.addEventListener('dragover', handleDragOver);
```

### Pattern 3: Visual Distinction
```javascript
// Different styling for integrated items
if (item.isLinked) {
  element.classList.add('linked-item');
  element.style.borderLeft = `3px solid ${linkColor}`;
}
```

### Pattern 4: Synchronization
```javascript
// Sync on entity changes
function onEntityAChange(entityA) {
  if (entityA.linkedEntityBId) {
    updateEntityB(entityA.linkedEntityBId, entityA);
  }
}
```

---

## Success Metrics

For each integration:
- ✅ Bidirectional linking works
- ✅ Drag & drop functional
- ✅ Visual distinction clear
- ✅ Synchronization automatic
- ✅ No breaking changes
- ✅ Backward compatible

---

## Notes

- All integrations should follow the same pattern as planner-tasks
- Use store for state management (single source of truth)
- Keep backward compatibility
- Add visual indicators for linked items
- Provide quick actions for common workflows
- Document in integration progress files
