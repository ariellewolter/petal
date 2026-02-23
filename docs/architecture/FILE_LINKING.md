# File Linking Guide

## Overview

Petal uses a smart file linking system that works across Mac, Windows, and (future) iOS devices by storing multiple path formats and resolving them at runtime.

## File Link Data Model

Each file link can store multiple path formats:

```json
{
  "label": "Project Proposal",
  "onedrive_rel": "Research/Grants/aims.docx",
  "abs_path": "C:\\Users\\Arielle\\OneDrive\\Research\\Grants\\aims.docx",
  "share_url": "https://onedrive.live.com/...",
  "type": "docx",
  "warning": "File is outside OneDrive and may not work on other devices"
}
```

### Fields

- **`label`**: Display name for the file
- **`onedrive_rel`**: Path relative to OneDrive root (preferred, cross-device)
- **`abs_path`**: Absolute OS path (fallback, may break on other devices)
- **`share_url`**: OneDrive share link (works on iOS and desktop)
- **`type`**: File extension (optional, for icons)
- **`warning`**: Warning message if file is outside OneDrive

## Path Resolution

When opening a file, Petal tries paths in this order:

1. **`onedrive_rel`** → Resolved against detected OneDrive root
2. **`abs_path`** → Used directly (if exists)
3. **`share_url`** → Opened in browser (fallback)

### OneDrive Root Detection

**Windows:**
- Checks environment variables: `ONEDRIVE`, `ONEDRIVECOMMERCIAL`, `ONEDRIVECONSUMER`
- Falls back to common locations: `~/OneDrive`, `~/OneDrive - Organization`

**macOS:**
- Checks common locations:
  - `~/OneDrive`
  - `~/OneDrive - Organization`
  - `~/OneDrive - Personal`
  - `~/Library/CloudStorage/OneDrive-Personal`
  - `~/Library/CloudStorage/OneDrive-Organization`

**First Run:**
- App prompts to select OneDrive folder if not auto-detected
- Selection is saved in preferences

## File Picker

When you click "Choose file" in Electron:

1. **Opens file picker** starting in OneDrive folder (if detected)
2. **Detects if file is in OneDrive**:
   - ✅ In OneDrive → Creates `onedrive_rel` path
   - ⚠️ Outside OneDrive → Shows warning, uses `abs_path` only
3. **Stores multiple formats** for maximum compatibility

## Best Practices

### ✅ Recommended

- **Store vault in OneDrive**: `OneDrive/PetalVault/`
- **Link files from OneDrive**: Files sync automatically
- **Use relative paths**: `onedrive_rel` works across all devices
- **Copy important files to vault**: `PetalVault/attachments/` for guaranteed sync

### ⚠️ Avoid

- **Absolute paths only**: `C:\Users\...` breaks on other devices
- **Files outside OneDrive**: Won't sync, may not work on other devices
- **Network paths**: `\\server\share\...` may not be accessible

## Cross-Device Behavior

### Desktop (Mac/Windows)

1. Tries to open local file using `onedrive_rel` or `abs_path`
2. Falls back to `share_url` in browser if local file not found
3. Shows error if all paths fail

### iOS (Future)

- Uses `share_url` to open files in OneDrive app or browser
- `onedrive_rel` and `abs_path` not applicable

## File Link Storage

### In Vault Attachments

Files in `PetalVault/attachments/` are stored as:
```json
{
  "label": "Document.pdf",
  "onedrive_rel": "PetalVault/attachments/Document.pdf"
}
```

This works because the vault is inside OneDrive, so the relative path resolves correctly.

### Outside OneDrive

Files outside OneDrive are stored as:
```json
{
  "label": "Local File.docx",
  "abs_path": "C:\\Users\\Arielle\\Documents\\Local File.docx",
  "warning": "File is outside OneDrive and may not work on other devices"
}
```

## Troubleshooting

### File won't open

1. **Check OneDrive root**: Settings → Verify OneDrive folder location
2. **Check file exists**: Verify file hasn't been moved/deleted
3. **Try share URL**: If available, opens in browser
4. **Re-link file**: Use file picker to update link

### Links break on other device

- **Cause**: Using absolute paths only
- **Solution**: Re-link file using file picker (creates `onedrive_rel`)
- **Prevention**: Always link files from within OneDrive

### OneDrive not detected

- **Windows**: Check environment variables, verify OneDrive is installed
- **macOS**: OneDrive may be in non-standard location
- **Solution**: Manually select OneDrive folder when prompted

## Migration from Legacy Format

Old format (still supported):
```json
{
  "name": "File.pdf",
  "url": "C:\\Users\\...\\File.pdf"
}
```

New format (preferred):
```json
{
  "label": "File.pdf",
  "onedrive_rel": "Documents/File.pdf",
  "abs_path": "C:\\Users\\...\\File.pdf"
}
```

The app automatically converts legacy format when loading, but new links use the enhanced format.
