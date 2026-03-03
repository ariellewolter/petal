# Planner-Tasks Integration Progress

## Status: Phase 1, 2 & 3 Complete ✅

### Completed Work

#### Phase 1: Foundation ✅
- ✅ Extended task schema with planner scheduling fields
  - Added: `plannerEventId`, `scheduledDate`, `scheduledStartTime`, `scheduledDurationMin`, `autoCreateBlock`
  - Location: `src/domain/schema.js`
  
- ✅ Created task-to-event converter utility
  - File: `src/utils/taskEventConverter.js`
  - Functions: `taskToEvent()`, `eventToTaskScheduling()`, `shouldCreateBlockForTask()`, `getTasksForPlannerDate()`, `updateTaskFromEvent()`, `clearTaskScheduling()`
  
- ✅ Updated task creation to support scheduling fields
  - Modified: `src/features/taskOperations.js`
  - Auto-creates planner events when tasks have scheduling info
  - Links tasks and events bidirectionally

#### Phase 2: Drag & Drop Integration ✅
- ✅ Created task drag handlers
  - Functions: `handleTaskDragStart()`, `handleTaskDragEnd()`
  - Location: `src/features/plannerOperations.js`
  
- ✅ Extended timeline drop handler for tasks
  - Function: `handleTaskTimelineDrop()`
  - Creates or updates planner events when tasks are dropped
  - Updates task scheduling info bidirectionally
  
- ✅ Made tasks draggable in UI
  - Updated: `src/ui/renderTasks.js` - added `draggable="true"` and drag event listeners
  - Updated: `src/ui/renderLanes.js` - added `draggable="true"` attribute
  - Tasks can now be dragged from task list/lanes to planner timeline

### What Works Now

1. **Task Creation with Scheduling**
   - Tasks can be created with `scheduledDate`, `scheduledStartTime`, `scheduledDurationMin`
   - If scheduling info is provided, a planner event is automatically created
   - Task and event are linked bidirectionally

2. **Drag & Drop**
   - Tasks are draggable from task list and workflow lanes
   - Dropping a task on planner timeline creates/updates a planner event
   - Task scheduling info is updated automatically

3. **Bidirectional Linking**
   - Tasks have `plannerEventId` pointing to their event
   - Events have `linkedTaskId` pointing to their task
   - Both are kept in sync

4. **Visual Integration**
   - Task blocks appear in planner timeline with distinct styling
   - Priority-based border colors (low=blush, medium=sage, high=rose)
   - Task icon (📋 for active, ✓ for completed)
   - Shows task status, project, and completion state
   - Clicking task block opens task drawer (not event modal)

#### Phase 3: Visual Integration ✅
- ✅ Render task blocks in planner timeline
  - Tasks with `scheduledDate` or `plannerEventId` appear in planner
  - Tasks converted to events for display automatically
  - Location: `src/pages/PlannerPage.js`
  
- ✅ Add visual distinction for task blocks
  - Different styling: priority-based border color, task icon (📋 or ✓)
  - Shows task priority, project, status in block
  - Completed tasks show strikethrough and reduced opacity
  
- ✅ Task block interactions
  - Clicking task block opens task drawer (not event modal)
  - Task blocks have `data-task-id` and `data-is-task-block` attributes
  - Different click handler for task blocks vs. regular events

#### Phase 4: Synchronization ✅
- ✅ Task completion sync
  - When task is marked done, update linked event `taskDone` and `taskStatus`
  - Completed task blocks show strikethrough/grayed out in planner
  - Location: `src/features/taskOperations.js` in `toggleTask()`
  
- ✅ Event deletion sync
  - When event linked to task is deleted, clear task scheduling
  - Uses `clearTaskScheduling()` to remove scheduling fields
  - Task is kept, only scheduling info is removed
  - Location: `src/features/plannerOperations.js` in `deleteEvent()`
  
- ✅ Event time change sync
  - When event time/duration changes, update task scheduling
  - Updates task's `scheduledDate`, `scheduledStartTime`, `scheduledDurationMin`
  - Updates task's `estimatedMinutes` if duration changed
  - Location: `src/features/plannerOperations.js` in `syncEventToTask()`
  - Called from `tasklist.html` in `submitEventModal()`

### Next Steps (Phase 5 & 6)

#### Phase 5: Smart Suggestions (Future)
- Suggest blocks from tasks with due dates
- UI for accepting/rejecting suggestions

#### Phase 6: Enhanced Modals (Future)
- Add scheduling fields to task modal
- Quick schedule actions ("Schedule for Today", etc.)

### Implementation Notes

1. **Backward Compatibility**
   - Existing tasks without scheduling fields work as before
   - `timeBlock` field kept for project view grouping
   - No breaking changes

2. **Store Integration**
   - All updates go through `window.Petal.store`
   - Auto-saves via persistence layer
   - Planner re-renders automatically on store updates

3. **Event Delegation**
   - Drag handlers are attached after rendering
   - Uses event delegation pattern where possible
   - Prevents duplicate handlers

### Testing Checklist

- [ ] Create task with scheduling → Block appears in planner
- [ ] Drag task to planner → Block created and linked
- [ ] Update task scheduling → Event updates
- [ ] Delete event linked to task → Task scheduling cleared
- [ ] Complete task → Block shows as completed
- [ ] Drag task to different time → Event time updates

### Files Modified

1. `src/domain/schema.js` - Extended task schema
2. `src/utils/taskEventConverter.js` - NEW: Converter utilities
3. `src/features/taskOperations.js` - Auto-create blocks on task creation
4. `src/features/plannerOperations.js` - Drag handlers and timeline drop
5. `src/ui/renderTasks.js` - Made tasks draggable
6. `src/ui/renderLanes.js` - Made tasks draggable
7. `src/pages/PlannerPage.js` - Render task blocks with visual distinction

### Known Issues / TODOs

- [ ] Need to implement Phase 4 (synchronization)
- [ ] Need to handle task completion sync to events
- [ ] Need to handle event deletion sync to tasks
- [ ] Need to handle event time change sync to tasks
- [ ] Need to add scheduling fields to task modal UI (Phase 6)
- [ ] Need to implement smart suggestions (Phase 5)
