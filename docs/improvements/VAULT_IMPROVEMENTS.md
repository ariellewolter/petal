# Vault Improvements

This document describes the enhancements made to the Petal vault system for better reliability, performance, and maintenance.

## New Features

### 1. Vault Health Statistics

Get comprehensive statistics about your vault:

- **Data file info**: Size, last modified time
- **Backup files**: Count, total size, oldest/newest backups
- **Conflict files**: Count, total size, oldest/newest conflicts
- **Exports**: Count and total size
- **Attachments**: Count and total size
- **Total vault size**: Combined size of all files
- **Health status**: `healthy`, `missing`, `conflicts`, `empty`, or `error`

**Usage:**
```javascript
const health = await window.electronAPI.vaultGetHealth();
console.log(health.health); // 'healthy'
console.log(health.totalSizeFormatted); // '2.5 MB'
```

### 2. Multiple Backup Versions

Previously, only one `.bak` file was kept. Now the system:

- Creates timestamped backups: `petal.backup.YYYY-MM-DD-HH-MM-SS.json`
- Keeps the last 5 backups automatically
- Still maintains the standard `petal.json.bak` for quick recovery
- Automatically rotates old backups on each save

**Benefits:**
- Can recover from multiple points in time
- Automatic cleanup prevents disk bloat
- Quick recovery via `.bak` file

### 3. Auto-Cleanup of Old Conflicts

Automatically removes conflict files older than 30 days:

- Prevents vault folder from accumulating old conflicts
- Configurable age threshold (default: 30 days)
- Runs automatically on each save
- Can be triggered manually

**Usage:**
```javascript
// Clean up conflicts older than 30 days (default)
await window.electronAPI.vaultCleanupConflicts();

// Clean up conflicts older than 7 days
await window.electronAPI.vaultCleanupConflicts(7);
```

### 4. Vault Integrity Validation

Validates vault structure and data integrity:

- Checks if data file exists and is readable
- Validates JSON structure
- Checks for required fields (tasks, projects)
- Detects duplicate IDs
- Verifies schema version
- Reports warnings for legacy data

**Usage:**
```javascript
const validation = await window.electronAPI.vaultValidateIntegrity();
if (!validation.validation.valid) {
  console.error('Vault errors:', validation.validation.errors);
}
if (validation.validation.warnings.length > 0) {
  console.warn('Vault warnings:', validation.validation.warnings);
}
```

### 5. Vault Optimization

Optimizes vault by removing duplicates and compacting structure:

- Removes duplicate tasks (keeps first occurrence)
- Removes duplicate projects (keeps first occurrence)
- Optionally removes deleted tasks (commented out by default)
- Creates backup before optimization
- Reloads data after optimization

**Usage:**
```javascript
const result = await window.electronAPI.vaultOptimize();
if (result.success) {
  console.log(`Removed ${result.optimizations.removedDuplicateTasks} duplicate tasks`);
  console.log(`Removed ${result.optimizations.removedDuplicateProjects} duplicate projects`);
}
```

## Implementation Details

### Automatic Features

These improvements run automatically:

1. **On each save:**
   - Creates timestamped backup
   - Rotates old backups (keeps last 5)
   - Cleans up old conflicts (older than 30 days)

2. **On vault load:**
   - Integrity validation can be added (optional)

### Manual Features

These can be triggered from the UI or programmatically:

- Get vault health statistics
- Validate vault integrity
- Optimize vault
- Clean up conflicts (with custom age)

## API Reference

All new functions are exposed via `window.electronAPI`:

```javascript
// Get vault health
const health = await window.electronAPI.vaultGetHealth();

// Validate integrity
const validation = await window.electronAPI.vaultValidateIntegrity();

// Optimize vault
const result = await window.electronAPI.vaultOptimize();

// Clean up old conflicts
const cleanup = await window.electronAPI.vaultCleanupConflicts(maxAgeDays);
```

## Benefits

1. **Better Data Safety**: Multiple backups provide recovery points
2. **Automatic Maintenance**: Old conflicts cleaned up automatically
3. **Health Monitoring**: Know the status of your vault at a glance
4. **Data Integrity**: Validation catches issues early
5. **Performance**: Optimization removes duplicates and compacts data
6. **Disk Space**: Automatic cleanup prevents vault from growing too large

## Future Enhancements

Potential future improvements:

- Vault compression for large files
- Incremental backups (only changed data)
- Vault encryption option
- Cloud sync status indicators
- Vault statistics dashboard UI
- Scheduled optimization
- Export optimization reports

## Files Modified

- `src/utils/vaultImprovements.js` - New utility module
- `main.js` - Integrated improvements into save process, added IPC handlers
- `preload.js` - Exposed new APIs to renderer process
