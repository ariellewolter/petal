// ═══════════════════════ SEARCH ═══════════════════════

/**
 * Check if a task matches the search query
 */
export function matchesSearch(task, query) {
  if (!query || !query.trim()) return true;
  const searchTerm = query.toLowerCase().trim();
  const titleMatch = task.title?.toLowerCase().includes(searchTerm);
  const notesMatch = task.notes?.toLowerCase().includes(searchTerm);
  return titleMatch || notesMatch;
}

/**
 * Handle search input - update search query and re-render
 */
export function handleSearch(query) {
  // Update global search query
  if (window.searchQuery !== undefined) {
    window.searchQuery = query;
  }
  
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) {
    clearBtn.classList.toggle('visible', query.trim().length > 0);
  }
  
  // Re-render if render function is available
  if (window.render) {
    window.render();
  }
}

/**
 * Clear search input and reset search
 */
export function clearSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  handleSearch('');
}
