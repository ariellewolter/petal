# Workflow Integration Implementation Plan

## Overview

This plan details how to implement additional workflow integrations across the app, following the same successful pattern used for planner-tasks integration.

---

## Priority 1: Files ↔ Tasks Integration

### Current State
- Files can be linked to tasks via `fileIds` array in tasks
- File registry tracks which tasks/projects use each file
- Files page shows files but doesn't prominently show linked tasks
- Task drawer shows files but files page doesn't show tasks
- No drag & drop between files and tasks

### Implementation Plan

#### Phase 1: Visual Integration in Files Page

**1.1 Show Linked Tasks in File Cards**
- Location: `src/ui/renderFiles.js`
- Add task badges to file cards showing:
  - Linked task count
  - Task status indicators (Todo, Doing, Done)
  - Priority colors
- Show project badges if file linked to project tasks

**1.2 File Card Enhancements**
```javascript
// In renderFiles.js
const linkedTasks = file.tasks || [];
const activeTasks = linkedTasks.filter(t => !t.done);
const taskBadges = linkedTasks.map(task => {
  const priorityColor = getPriorityColor(task.priority);
  return `<span class="task-badge" style="background:${priorityColor}">${task.title}</span>`;
}).join('');
```

**1.3 Quick Actions in File Cards**
- "View Linked Tasks" button
- "Create Task from File" button
- "Link to Task" button

#### Phase 2: Drag & Drop

**2.1 Make Files Draggable**
- Location: `src/ui/renderFiles.js`
- Add `draggable="true"` to file cards
- Add drag handlers similar to task drag handlers

**2.2 Drop Zones**
- Task cards accept file drops
- Task drawer accepts file drops
- Project cards accept file drops

**2.3 Drop Handlers**
- Create new file converter utility: `src/utils/fileTaskConverter.js`
- Functions:
  - `fileToTask()` - Create task from file
  - `linkFileToTask()` - Link existing file to task
  - `unlinkFileFromTask()` - Remove file from task

#### Phase 3: Synchronization

**3.1 Task Deletion Sync**
- When task is deleted, update file registry
- Remove task reference from file's `tasks` array

**3.2 File Deletion Sync**
- When file is removed from project, remove from task's `fileIds`
- Update file registry

**3.3 Status Sync**
- Show file status (missing, stale) in task cards
- Show task status in file cards

### Files to Create/Modify
- `src/utils/fileTaskConverter.js` (NEW)
- `src/ui/renderFiles.js` (modify)
- `src/ui/renderTasks.js` (add drop zones)
- `src/features/fileManagement.js` (add sync functions)

---

## Priority 2: Workflow ↔ Tasks Enhanced Integration

### Current State
- Tasks have `lane` and `stage` fields
- Workflow view shows tasks in lanes/columns
- Limited drag & drop (only in workflow matrix)
- Tasks can be moved between lanes but not easily from task list

### Implementation Plan

#### Phase 1: Enhanced Drag & Drop

**1.1 Drag Tasks to Workflow Lanes**
- Make tasks draggable from task list to workflow lanes
- Visual feedback: highlight target lane during drag
- Auto-update task's `lane` and `stage` on drop

**1.2 Drag Between Workflow Columns**
- Allow dragging tasks between columns (Backlog → Next → Doing)
- Update task's `status` based on column
- Update task's `stage` based on lane

**1.3 Drop Handlers**
- Create: `src/features/workflow/workflowDragHandlers.js`
- Functions:
  - `handleTaskDragToLane()` - Drop task on lane
  - `handleTaskDragToColumn()` - Drop task on column
  - `updateTaskWorkflowPlacement()` - Update task lane/stage

#### Phase 2: Visual Integration

**2.1 Lane Badges in Task Cards**
- Show workflow lane badge in all task views
- Color-code by lane
- Show stage indicator

**2.2 Workflow Progress Indicators**
- Show workflow progress in project view
- Show lane distribution in task list
- Visual lane filters

**2.3 Smart Lane Suggestions**
- Suggest lane based on:
  - Task title keywords
  - Project's `workflowLanes` setting
  - Task priority
  - Task dependencies

