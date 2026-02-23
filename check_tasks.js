// Diagnostic script to check if tasks exist in storage
// Run this in the browser console (F12) or as a Node script

console.log('=== TASK STORAGE DIAGNOSTIC ===\n');

// Check 1: Current store state
console.log('1. Checking current store state...');
if (typeof window !== 'undefined' && window.Petal?.store) {
  const store = window.Petal.store;
  const state = store.getState();
  const allTasks = state.tasks || [];
  const deletedTasks = allTasks.filter(t => t.deletedAt);
  const activeTasks = allTasks.filter(t => !t.deletedAt);
  
  console.log(`   Total tasks in store: ${allTasks.length}`);
  console.log(`   Active tasks: ${activeTasks.length}`);
  console.log(`   Deleted tasks: ${deletedTasks.length}`);
  
  if (activeTasks.length > 0) {
    console.log(`   ✅ Tasks found! Sample:`, activeTasks.slice(0, 3).map(t => t.title));
  } else if (deletedTasks.length > 0) {
    console.log(`   ⚠️ All tasks are marked as deleted!`);
    console.log(`   Sample deleted tasks:`, deletedTasks.slice(0, 3).map(t => ({ title: t.title, deletedAt: t.deletedAt })));
  } else {
    console.log(`   ❌ No tasks found in store`);
  }
  
  // Recovery function
  if (deletedTasks.length > 0 && activeTasks.length === 0) {
    console.log('\n   💡 RECOVERY AVAILABLE: Run window.recoverDeletedTasks() to restore all tasks');
    window.recoverDeletedTasks = function() {
      const state = store.getState();
      const tasks = state.tasks || [];
      const recovered = tasks.map(t => {
        if (t.deletedAt) {
          const { deletedAt, ...rest } = t;
          return rest;
        }
        return t;
      });
      store.setState({ tasks: recovered });
      console.log(`✅ Recovered ${deletedTasks.length} tasks`);
      if (window.render) window.render();
      return recovered.length;
    };
  }
} else {
  console.log('   ❌ Store not available');
}

// Check 2: Browser localStorage
if (typeof localStorage !== 'undefined') {
  console.log('\n2. Checking browser localStorage...');
  try {
    const storedTasks = JSON.parse(localStorage.getItem('petal-tasks') || '[]');
    const storedActive = storedTasks.filter(t => !t.deletedAt);
    console.log(`   Tasks in localStorage: ${storedTasks.length}`);
    console.log(`   Active in localStorage: ${storedActive.length}`);
    
    if (storedActive.length > 0) {
      console.log(`   ✅ Tasks found in localStorage!`);
      console.log(`   Sample:`, storedActive.slice(0, 3).map(t => t.title));
      
      // Recovery function for localStorage
      if (typeof window !== 'undefined' && window.Petal?.store && storedActive.length > 0) {
        window.restoreFromLocalStorage = function() {
          const store = window.Petal.store;
          store.setState({ tasks: storedActive });
          console.log(`✅ Restored ${storedActive.length} tasks from localStorage`);
          if (window.render) window.render();
          return storedActive.length;
        };
        console.log('   💡 RECOVERY AVAILABLE: Run window.restoreFromLocalStorage() to restore from localStorage');
      }
    }
  } catch (e) {
    console.error('   ❌ Error reading localStorage:', e);
  }
}

// Check 3: Electron file storage (if available)
if (typeof window !== 'undefined' && window.electronAPI) {
  console.log('\n3. Electron app detected - checking file storage...');
  console.log('   (File storage check requires IPC call - check app logs)');
}

console.log('\n=== END DIAGNOSTIC ===');
console.log('\nTo recover tasks, try:');
console.log('  - window.recoverDeletedTasks() (if tasks are marked deleted)');
console.log('  - window.restoreFromLocalStorage() (if tasks exist in localStorage)');
