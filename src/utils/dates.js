// ═══════════════════════ DATE UTILITIES ═══════════════════════

export function today() {
  return new Date(new Date().toDateString());
}

export function parseDate(s) {
  return s ? new Date(s + 'T00:00:00') : null;
}

export function dueLabel(due, small = false, isDone = false) {
  if (isDone || !due) return null;
  const d = parseDate(due);
  const t = today();
  const diff = Math.round((d - t) / 86400000);
  
  if (diff < 0) return { cls: 'overdue', text: `Overdue${small ? '' : ` by ${Math.abs(diff)}d`}` };
  if (diff === 0) return { cls: 'soon', text: 'Today' };
  if (diff <= 3) return { cls: 'soon', text: `In ${diff}d` };
  return { 
    cls: '', 
    text: d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== t.getFullYear() ? 'numeric' : undefined
    })
  };
}

export function inRange(task, currentSort) {
  if (currentSort === 'all') return true;
  const due = parseDate(task.due);
  if (!due) return false;
  const t = today();
  
  // Normalize dates to midnight for accurate comparison
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDate = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  
  if (currentSort === 'day') {
    return dueDate.getTime() === todayDate.getTime();
  }
  
  if (currentSort === 'week') {
    // Check if due date is within the next 7 days (including today)
    const weekEnd = new Date(todayDate);
    weekEnd.setDate(todayDate.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    
    return dueDate.getTime() >= todayDate.getTime() && dueDate.getTime() <= weekEnd.getTime();
  }
  
  if (currentSort === 'month') {
    return dueDate.getMonth() === todayDate.getMonth() && 
           dueDate.getFullYear() === todayDate.getFullYear();
  }
  
  return true;
}

export function groupKey(task) {
  if (task.done) return { label: 'Completed', sort: 'zzzz' };
  const due = parseDate(task.due);
  if (!due) return { label: 'Someday', sort: '9999' };
  const t = today();
  const diff = Math.round((due - t) / 86400000);
  if (diff < 0) return { label: '🌸 Overdue', sort: '0000' };
  if (diff === 0) return { label: '✦ Today', sort: '0001' };
  if (diff === 1) return { label: 'Tomorrow', sort: '0002' };
  return {
    label: due.toLocaleDateString('en-US', {
      weekday: diff < 7 ? 'long' : undefined,
      month: 'long',
      day: 'numeric',
      year: due.getFullYear() !== t.getFullYear() ? 'numeric' : undefined
    }),
    sort: task.due
  };
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
export function parseTime(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to "HH:MM"
 */
export function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Format planner-scheduled work for display on tasks linked to the planner.
 * @param {string} scheduledDate - YYYY-MM-DD
 * @param {string} [scheduledStartTime] - HH:MM (24h)
 * @param {number} [scheduledDurationMin] - Optional duration in minutes
 * @returns {string} e.g. "Mar 5, 9:00 AM" or "Mar 5, 9:00 AM (60 min)", or '' if no date
 */
export function formatScheduledWork(scheduledDate, scheduledStartTime, scheduledDurationMin) {
  if (!scheduledDate) return '';
  const d = parseDate(scheduledDate);
  if (!d) return '';
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today().getFullYear() ? 'numeric' : undefined
  });
  if (!scheduledStartTime) return dateStr;
  const [h, m] = scheduledStartTime.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  const timeStr = `${hour12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  const durationStr = scheduledDurationMin ? ` (${scheduledDurationMin} min)` : '';
  return `${dateStr}, ${timeStr}${durationStr}`;
}
