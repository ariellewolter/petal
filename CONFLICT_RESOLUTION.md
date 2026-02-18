# Conflict Resolution Guide

## Overview

Petal automatically detects sync conflicts that can occur when:
- Two devices edit the file simultaneously
- OneDrive creates "conflicted copy" files
- Network issues cause sync delays

## Types of Conflicts

### 1. OneDrive "Conflicted Copy" Files

OneDrive creates these when it detects simultaneous edits:
- Format: `petal (User's PC conflicted copy 2024-01-15 123456).json`
- Created automatically by OneDrive sync
- Detected on app startup

### 2. App-Generated Conflict Files

Created by Petal when it detects file modification during save:
- Format: `petal.conflict-2024-01-15T12-34-56.json`
- Created when atomic write detects a conflict
- Timestamped for easy identification

## Conflict Resolution UI

When conflicts are detected, a banner appears at the top of the app:

```
⚠️ Sync Conflict Detected
1 conflict file newer than main file detected.
Files: petal (User's PC conflicted copy 2024-01-15 123456).json (1/15/2024, 12:34:56 PM)
[Keep Current] [Use Conflict] [Keep Both] [×]
```

### Resolution Options

**Keep Current**
- Keeps your current `petal.json` file
- Deletes the conflict file
- Use when: Current file has your latest work

**Use Conflict**
- Replaces current file with conflict file
- Deletes the conflict file
- App reloads with conflict data
- Use when: Conflict file has newer/more important changes

**Keep Both**
- Keeps current file as-is
- Renames conflict to app format (`petal.conflict-*.json`)
- Both files preserved for manual review
- Use when: You want to manually merge later

**Close (×)**
- Dismisses banner temporarily
- Banner will reappear on next app load if conflicts still exist
- Conflicts remain until resolved

## Manual Conflict Resolution

If you prefer to resolve conflicts manually:

1. **Locate conflict files** in your vault folder
2. **Compare files**:
   - Open `petal.json` (current)
   - Open conflict file(s)
   - Compare timestamps and content
3. **Choose resolution**:
   - **Option A**: Keep `petal.json`, delete conflict
   - **Option B**: Replace `petal.json` with conflict file
   - **Option C**: Manually merge changes, then delete conflict
4. **Clean up**: Delete resolved conflict files

## Best Practices

### Prevent Conflicts

- ✅ **Edit on one device at a time**
- ✅ **Wait for sync**: Give cloud service 5-10 seconds after closing app
- ✅ **Check sync status**: Verify OneDrive/iCloud Drive is synced before switching devices
- ✅ **Use Export**: Create manual backups before major edits

### When Conflicts Occur

- ✅ **Don't panic**: Conflicts are preserved, nothing is lost
- ✅ **Check timestamps**: Newer file usually has latest changes
- ✅ **Review content**: Open both files to see what changed
- ✅ **Resolve promptly**: Don't let conflicts accumulate

### File Attachments

For files linked in tasks/projects:
- ✅ **Use `attachments/` folder**: Files here use relative paths
- ✅ **Sync automatically**: Files in vault sync with OneDrive/iCloud
- ✅ **Cross-device**: Relative paths work on all devices
- ⚠️ **Outside vault**: Absolute paths may break on other devices

## Troubleshooting

### Conflict banner won't go away
- Resolve the conflict using one of the buttons
- Or manually delete conflict files from vault folder

### Lost data after conflict resolution
- Check `petal.json.bak` (automatic backup)
- Check `exports/` folder for manual exports
- Check conflict files (they're preserved until resolved)

### Multiple conflict files
- Resolve most recent first (newest timestamp)
- Older conflicts may be from previous sessions
- You can safely delete old resolved conflicts

### Files not syncing
- Check OneDrive/iCloud Drive sync status
- Verify vault folder is in synced location
- Check network connection
- Restart cloud sync service if needed
