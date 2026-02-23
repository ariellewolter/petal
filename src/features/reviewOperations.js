// ═══════════════════════ REVIEW OPERATIONS ═══════════════════════
// Operations for weekly reviews and task analysis

import { parseDate } from '../utils/dates.js';

/**
 * Start weekly review - analyze tasks and projects for review
 */
export function startWeeklyReview(ctx) {
  const { tasks, projects, parseDate: parseDateFn } = ctx;
  
  const parseDateFunction = parseDateFn || parseDate;
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Overdue tasks
  const overdue = (tasks || []).filter(t => {
    if (t.done) return false;
    const due = parseDateFunction(t.due);
    return due && due < today;
  });
  
  // Tasks in Doing > 7 days
  const staleDoing = (tasks || []).filter(t => {
    if (t.done || t.status !== 'Doing') return false;
    // Check if task was created or last modified > 7 days ago
    const taskDate = new Date(t.id); // Using ID as creation date
    return taskDate < sevenDaysAgo;
  });
  
  // Empty projects
  const emptyProjects = (projects || []).filter(p => {
    const projectTasks = (tasks || []).filter(t => String(t.projectId) === String(p.id));
    return projectTasks.length === 0 && ((p.subtasks || []).length === 0);
  });
  
  // Inbox tasks
  const inboxTasks = (tasks || []).filter(t => !t.done && t.status === 'Inbox');
  
  let reviewText = '📋 Weekly Review\n\n';
  
  if (overdue.length > 0) {
    reviewText += `⚠️ Overdue Tasks (${overdue.length}):\n`;
    overdue.slice(0, 10).forEach(t => {
      reviewText += `  • ${t.title}\n`;
    });
    if (overdue.length > 10) reviewText += `  ... and ${overdue.length - 10} more\n`;
    reviewText += '\n';
  }
  
  if (staleDoing.length > 0) {
    reviewText += `🔄 Stale "Doing" Tasks (${staleDoing.length}):\n`;
    staleDoing.slice(0, 10).forEach(t => {
      reviewText += `  • ${t.title}\n`;
    });
    if (staleDoing.length > 10) reviewText += `  ... and ${staleDoing.length - 10} more\n`;
    reviewText += '\n';
  }
  
  if (emptyProjects.length > 0) {
    reviewText += `📁 Empty Projects (${emptyProjects.length}):\n`;
    emptyProjects.forEach(p => {
      reviewText += `  • ${p.name}\n`;
    });
    reviewText += '\n';
  }
  
  if (inboxTasks.length > 0) {
    reviewText += `📥 Inbox Tasks (${inboxTasks.length}):\n`;
    reviewText += `  Consider organizing these into projects or columns.\n\n`;
  }
  
  if (overdue.length === 0 && staleDoing.length === 0 && emptyProjects.length === 0 && inboxTasks.length === 0) {
    reviewText += '✨ Everything looks good! No action items needed.';
  } else {
    reviewText += 'Take time to review and organize these items.';
  }
  
  alert(reviewText);
  
  // Optionally switch to Today view to see overdue items
  if (overdue.length > 0) {
    if (confirm('Switch to Today view to see overdue tasks?')) {
      if (window.routerSwitchView) {
        window.routerSwitchView('today');
      } else if (window.switchView) {
        window.switchView('today');
      }
    }
  }
}
