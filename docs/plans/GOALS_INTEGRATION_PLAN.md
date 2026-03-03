# Goals Page Integration Plan

**Last Updated**: 2026-02-28

## Overview
This document outlines integration opportunities for the Goals page to improve workflow and cross-page connectivity.

---

## ✅ Completed Integrations

### 1. Today Page Integration
- **Status**: ✅ Implemented
- **Location**: `src/pages/TodayPage.js`
- **Features**:
  - Shows goals with milestones due today in a dedicated card
  - Displays goal name, milestone title, and progress
  - Clicking navigates to Goals page and opens the goal drawer
  - Only shows active goals (progress < 100%)
  - Styled consistently with other Today page cards

### 2. Data Persistence Integration
- **Status**: ✅ Complete
- **Location**: `src/state/store.js`, `storage.js`
- **Features**:
  - Goals stored in app state (`goals: []`)
  - Goals persisted to localStorage (`petal-goals`)
  - Goals included in export/import via `exportState()`
  - Auto-save on goal changes

### 3. Navigation Integration
- **Status**: ✅ Complete
- **Location**: `src/app/viewManager.js`, `src/app/pages.js`
- **Features**:
  - Goals accessible via sidebar navigation
  - Active goals badge shows count of incomplete goals
  - Router integration for `switchView('goals')`

---

## 🚧 Recommended Future Integrations

### 1. Tasks ↔ Goals Linking
**Priority**: High
**Impact**: High
**Effort**: Medium

**Description**: Allow tasks to be linked to goals via `goalId` field.

**Implementation**:
- Add `goalId` field to task model (optional)
- Add goal selector in task creation/edit modal
- Show linked goal in task card/display
- Filter tasks by goal on Goals page
- Show task count per goal in Goals page stats

**Benefits**:
- Track which tasks contribute to which goals
- See goal progress from task completion
- Better project/goal alignment

**Files to Modify**:
- `src/domain/models.js` - Add goalId to task structure
- `src/features/taskOperations.js` - Add goalId handling
- `src/ui/renderTasks.js` - Display goal link in task cards
- `src/pages/GoalsPage.js` - Show linked tasks in goal drawer

---

### 2. Projects ↔ Goals Linking
**Priority**: Medium
**Impact**: Medium
**Effort**: Low

**Description**: Allow projects to be linked to goals via `goalId` field.

**Implementation**:
- Add `goalId` field to project model (optional)
- Add goal selector in project creation/edit
- Show linked goal in project card
- Filter projects by goal on Goals page
- Show project count per goal in Goals page stats

**Benefits**:
- Align projects with strategic goals
- Track project progress toward goals
- Better goal/project visibility

**Files to Modify**:
- `src/domain/models.js` - Add goalId to project structure
- `src/features/projectOperations.js` - Add goalId handling
- `src/ui/renderProjects.js` - Display goal link in project cards
- `src/pages/GoalsPage.js` - Show linked projects in goal drawer

---

### 3. Planner Timeline Integration
**Priority**: Medium
**Impact**: Medium
**Effort**: Medium

**Description**: Show goal milestones on the Planner timeline as all-day events or markers.

**Implementation**:
- Convert goal milestones to planner events for display
- Show milestones as all-day events in daily view
- Show milestones in weekly view calendar
- Click milestone to open goal drawer
- Visual distinction for milestone events (different color/style)

**Benefits**:
- See goal milestones alongside tasks and events
- Better time planning around goal deadlines
- Visual timeline of goal progress

**Files to Modify**:
- `src/pages/PlannerPage.js` - Add milestone rendering to timeline
- `src/utils/taskEventConverter.js` - Add milestone-to-event converter
- `src/pages/GoalsPage.js` - Ensure milestones have dates

---

### 4. Workflow Integration
**Priority**: Low
**Impact**: Low
**Effort**: Medium

**Description**: Link goals to workflow lanes for better organization.

**Implementation**:
- Add `lane` field to goals (optional)
- Filter goals by lane on Goals page
- Show lane badge in goal cards
- Group goals by lane in timeline view

**Benefits**:
- Align goals with workflow organization
- Better categorization
- Lane-based goal filtering

**Files to Modify**:
- `src/pages/GoalsPage.js` - Add lane field and filtering
- `src/domain/models.js` - Add lane to goal structure

---

### 5. Today Page Stats Integration
**Priority**: Low
**Impact**: Low
**Effort**: Low

**Description**: Add Goals stat to Today page stats row.

**Implementation**:
- Add "Active Goals" stat card to Today page
- Show count of incomplete goals
- Show milestone count due this week

**Benefits**:
- Quick overview of goal status
- Better dashboard visibility

**Files to Modify**:
- `src/pages/TodayPage.js` - Add goals stat card

---

### 6. Search Integration
**Priority**: Low
**Impact**: Low
**Effort**: Low

**Description**: Include goals in global search results.

**Implementation**:
- Add goals to search index
- Show goals in search results
- Click result to open goal drawer

**Benefits**:
- Find goals quickly
- Unified search experience

**Files to Modify**:
- Search functionality (if exists)
- `src/pages/GoalsPage.js` - Add search result rendering

---

## Implementation Priority

1. **Today Page Integration** ✅ (Completed)
2. **Tasks ↔ Goals Linking** (High priority - most impactful)
3. **Planner Timeline Integration** (Medium priority - good UX)
4. **Projects ↔ Goals Linking** (Medium priority - organizational)
5. **Today Page Stats** (Low priority - nice to have)
6. **Workflow Integration** (Low priority - optional)
7. **Search Integration** (Low priority - if search exists)

---

## Notes

- All integrations should maintain backward compatibility
- Goal data structure should remain flexible
- Links should be optional (goals can exist independently)
- Consider migration path for existing goals/tasks/projects
