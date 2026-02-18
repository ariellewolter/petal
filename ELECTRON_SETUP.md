# Electron Setup Guide - File-Based Sync (Obsidian Style)

This guide will help you set up Petal as a desktop app with file-based sync using the **PetalVault** architecture.

## Architecture

- **Vault Structure**: Single folder containing all your data
  ```
  OneDrive/PetalVault/
    ├── petal.json          ← Main database (single source of truth)
    ├── petal.json.bak      ← Automatic backup
    ├── exports/            ← Manual export backups
    └── attachments/        ← (Optional) File attachments
  ```

- **Default Locations**:
  - **Windows**: `%ONEDRIVE%/PetalVault/petal.json`
  - **Mac**: `~/Library/Mobile Documents/com~apple~CloudDocs/PetalVault/petal.json` (iCloud Drive)
  - **Fallback**: `~/Documents/PetalVault/petal.json`

- **Sync**: Handled automatically by OneDrive / iCloud Drive
- **Safety Features**:
  - ✅ Atomic writes (prevents corruption)
  - ✅ Automatic backups (.bak file)
  - ✅ Conflict detection (saves as `petal.conflict-YYYYMMDD-HHMMSS.json`)
  - ✅ Choose vault folder on first run

## Prerequisites

1. **Node.js** (v16 or later)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **iCloud Drive** (Mac) or **OneDrive** (Windows)
   - Make sure it's enabled and syncing

## Installation Steps

### 1. Install Dependencies

Open terminal in the app folder and run:

```bash
npm install
```

This installs:
- `electron` - Desktop app framework
- `electron-builder` - Build tool for creating installers

### 2. Run the App (Development)

```bash
npm start
```

**First Run**: The app will prompt you to choose a vault folder. 
- **Recommended**: Choose a folder in OneDrive (Windows) or iCloud Drive (Mac) for automatic sync
- **Default**: App will use the default location if you cancel

Your data will be saved to:
- **Windows**: `%ONEDRIVE%/PetalVault/petal.json` (or your chosen location)
- **Mac**: `~/Library/Mobile Documents/com~apple~CloudDocs/PetalVault/petal.json` (or your chosen location)

### 3. Build Installers

Once everything works, create installers:

**Mac:**
```bash
npm run build:mac
```

**Windows:**
```bash
npm run build:win
```

**Both:**
```bash
npm run build:all
```

Installers will be in the `dist/` folder.

## How It Works

### File Location

The app automatically detects:
- **Mac**: iCloud Drive folder
- **Windows**: OneDrive folder (from environment variables)
- **Fallback**: Documents folder if cloud drive not found

### Sync Behavior

1. **Save**: Every change writes to `tasks.json` in the cloud folder
2. **Load**: App reads from `tasks.json` on startup
3. **Sync**: iCloud Drive / OneDrive syncs the file across devices automatically
4. **Offline**: Works offline, syncs when connection restored

### Data Format

The `petal.json` file contains:
```json
{
  "tasks": [...],
  "projects": [...],
  "openProjects": [...]
}
```

### Safety Features

**Atomic Writes**:
- Data is written to `petal.tmp` first
- Then atomically renamed to `petal.json`
- Prevents corruption if app crashes during save

**Automatic Backups**:
- Before each save, current `petal.json` is copied to `petal.json.bak`
- Always have at least one backup

**Conflict Detection**:
- If file is modified while saving, conflict is detected
- Conflict file saved as `petal.conflict-YYYYMMDD-HHMMSS.json`
- You can manually merge conflicts if needed

**Manual Exports**:
- Export button saves to `exports/petal-export-YYYY-MM-DD.json`
- Keep multiple dated backups

## Troubleshooting

### "Cannot find module 'electron'"
- Run `npm install` again
- Make sure you're in the correct directory

### File not syncing
- Check iCloud Drive / OneDrive is enabled
- Verify the file exists in the cloud folder
- Check cloud drive sync status in system settings

### Data not loading
- Check browser console (View → Developer → Developer Tools)
- Verify vault path: Shown in header (click to see full path)
- Check file permissions
- Look for conflict files in vault folder

### Conflict files detected
- If you see `petal.conflict-*.json` files, a sync conflict occurred
- Compare timestamps to see which is newer
- Manually merge if needed, or delete older conflict files
- The main `petal.json` is the current working version

### Build fails
- Make sure you have icons (`icon-192.png`, `icon-512.png`)
- Check `package.json` build configuration
- Try `npm run build` without platform flag first

## Development Tips

### View Logs
- Open DevTools: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
- Check console for errors

### Test File Location
The app exposes the file path via `window.electronAPI.getDataPath()` in the console.

### Manual Backup
The JSON file is human-readable. You can:
- Copy `petal.json` to backup location
- Use the Export button to create dated backups in `exports/` folder
- Edit it directly (be careful! Make a backup first)
- Restore by replacing the file

### Change Vault Location
1. Close the app
2. Delete or move `vault-path.json` from app data folder:
   - **Mac**: `~/Library/Application Support/petal-task-tracker/vault-path.json`
   - **Windows**: `%APPDATA%/petal-task-tracker/vault-path.json`
3. Restart app - it will prompt to choose a new vault folder

## Next Steps

1. **Customize Icons**: Replace `icon-192.png` and `icon-512.png` with your own
2. **Auto-start**: Set the app to launch at login (System Settings)
3. **Pin to Dock/Taskbar**: Drag app icon to Dock (Mac) or Taskbar (Windows)

## Browser Fallback

The app still works in browsers (using localStorage) if you open `tasklist (1).html` directly. The storage layer automatically detects the environment.
