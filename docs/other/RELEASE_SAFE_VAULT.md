# Release-Safe Vault Implementation

This document describes the schema versioning and migration system that ensures your vault data remains safe across GitHub releases and app updates.

## Overview

Your vault is now protected against data loss during updates through:

1. **Schema Versioning** - Every saved file includes a `schemaVersion` field
2. **Automatic Migrations** - Old data is automatically migrated to new formats
3. **Timestamped Backups** - Backups are created before any migration
4. **Default Merging** - New keys are safely merged instead of replacing whole objects

## How It Works

### 1. Schema Versioning

Every `petal.json` file now includes a `schemaVersion` field:

```json
{
  "schemaVersion": 1,
  "tasks": [...],
  "projects": [...],
  ...
}
```

- **Current Version**: `1` (defined in `src/utils/migrations.js`)
- **Legacy Data**: Files without `schemaVersion` are treated as version `0`

### 2. Automatic Migrations

When the app loads data:

1. **Check Version**: Compares loaded `schemaVersion` with current version
2. **Create Backup**: If migration needed, creates timestamped backup: `petal.backup.YYYYMMDD-HHMMSS.json`
3. **Run Migration**: Applies migration chain to upgrade data
4. **Merge Defaults**: Ensures all new keys exist with default values
5. **Save**: Next save writes data with new `schemaVersion`

### 3. Default Merging

When new features add new keys (e.g., `habits: []`), the loader:

- **Preserves existing data** - Never overwrites with empty state
- **Adds missing keys** - Merges defaults with loaded data
- **Handles nested objects** - Deep merges complex structures like `workflow`

Example: If you add `habits: []` in a future version, old vaults will:
- Keep all existing tasks/projects
- Add empty `habits` array
- Never lose data

## Implementation Details

### Migration System (`src/utils/migrations.js`)

```javascript
export const CURRENT_SCHEMA_VERSION = 1;

export function migrateData(data) {
  // Checks version and applies migrations
  // Returns: { migrated: boolean, data: object, fromVersion, toVersion }
}
```

### Store Integration (`src/state/store.js`)

- `loadState()` - Runs migrations before loading
- `exportState()` - Always includes `schemaVersion` in saved data

### Backup System (`main.js`)

- **Standard Backup**: `petal.json.bak` (overwritten each save)
- **Migration Backup**: `petal.backup.YYYYMMDD-HHMMSS.json` (created before migrations)

## Workflow for Future Releases

### When Schema Changes Are Needed

1. **Increment Version**:
   ```javascript
   // In src/utils/migrations.js
   export const CURRENT_SCHEMA_VERSION = 2; // Bump from 1 to 2
   ```

2. **Add Migration**:
   ```javascript
   // In migrateData() function
   if (currentVersion < 2) {
     console.log('  → Applying migration 1→2: [describe change]');
     migratedData = migrateToVersion2(migratedData);
     currentVersion = 2;
   }
   ```

3. **Update Defaults**:
   ```javascript
   // In getDefaultState()
   return {
     schemaVersion: 2,
     // ... add new keys with defaults
   };
   ```

4. **Test Migration**:
   - Load old vault (version 1)
   - Verify migration runs
   - Check backup created
   - Verify data integrity

### When Adding New Keys (No Migration Needed)

If you're just adding new optional keys (like `habits: []`):

1. **Update Defaults** - Add to `getDefaultState()`
2. **No Version Bump** - Same schema version
3. **Automatic Merge** - `mergeWithDefaults()` handles it

## Safety Guarantees

✅ **Vault path is stable** - Never changes across releases  
✅ **No empty overwrites** - Loader merges defaults, never replaces  
✅ **Backups before writes** - Timestamped backups before migrations  
✅ **Version tracking** - Every file knows its schema version  
✅ **Migration chain** - Upgrades happen in order (0→1→2→3...)  

## Example: Adding a New Feature

Let's say you want to add a `tags` feature:

```javascript
// 1. Update defaults (no version bump needed)
export function getDefaultState() {
  return {
    schemaVersion: 1, // Same version
    tasks: [],
    tags: [], // NEW: Add with default
    ...
  };
}

// 2. That's it! mergeWithDefaults() will:
//    - Keep all existing tasks
//    - Add empty tags array to old vaults
//    - Preserve tags if they exist
```

If you need to restructure existing data (breaking change):

```javascript
// 1. Bump version
export const CURRENT_SCHEMA_VERSION = 2;

// 2. Add migration
if (currentVersion < 2) {
  // Transform old structure to new structure
  migratedData.tags = extractTagsFromTasks(migratedData.tasks);
  currentVersion = 2;
}
```

## Best Practices

1. **Always test migrations** with real vault data before release
2. **Create backups manually** before major updates (use Export button)
3. **Increment version** only when structure changes, not when adding optional keys
4. **Document migrations** in code comments explaining what changed
5. **Keep migration chain** - never skip versions (0→1→2, not 0→2)

## File Locations

- **Migration Logic**: `src/utils/migrations.js`
- **Store Integration**: `src/state/store.js`
- **Backup Creation**: `main.js` (in `readDataFile()`)
- **Save Logic**: `src/storage/persistence.js` → `storage.js` → `main.js`

## Verification

To verify the system is working:

1. **Check console logs** on app startup:
   ```
   🔄 Schema version mismatch detected: 0 < 1
   ✅ Created timestamped backup: petal.backup.2024-01-15-14-30-00.json
   🔄 Schema migration applied: 0 → 1
   ```

2. **Check vault folder** for backup files:
   ```
   PetalVault/
   ├── petal.json
   ├── petal.json.bak
   └── petal.backup.2024-01-15-14-30-00.json
   ```

3. **Check saved data** includes `schemaVersion`:
   ```json
   {
     "schemaVersion": 1,
     ...
   }
   ```

## Summary

Your vault is now **release-safe** because:

- ✅ Schema versioning tracks data format
- ✅ Migrations upgrade old data automatically  
- ✅ Backups protect against migration failures
- ✅ Default merging prevents data loss from new keys
- ✅ Vault path stays stable across releases

You can safely release new versions knowing that:
- Old vaults will automatically upgrade
- Backups are created before any changes
- New features won't wipe existing data
- Schema changes are tracked and reversible
