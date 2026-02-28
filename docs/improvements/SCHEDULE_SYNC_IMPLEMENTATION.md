# Schedule Sync Implementation

## Overview

The Today page schedule and Planner page now use the **same event calculation logic** and **automatically sync** when events or recurring rules are updated.

## Implementation Details

### 1. Shared Event Calculation Utility

**File**: `src/utils/eventHelpers.js`

Created a shared utility that both pages use:
- `getEventsForDate(date, events, recurringRules)` - Single source of truth for event calculation
- `expandRecurringRules(startDate, endDate, recurringRules)` - Expands recurring rules into events

**Key Features:**
- Handles both one-off events and recurring rules
- Sorts events by start time
- Supports legacy event format (time/duration) and new format (startTime/durationMin)

### 2. Updated Pages to Use Shared Utility

**Today Page** (`src/pages/TodayPage.js`):
- ✅ Imports `getEventsForDate` from shared utility
- ✅ Uses same event calculation as Planner page
- ✅ Renders events in same format (24-hour timeline with exact positioning)

**Planner Page** (`src/pages/PlannerPage.js`):
- ✅ Imports `getEventsForDate` and `expandRecurringRules` from shared utility
- ✅ Removed duplicate event calculation code
- ✅ Uses same shared functions as Today page

### 3. Automatic Synchronization

**How Sync Works:**

1. **Single Data Source**: Both pages read from `state.events` and `state.recurringRules` (store)

2. **Store Subscriptions**: 
   - Store changes trigger `render()` function (via subscription in `src/app/init.js`)
   - `render()` re-renders the current view using router
   - When you switch views, both use the same `getEventsForDate` function

3. **Event Updates**:
   - When events/recurringRules are added/edited/deleted, they update the store via `setState()`
   - Store subscription automatically triggers re-render
   - Both pages show the same data because they use the same calculation

**Files Involved:**
- `src/features/plannerOperations.js` - Updates store when events/rules change
- `src/state/store.js` - Manages state and subscriptions
- `src/app/viewManager.js` - Handles re-rendering on state changes

### 4. Event Format Consistency

Both pages now use the same event structure:
```javascript
{
  id: string,
  title: string,
  date: string (ISO date),
  startTime: string (HH:MM format),
  durationMin: number,
  category: string,
  location: string | null,
  linkedProjectId: number | null,
  linkedTaskId: number | null,
  // ... other fields
}
```

### 5. Rendering Format

Both pages render events using:
- Same 24-hour timeline (0-23 hours)
- Same pixel-per-minute positioning (1px = 1 minute)
- Same color coding by category
- Same event block styling
- Same linked project/task display

## Verification

### ✅ Completed:
1. ✅ Created shared `eventHelpers.js` utility
2. ✅ Updated TodayPage to use shared utility
3. ✅ Updated PlannerPage to use shared utility
4. ✅ Removed duplicate event calculation code
5. ✅ Both pages read from same store state
6. ✅ Store subscriptions ensure automatic re-rendering

### Testing Checklist:
- [ ] Add event in Planner → Verify it appears in Today page schedule
- [ ] Add recurring rule in Planner → Verify it appears in Today page schedule
- [ ] Edit event in Planner → Verify change appears in Today page
- [ ] Delete event in Planner → Verify it disappears from Today page
- [ ] Switch between Today and Planner views → Verify events match
- [ ] Verify recurring rules expand correctly on both pages

## Benefits

1. **Consistency**: Both pages always show the same events
2. **Automatic Sync**: No manual refresh needed - changes appear instantly
3. **Single Source of Truth**: One calculation function prevents drift
4. **Maintainability**: Changes to event logic only need to be made in one place
5. **Reliability**: Same logic = same results = no discrepancies

## Notes

- The old `renderToday.js` file exists but is not imported/used (can be removed in future cleanup)
- Both pages support legacy event format (time/duration) for backward compatibility
- Store subscriptions ensure real-time updates without page refresh
- Event calculation happens on-demand when pages render (no caching needed)
