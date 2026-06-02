// ═══════════════════════ UI MODULES INDEX ═══════════════════════
// Central export point for all UI rendering modules
// Step 3: Extract UI rendering functions

export { renderTasks } from './renderTasks.js';
export { renderProjects } from './renderProjects.js';
// Legacy lane kanban: see renderWorkflow.js (not exported; WorkflowPage + tasklist.html are canonical)
export { renderFiles } from './renderFiles.js';
// renderToday moved to src/pages/TodayPage.js