#### Phase 3: Workflow Timeline Integration

**3.1 Tasks in Workflow Timeline**
- Show tasks in workflow timeline view
- Link workflow timeline to planner timeline
- Show task dependencies in timeline

**3.2 Timeline ↔ Planner Sync**
- Tasks scheduled in planner appear in workflow timeline
- Workflow tasks can be scheduled in planner
- Bidirectional sync

### Files to Create/Modify
- `src/features/workflow/workflowDragHandlers.js` (NEW)
- `src/ui/renderTasks.js` (add lane badges)
- `src/ui/renderLanes.js` (enhance drag & drop)
- `src/pages/WorkflowPage.js` (add timeline integration)

---

## Priority 3: Projects ↔ Tasks Enhanced Integration

### Current State
- Tasks belong to projects (`projectId`)
- Projects show their tasks
- Limited project-level task management
- No project timeline view

### Implementation Plan

#### Phase 1: Project Timeline View

**1.1 Project Timeline Component**
- Create: `src/ui/renderProjectTimeline.js`
- Show project tasks on a timeline
- Group tasks by date/due date
- Show project milestones
- Visual project progress tracking

**1.2 Timeline Integration**
- Add timeline tab to project view
- Show tasks scheduled in planner
- Show task dependencies
- Show project deadlines

#### Phase 2: Project-Task Synchronization

**2.1 Project Completion Tracking**
- Calculate project completion based on task completion
- Project progress bar
- Auto-archive project when all tasks done

**2.2 Task Archival Sync**
- When project is archived, archive all tasks
- When project is unarchived, unarchive tasks
- Sync project status to tasks

**2.3 Bulk Operations**
- "Schedule All Project Tasks" action
- "Archive All Project Tasks" action
- "Set Project Tasks Priority" action

#### Phase 3: Quick Actions

**3.1 Project Card Actions**
- "Create Task for Project" button
- "View All Project Tasks" modal
- "Schedule Project Tasks" bulk action

**3.2 Task Card Actions**
- "View Project" quick link
- "Project Timeline" link
- Project color indicator

### Files to Create/Modify
- `src/ui/renderProjectTimeline.js` (NEW)
- `src/ui/renderProjects.js` (add timeline tab)
- `src/features/projectOperations.js` (add sync functions)
- `src/ui/renderTasks.js` (add project quick actions)

---

## Priority 4: Files ↔ Projects Enhanced Integration

### Current State
- Files belong to projects
- Projects show their files
- Limited file-project workflow
- No file status tracking linked to projects

### Implementation Plan

#### Phase 1: File Status Tracking

**1.1 File Status Linked to Projects**
- Track file status (draft, needs-revision, submitted, accepted)
- Link file status to project progress
- Show file status in project view

**1.2 File Version Tracking**
- Link file versions to project milestones
- Track file submission status
- Show file progress in project timeline

#### Phase 2: Visual Integration

**2.1 Project Badges in Files Page**
- Show project badges on file cards
- Filter files by project
- Show project progress in file cards

**2.2 File Status Indicators**
- Show file status in project view
- File progress indicators
- Project file organization

#### Phase 3: Quick Actions

**3.1 Files Page Actions**
- "Add File to Project" from Files page
- "View Project Files" from project card
- Bulk file operations per project

**3.2 Project Page Actions**
- "Add File" quick action
- "View All Files" modal
- File status management

### Files to Create/Modify
- `src/ui/renderFiles.js` (add project badges)
- `src/ui/renderProjects.js` (add file status)
- `src/features/fileManagement.js` (add status tracking)

---

## Priority 5: Workflow ↔ Planner Integration

### Current State
- Workflow shows tasks in lanes/columns
- Planner shows scheduled events
- No connection between workflow and planner

### Implementation Plan

#### Phase 1: Timeline Integration

**1.1 Workflow Tasks in Planner**
- Show workflow tasks in planner timeline
- Link workflow stages to time blocks
- Show workflow progress over time

