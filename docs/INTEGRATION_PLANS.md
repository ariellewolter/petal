# Integration Plans

**Last Updated:** Based on current codebase analysis

## Overview

This document consolidates all integration plans and opportunities across the Petal task tracker application.

---

## ✅ Completed Integrations

### Planner ↔ Tasks Integration ✅ COMPLETE

**Status:** Phases 1-4 complete and functional

**Features:**
- ✅ Task scheduling with `scheduledDate`, `scheduledStartTime`, `scheduledDurationMin`
- ✅ Auto-creates planner events when tasks are created with scheduling info
- ✅ Bidirectional linking: tasks ↔ events
- ✅ Drag & drop tasks to planner timeline
- ✅ Task blocks appear in planner with visual distinction
- ✅ Task completion syncs to events
- ✅ Event deletion clears task scheduling
- ✅ Event time changes sync to tasks

**Files Modified:**
- `src/domain/schema.js` - Extended task schema
- `src/utils/taskEventConverter.js` - Converter utilities
- `src/features/taskOperations.js` - Auto-create planner blocks
- `src/features/plannerOperations.js` - Task drag handlers
- `src/ui/renderTasks.js` - Made tasks draggable
- `src/ui/renderLanes.js` - Made tasks draggable
- `src/pages/PlannerPage.js` - Render task blocks

**Visual Design:**
- Priority-based border colors (low/medium/high)
- Task icon (📋 active, ✓ completed)
- Completed tasks: strikethrough + reduced opacity

---

## 🚧 In Progress

### Cohesion & Component Standardization

**Status:** Phase 1 complete, Phase 2 in progress

**Completed:**
- ✅ Shared component library created (`src/ui/components.js`)
- ✅ Standardized CSS styles (`src/styles/main.css`)
- ✅ Documentation created
- ✅ Pages updated to use standard components:
  - Tasks Page - PageHeader
  - Projects Page - PageHeader
  - Files Page - PageHeader, StatCard
  - Planner Page - PageHeader
  - Workflow Page - PageHeader
  - Cell Log Page - PageHeader
- ✅ Empty states standardized across all pages

**Components Available:**
- `Buttons` - Primary, secondary, and icon buttons
- `EmptyState` - Standardized empty states
- `PageHeader` - Consistent page headers
- `StatCard` - Statistics cards
- `Tabs` - Tab navigation
- `Modal` - Standard modal component
- `FormField` - Form input fields
- `Card` - Enhanced card component
- `Forms` - Form utilities

**Remaining Work:**
- [ ] Update remaining pages to use standard components
- [ ] Standardize modal patterns
- [ ] Add stats/overview to pages
- [ ] Standardize card components across all pages
- [ ] Create notification/toast system

---

## 🎯 Planned Integrations

### 1. Files ↔ Tasks Integration ⭐ HIGH PRIORITY

**Why:** Files are central to workflow - users constantly link files to tasks

**Opportunities:**
- Visual: Show linked tasks in Files page
- Drag & Drop: Drag files to tasks/projects
- Quick Actions: "Create Task from File", "Link to Task"
- Sync: Task deletion → update file registry, File deletion → remove from tasks

**Impact:** HIGH - Files are used constantly  
**Complexity:** Medium  
**Estimated Time:** 1-2 weeks

**Key Features:**
- Task badges on file cards (showing status, priority)
- Drag files from Files page to Tasks page
- Quick "Create Task" from file context menu
- File status indicators in task cards

---

### 2. Workflow ↔ Tasks Enhanced Integration ⭐ HIGH PRIORITY

**Why:** Core workflow feature - tasks move through lanes/stages

**Opportunities:**
- Enhanced Drag & Drop: Drag tasks from list to workflow lanes
- Visual: Lane badges in all task views
- Smart Suggestions: Auto-suggest lane based on task properties
- Timeline: Show tasks in workflow timeline, link to planner

**Impact:** HIGH - Core workflow functionality  
**Complexity:** Medium-High  
**Estimated Time:** 1-2 weeks

**Key Features:**
- Drag tasks to workflow lanes from task list
- Lane/column badges in task cards
- Workflow timeline showing task progression
- Smart lane suggestions based on keywords/project

---

### 3. Projects ↔ Tasks Enhanced Integration

**Why:** Projects are collections of tasks - better integration improves project management

**Opportunities:**
- Project Timeline: Show project tasks on timeline
- Sync: Project completion based on tasks, archive sync
- Quick Actions: "Create Task for Project", bulk scheduling
- Visual: Project color in task cards, progress indicators

**Impact:** MEDIUM - Improves project management  
**Complexity:** Medium  
**Estimated Time:** 1 week

---

### 4. Workflow ↔ Planner Integration

**Why:** Connects two major views - workflow and time planning

**Opportunities:**
- Timeline Integration: Show workflow tasks in planner
- Cross-View: Click workflow task → show in planner
- Visual: Show workflow lane in planner blocks
- Sync: Workflow placement ↔ scheduling

**Impact:** MEDIUM - Connects major features  
**Complexity:** Medium-High  
**Estimated Time:** 1 week

---

### 5. Files ↔ Projects Enhanced Integration

**Why:** Files belong to projects - better organization

**Opportunities:**
- File Status: Link file status to project progress
- Visual: Project badges in Files page
- Quick Actions: "Add File to Project", bulk operations
- Status Tracking: File versions linked to milestones

