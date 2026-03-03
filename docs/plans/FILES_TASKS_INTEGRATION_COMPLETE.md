# Files ↔ Tasks Integration - Complete ✅

## Overview

Successfully implemented bidirectional integration between files and tasks, following the same proven pattern as the planner-tasks integration.

## Implementation Date

Completed: 2026-01-XX

## Features Implemented

### 1. Visual Integration ✅

**Task Badges on File Cards**
- File cards now show task badges with status and priority
- Badges display:
  - Task status (Todo, Doing, Done) with color coding
  - Priority indicator (left border color: high=red, medium=yellow, low=gray)
  - Completion status (✓ for done, ○ for active)
  - Hover effects for better UX
- Shows up to 3 task badges, with "+X more" indicator if more tasks are linked
- Clicking a badge opens the task drawer

**File Cards Enhanced**
- Files are now draggable (cursor: grab)
- Visual feedback during drag (opacity change)

### 2. Quick Actions ✅

**"View Linked Tasks" Button**
- Shows all tasks linked to a file
- Navigates to Tasks page with search filter
- Only appears when file has linked tasks

**"Create Task from File" Button**
- Creates a new task from a file
- Pre-fills task with file information
- Automatically links the file to the task
- Opens task drawer after creation
- Updates file registry automatically

**Task Badge Click**
- Clicking a task badge opens the task drawer
- Shows full task details

### 3. Drag & Drop ✅

**Files → Tasks**
- Files can be dragged from Files page
- Drop zones on task cards (visual feedback on hover)
- Dropping a file on a task card links the file to that task
- Updates file registry automatically
- Rerenders both Files and Tasks pages

**Visual Feedback**
- Task cards show background color change on drag over
- File cards show opacity change during drag
- Smooth transitions

### 4. Converter Utility ✅

**File-Task Converter** (`src/utils/fileTaskConverter.js`)
- `fileToTask()` - Creates a task from a file
- `addFileToTask()` - Adds a file to an existing task
- `removeFileFromTask()` - Removes a file from a task
- `isTaskLinkedToFile()` - Checks if task is linked to file
- `getFileKey()` - Extracts file key from file link object

### 5. Operations Module ✅

**File-Task Operations** (`src/features/fileTaskOperations.js`)
- `handleFileDragStart()` - Manages file drag state
- `handleFileDragEnd()` - Cleans up drag state
- `handleTaskCardDrop()` - Handles file drop on task card
- `createTaskFromFile()` - Creates task from file with quick action
- `viewFileTasks()` - Shows all tasks linked to a file
- `openTaskFromFile()` - Opens task drawer from file badge

### 6. Synchronization ✅

**Task Deletion → File Registry Update**
- When a task is deleted, file registry is automatically rebuilt
- Removes deleted task references from file registry
- Ensures file cards show accurate task counts

**Task Creation with Files → File Registry Update**
- When a task is created with files, file registry is updated
- New task appears in file's task list immediately

**File Added to Task → File Registry Update**
- When a file is dropped on a task, file registry is updated
- File card shows updated task count immediately

## Files Modified

### New Files Created
1. `src/utils/fileTaskConverter.js` - Converter utilities
2. `src/features/fileTaskOperations.js` - Operations module

### Files Modified
1. `src/ui/renderFiles.js`
   - Added task badges to file cards
   - Added drag attributes to file cards
   - Added quick action buttons
   - Enhanced file card rendering with task details

2. `src/ui/renderTasks.js`
   - Added drop zones to task cards
   - Added drag over/leave handlers

3. `src/pages/FilesPage.js`
   - Added event handlers for new quick actions
   - Wired up file-task operations

4. `src/app/init.js`
   - Exported FileTaskOperations module
   - Made available via `window.Petal.features.fileTaskOperations`

5. `src/features/deleteHandlers.js`
   - Added file registry sync on task deletion

6. `src/features/taskOperations.js`
   - Added file registry sync on task creation with files

## User Experience

### Before
- Files and tasks were separate
- No visual indication of relationships
- Manual linking required
- No quick actions

### After
- **Visual Integration**: See task status/priority on file cards
- **Drag & Drop**: Intuitive file-to-task linking
- **Quick Actions**: One-click task creation from files
- **Automatic Sync**: File registry always up to date
- **Better Navigation**: Click badges to open tasks

## Technical Details

### Data Flow
1. **File → Task**: File dragged to task card → `handleTaskCardDrop()` → `addFileToTask()` → Update store → Rebuild registry
2. **Task → File**: Task created with files → `addTask()` → Update store → Rebuild registry
3. **Task Deletion**: Task deleted → `softDeleteTask()` → Update store → Rebuild registry

### State Management
- Uses `window.Petal.store` for state management
- File registry rebuilt via `buildFileRegistry()` after changes
- All updates are immutable (no direct mutations)

### Event Handling
- Event delegation in FilesPage.js
- Drag events handled in fileTaskOperations.js
- Drop events handled inline in task cards (for performance)

## Testing Checklist

- [x] Task badges appear on file cards
- [x] Task badges show correct status/priority
- [x] Clicking badge opens task drawer
- [x] Files are draggable
- [x] Task cards accept file drops
- [x] Dropping file links it to task
- [x] "Create Task from File" works
- [x] "View Linked Tasks" works
- [x] File registry updates on task deletion
- [x] File registry updates on task creation
- [x] File registry updates on file drop

## Performance

- Task badges limited to 3 visible (prevents UI clutter)
- File registry rebuild is efficient (only on changes)
- Drag & drop uses native browser APIs (smooth performance)

## Future Enhancements

Potential improvements:
1. **Bulk Operations**: Link multiple files to a task at once
2. **File Status Sync**: Update file status based on task completion
3. **Smart Suggestions**: Suggest files when creating tasks
4. **File Timeline**: Show file activity timeline based on task history

## Notes

- Follows the same pattern as planner-tasks integration (proven successful)
- All changes are backward compatible
- No breaking changes to existing functionality
- File registry is the single source of truth for file-task relationships

---

**Status**: ✅ Complete and Ready for Use