**1.2 Planner Blocks in Workflow**
- Show planner blocks in workflow view
- Link workflow placement to scheduling
- Visual connection between views

#### Phase 2: Cross-View Navigation

**2.1 Quick Navigation**
- Click workflow task → show in planner
- Click planner block → show in workflow
- Sync views when switching

**2.2 Visual Indicators**
- Show workflow lane in planner blocks
- Show scheduled time in workflow view
- Color-code by workflow lane

### Files to Create/Modify
- `src/pages/PlannerPage.js` (add workflow integration)
- `src/pages/WorkflowPage.js` (add planner integration)
- `src/utils/workflowPlannerConverter.js` (NEW)

---

## Implementation Patterns (Reusable)

### Pattern 1: Bidirectional Linking
```javascript
// Entity A ↔ Entity B
entityA.linkedEntityBId = entityB.id;
entityB.linkedEntityAId = entityA.id;

// Sync on changes
function syncEntityAtoB(entityA) {
  if (entityA.linkedEntityBId) {
    updateEntityB(entityA.linkedEntityBId, entityA);
  }
}
```

### Pattern 2: Drag & Drop
```javascript
// Source: Make draggable
sourceElement.setAttribute('draggable', 'true');
sourceElement.addEventListener('dragstart', (e) => {
  draggedItem = { type: 'entityA', data: entityA };
});

// Target: Accept drops
targetElement.addEventListener('drop', (e) => {
  if (draggedItem.type === 'entityA') {
    linkEntityAToB(draggedItem.data, entityB);
  }
});
```

### Pattern 3: Visual Distinction
```javascript
// Different styling for linked items
if (item.linkedEntityBId) {
  element.classList.add('linked-item');
  element.style.borderLeft = `3px solid ${linkColor}`;
  element.setAttribute('data-linked-id', item.linkedEntityBId);
}
```

### Pattern 4: Converter Utilities
```javascript
// src/utils/entityAEntityBConverter.js
export function entityAToEntityB(entityA, context) {
  return {
    ...entityBDefaults,
    linkedEntityAId: entityA.id,
    // Map fields
  };
}

export function entityBToEntityA(entityB, context) {
  return {
    ...entityADefaults,
    linkedEntityBId: entityB.id,
    // Map fields
  };
}
```

---

## Recommended Implementation Order

### Sprint 1: Files ↔ Tasks (High Impact)
1. Visual integration in Files page
2. Drag & drop files to tasks
3. Quick actions
4. Synchronization

**Estimated Time:** 1-2 weeks
**Impact:** High - Files are central to workflow

### Sprint 2: Workflow ↔ Tasks Enhanced (High Impact)
1. Enhanced drag & drop
2. Visual integration
3. Smart suggestions
4. Timeline integration

**Estimated Time:** 1-2 weeks
**Impact:** High - Core workflow feature

### Sprint 3: Projects ↔ Tasks Enhanced (Medium Impact)
1. Project timeline view
2. Project-task synchronization
3. Quick actions
4. Bulk operations

**Estimated Time:** 1 week
**Impact:** Medium - Improves project management

### Sprint 4: Files ↔ Projects & Workflow ↔ Planner (Medium Impact)
1. File status tracking
2. Visual integration
3. Cross-view navigation

**Estimated Time:** 1 week
**Impact:** Medium - Connects features

---

## Success Criteria

For each integration:
- ✅ Bidirectional linking works
- ✅ Drag & drop functional
- ✅ Visual distinction clear
- ✅ Synchronization automatic
- ✅ No breaking changes
- ✅ Backward compatible
- ✅ Performance acceptable
- ✅ User experience smooth

---

## Testing Strategy

### Unit Tests
- Converter functions
- Sync functions
- Drag handlers

### Integration Tests
- Drag & drop flows
- Sync flows
- Visual rendering

### User Testing
- Workflow efficiency
- Visual clarity
- Performance

---

## Notes

- All integrations follow planner-tasks pattern
- Use store for state management
- Keep backward compatibility
- Add visual indicators
- Provide quick actions
- Document in progress files
- Test thoroughly before release
