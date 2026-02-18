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
  if (currentSort === 'day') return due.toDateString() === t.toDateString();
  if (currentSort === 'week') {
    const e = new Date(t);
    e.setDate(t.getDate() + 7);
    return due >= t && due <= e;
  }
  if (currentSort === 'month') return due.getMonth() === t.getMonth() && due.getFullYear() === t.getFullYear();
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
