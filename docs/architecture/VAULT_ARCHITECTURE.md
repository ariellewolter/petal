# PetalVault Architecture

## Overview

Petal uses a **vault-based architecture** similar to Obsidian. All your data lives in a single folder that you can sync via OneDrive, iCloud Drive, or any cloud service.

## Folder Structure

```
PetalVault/
├── petal.json                    # Main database (single source of truth)
├── petal.json.bak               # Automatic backup (updated before each save)
├── petal.tmp                    # Temporary file (during atomic writes)
├── petal.conflict-*.json        # Conflict files (if sync conflicts detected)
├── exports/                     # Manual export backups
│   └── petal-export-2024-01-15.json
└── attachments/                 # (Optional) File attachments
    └── ...
```

## File: `petal.json`

The main database file containing all your tasks and projects:

```json
{
  "tasks": [
    {
      "id": 1234567890,
      "title": "Complete project proposal",
      "notes": "Need to include budget",
      "priority": "high",
      "due": "2024-01-20",
      "files": [
        {"name": "Budget.xlsx", "url": "file:///path/to/budget.xlsx"}
      ],
      "done": false
    }
  ],
  "projects": [
    {
      "id": 1234567891,
      "name": "Website Redesign",
      "desc": "Complete redesign of company website",
      "due": "2024-02-01",
      "color": 1,
      "files": [],
      "subtasks": [
        {
          "id": 1234567892,
          "title": "Design mockups",
          "priority": "high",
          "due": "2024-01-25",
          "files": [],
          "done": false
        }
      ],
      "done": false
    }
  ],
  "openProjects": [1234567891]
}
```

## Safety Mechanisms

### 1. Atomic Writes

**Problem**: If app crashes while writing, file could be corrupted.

**Solution**: 
1. Write to `petal.tmp` first
2. Verify write succeeded
3. Atomically rename `petal.tmp` → `petal.json`

This ensures the main file is never in a partially-written state.

### 2. Automatic Backups

**Problem**: Accidental deletion or corruption.

**Solution**:
- Before each save, copy `petal.json` → `petal.json.bak`
- Always have at least one backup
- Backup is overwritten each save (keeps disk usage low)

### 3. Conflict Detection

**Problem**: Two devices edit simultaneously, causing sync conflicts. OneDrive also creates "conflicted copy" files.

**Solution**:
- **App-level conflicts**: Check file modification time before final rename
  - If file was modified during write, it's a conflict
  - Save as `petal.conflict-YYYYMMDD-HHMMSS.json` instead of overwriting
  - Main `petal.json` remains intact
  
- **OneDrive conflicts**: Detects OneDrive "conflicted copy" files automatically
  - Pattern: `petal (User's PC conflicted copy 2024-01-15 123456).json`
  - Shows conflict banner on app load
  - User can choose: Keep Current, Use Conflict, or Keep Both
  
- **Conflict Resolution UI**: 
  - Banner appears at top of app when conflicts detected
  - Shows conflict file names and timestamps
  - One-click resolution options

### 4. Manual Exports

**Problem**: Need long-term backups or want to archive old data.

**Solution**:
- Export button creates dated file in `exports/` folder
- Format: `petal-export-YYYY-MM-DD.json`
- Keep multiple dated snapshots
- Human-readable JSON format

## Sync Strategy

### Recommended Setup

1. **Choose vault location in OneDrive/iCloud Drive**
   - Windows: `C:\Users\YourName\OneDrive\PetalVault`
   - Mac: `~/Library/Mobile Documents/com~apple~CloudDocs/PetalVault`

2. **Cloud service syncs automatically**
   - OneDrive/iCloud Drive handles sync in background
   - No app-level sync code needed
   - Works offline, syncs when online

3. **Conflict handling**
   - **Automatic detection**: App detects conflicts on load
   - **OneDrive conflicts**: Detects "conflicted copy" files
   - **Resolution UI**: Banner appears with resolution options
   - **Options**: Keep Current, Use Conflict, or Keep Both
   - Most conflicts are rare (only if editing on two devices simultaneously)

### File Linking

**Best Practice**: Store files in `PetalVault/attachments/` for cross-device portability.

- **Relative paths**: Files in `attachments/` are stored as `attachments/filename.pdf`
- **Absolute paths**: Files outside vault use full paths (may break on other devices)
- **Auto-resolution**: App automatically resolves relative paths when opening files
- **Recommendation**: Copy important files into `attachments/` folder for reliable sync

### Best Practices

- ✅ **One device at a time**: Edit on one device, let it sync, then use another
- ✅ **Wait for sync**: Give cloud service a few seconds to sync before switching devices
- ✅ **Regular exports**: Use Export button monthly for long-term backups
- ✅ **Check conflicts**: If you see conflict files, review and merge them

## Migration from Old Format

If you have data in the old `tasks.json` format:

1. Export your data from old app
2. Start new app (it will create empty `petal.json`)
3. Use Import button to import your exported JSON
4. Data will be in new format automatically

## Advanced: Custom Vault Location

You can store your vault anywhere:

1. First run: Choose custom folder when prompted
2. Or manually edit `vault-path.json` in app data folder
3. Restart app

**Note**: For sync to work, choose a folder that's synced by your cloud service.

## File Size Considerations

- Typical vault: 10-100 KB (thousands of tasks)
- Each export: ~same size as main file
- Backups: Only one `.bak` file (overwritten each save)
- Conflict files: Only created when conflicts occur (rare)

Disk usage is minimal even with years of data.
