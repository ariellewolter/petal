# Cleanup Plan: Further Refactoring

## Current Status
- ✅ Step 1: Domain layer extracted
- ✅ Step 2: Store and handlers wired
- ✅ Step 3: UI rendering modules extracted (basic)
- ⚠️ HTML file still ~11,590 lines (down from original, but still large)

## What's Left in HTML File

### 1. CSS (~500 lines)
- **Status**: Can be moved to separate file, but inline is fine for single-file app
- **Action**: Optional - keep inline for now

### 2. HTML Structure (~1,500 lines)
- **Status**: Must stay in HTML file
- **Action**: None needed

### 3. Helper Functions (~100+ functions)
**Extracted:**
- ✅ Project helpers → `src/utils/projectHelpers.js`
- ✅ UI helpers → `src/ui/helpers.js`
- ✅ Migrations → `src/utils/migrations.js`

**Still in HTML:**
- `createPageContext()` - Used by many modules, keep for now
- `initState()` - App initialization, keep for now
- `save()` - Main save function, keep for now (wires to store)
- `render()` - Main render router, keep for now
- Modal management functions (50+ functions)
- Event delegation functions
- Large render functions (renderToday, renderPlanner, renderMatrix, etc.)

### 4. Large Render Functions Still in HTML

**High Priority to Extract:**
- `renderToday()` - ~200 lines
- `renderPlanner()` - ~300 lines  
- `renderWorkflowMatrix()` - ~200 lines
- `renderLane()` - ~100 lines
- `renderUnassignedLane()` - ~100 lines
- `renderProjectFiles()` - ~150 lines
- `renderProjectMilestones()` - ~100 lines
- `renderProjectHeader()` - ~50 lines
- `renderProjectBrief()` - ~50 lines
- `renderTaskItem()` - ~100 lines (complex HTML generation)

**Medium Priority:**
- Modal open/close functions
- Form management functions
- Event delegation setup

### 5. Migration Functions Still in HTML
- `migrateSubtasksToTasks()` - ~50 lines
- `migrateToCanonicalFileRegistry()` - ~200 lines
- Can be moved to `src/utils/migrations.js`

## Recommended Next Steps

### Phase 1: Extract Large Render Functions (High Impact)
1. Extract `renderToday()` → `src/ui/renderToday.js`
2. Extract `renderPlanner()` → `src/ui/renderPlanner.js`
3. Extract `renderWorkflowMatrix()` → `src/ui/renderMatrix.js`
4. Extract lane rendering → `src/ui/renderLanes.js`

**Impact**: ~800 lines removed

### Phase 2: Extract Remaining Migrations
1. Move `migrateSubtasksToTasks()` → `src/utils/migrations.js`
2. Move `migrateToCanonicalFileRegistry()` → `src/utils/migrations.js`

**Impact**: ~250 lines removed

### Phase 3: Extract Modal Management
1. Create `src/ui/modals.js` for modal open/close functions
2. Extract form management functions

**Impact**: ~200 lines removed

### Phase 4: Extract Complex HTML Generators
1. Extract `renderTaskItem()` → `src/ui/components/taskItem.js`
2. Extract `renderProjectCard()` → `src/ui/components/projectCard.js`
3. Extract other complex HTML generators

**Impact**: ~300 lines removed

## Total Potential Reduction

If all phases completed:
- **Current**: ~11,590 lines
- **After cleanup**: ~9,000-9,500 lines
- **Reduction**: ~2,000 lines (17%)

## What Should Stay in HTML

1. **HTML structure** - Must stay
2. **CSS** - Can stay inline (or move to separate file)
3. **Main initialization** - `initState()`, `render()` router
4. **Core app setup** - Module imports, namespace setup
5. **Global event handlers** - That need to be in HTML for inline handlers

## Notes

- The file will always be large due to HTML structure
- Focus on extracting logic, not HTML
- Keep backward compatibility during migration
- Test after each extraction phase