**Impact:** MEDIUM - Better file organization  
**Complexity:** Low-Medium  
**Estimated Time:** 3-5 days

---

## 🔮 Nice-to-Have Integrations

### 6. Today Page ↔ Planner Integration
- Quick schedule actions ("Schedule for Today")
- Show planner blocks in Today page
- **Impact:** LOW | **Time:** 2-3 days

### 7. Habits/Routines ↔ Tasks Integration
- Convert habits/routines to tasks
- Link habits to tasks for tracking
- **Impact:** LOW | **Time:** 2-3 days

### 8. Files ↔ Planner Integration
- Schedule time blocks for file work
- "Work on File" planner blocks
- **Impact:** LOW | **Time:** 2-3 days

---

## 📋 Implementation Roadmap

### Sprint 1: Files ↔ Tasks (2 weeks)
**Goal:** Make files and tasks seamlessly integrated

**Tasks:**
1. Visual integration in Files page
2. Drag & drop files to tasks
3. Quick actions (Create Task, Link to Task)
4. Synchronization (deletion sync, status sync)

**Deliverables:**
- Task badges on file cards
- Drag & drop functional
- Quick actions working
- Sync working

---

### Sprint 2: Workflow ↔ Tasks Enhanced (2 weeks)
**Goal:** Make workflow movement intuitive and visual

**Tasks:**
1. Enhanced drag & drop (task list → workflow lanes)
2. Visual integration (lane badges, color coding)
3. Smart lane suggestions
4. Workflow timeline integration

**Deliverables:**
- Drag tasks to workflow lanes
- Lane badges in task cards
- Smart suggestions working
- Timeline integration

---

### Sprint 3: Projects ↔ Tasks Enhanced (1 week)
**Goal:** Better project-level task management

**Tasks:**
1. Project timeline view
2. Project-task synchronization
3. Quick actions
4. Bulk operations

**Deliverables:**
- Project timeline component
- Sync working
- Quick actions available
- Bulk operations functional

---

### Sprint 4: Files ↔ Projects & Workflow ↔ Planner (1 week)
**Goal:** Connect remaining features

**Tasks:**
1. File status tracking
2. Visual integration
3. Cross-view navigation
4. Timeline sync

**Deliverables:**
- File status linked to projects
- Workflow-planner integration
- Cross-view navigation
- Timeline sync working

---

## 🎨 Design Patterns (Reusable)

### Pattern 1: Bidirectional Linking
```javascript
// Entity A ↔ Entity B
entityA.linkedEntityBId = entityB.id;
entityB.linkedEntityAId = entityA.id;
```

### Pattern 2: Drag & Drop
```javascript
// Source: draggable="true" + dragstart handler
// Target: drop handler + dragover handler
```

### Pattern 3: Visual Distinction
```javascript
// Border color, badges, icons for linked items
if (item.isLinked) {
  element.classList.add('linked-item');
  element.style.borderLeft = `3px solid ${linkColor}`;
}
```

### Pattern 4: Converter Utilities
```javascript
// src/utils/entityAEntityBConverter.js
export function entityAToEntityB(entityA) { ... }
export function entityBToEntityA(entityB) { ... }
```

---

## 📈 Success Metrics

For each integration:
- ✅ Bidirectional linking works
- ✅ Drag & drop functional
- ✅ Visual distinction clear
- ✅ Synchronization automatic
- ✅ No breaking changes
- ✅ Performance acceptable
- ✅ User experience smooth

---

## 🚀 Quick Wins (Can Start Immediately)

### Files ↔ Tasks - Phase 1 (Visual Integration)
**Time:** 2-3 days  
**Impact:** High visibility  
**Tasks:**
1. Add task badges to file cards in Files page
2. Show task status/priority on file cards
3. Add "View Linked Tasks" button

**Files to Modify:**
- `src/ui/renderFiles.js` - Add task badges
- `src/ui/renderFiles.js` - Add quick actions

---

### Workflow ↔ Tasks - Phase 1 (Visual Integration)
**Time:** 2-3 days  
**Impact:** High visibility  
**Tasks:**
1. Add lane badges to task cards
2. Color-code tasks by lane
3. Show stage indicators

**Files to Modify:**
- `src/ui/renderTasks.js` - Add lane badges
- `src/ui/renderLanes.js` - Enhance visual distinction

---

## 📝 Notes

- All integrations follow the **planner-tasks pattern** (proven successful)
- Use **store** for state management (single source of truth)
- Keep **backward compatibility** (no breaking changes)
- Add **visual indicators** for all linked items
- Provide **quick actions** for common workflows
- Document in **progress files** as we go

---

## 🎯 Next Steps

1. **Review this plan** - Prioritize based on user needs
2. **Start with Quick Wins** - Files ↔ Tasks visual integration
3. **Iterate** - Build one integration at a time
4. **Test** - Ensure each integration works before moving on
5. **Document** - Update progress files as we go

---

## 💡 Key Insights

1. **Files are central** - Most workflows involve files
2. **Workflow is core** - Task movement through lanes is fundamental
3. **Projects organize** - Better project integration improves organization
4. **Visual integration** - Shows relationships clearly
5. **Drag & drop** - Makes workflows intuitive
6. **Synchronization** - Keeps data consistent automatically

---

The app has great potential for workflow improvements! Each integration will make the app more cohesive and powerful. 🚀
