# Petal Task Tracker

A beautiful, cross-platform task and project tracker that works on Mac, Windows, and iPad/iPhone.

## Features

- ✅ Tasks with priorities, due dates, notes, and file links
- ✅ Projects with subtasks
- ✅ Export/Import functionality
- ✅ **File-based sync** (Obsidian style) - JSON file synced via iCloud Drive / OneDrive
- ✅ **Desktop app** (Electron) - Native file system access
- ✅ **PWA option** - Also works as installable web app
- ✅ Offline support
- ✅ Storage abstraction layer

## Two Ways to Use

### Option 1: Desktop App with File Sync (Recommended)

**Obsidian-style architecture**: Data stored in a JSON file that syncs via iCloud Drive (Mac) or OneDrive (Windows).

**Benefits:**
- ✅ True offline-first
- ✅ OS-level sync (no backend needed)
- ✅ Data file is human-readable JSON
- ✅ Works across Mac + Windows automatically

**Setup:** See [ELECTRON_SETUP.md](ELECTRON_SETUP.md)

### Option 2: Progressive Web App (PWA)

**Browser-based**: Installable web app that uses localStorage.

**Benefits:**
- ✅ Works on iPad/iPhone (Add to Home Screen)
- ✅ No installation needed
- ✅ Works in any browser

**Setup:** See PWA section below

## Quick Start - Desktop App (File Sync)

### 1. Install Node.js

Download from [nodejs.org](https://nodejs.org/) (v16 or later)

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the App

```bash
npm start
```

Your data will be saved to:
- **Mac**: `~/Library/Mobile Documents/com~apple~CloudDocs/Petal/tasks.json`
- **Windows**: `%ONEDRIVE%/Petal/tasks.json`

The file syncs automatically via iCloud Drive / OneDrive!

### 4. Build Installers (Optional)

```bash
npm run build:mac    # Mac installer
npm run build:win    # Windows installer
```

See [ELECTRON_SETUP.md](ELECTRON_SETUP.md) for detailed instructions.

---

## Quick Start - PWA (Web App)

### 1. Create Icon Files

The PWA needs icon files. You have two options:

**Option A: Use the icon generator (easiest)**
1. Open `icon-generator.html` in your browser
2. Click "Generate Icons" 
3. Save the generated icons to this folder

**Option B: Create your own**
- Create `icon-192.png` (192x192 pixels)
- Create `icon-512.png` (512x512 pixels)
- Use a simple design with the app name or a petal icon

### 2. Serve the App

PWAs need to be served over HTTP (not file://). Choose one:

**Using Node.js (recommended):**
```bash
npx serve .
```
Then open the URL shown (usually http://localhost:3000)

**Using Python:**
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000

**Using VS Code:**
Install the "Live Server" extension and right-click `tasklist (1).html` → "Open with Live Server"

### 3. Install as PWA

**Mac (Chrome/Edge):**
- Open the app in Chrome or Edge
- Click the install icon in the address bar
- Or: Menu → "Install Petal..."

**Windows (Chrome/Edge):**
- Open the app in Chrome or Edge  
- Click the install icon in the address bar
- Or: Menu → "Apps" → "Install this site as an app"

**iPad/iPhone:**
- Open in Safari
- Tap Share button
- Tap "Add to Home Screen"
- Customize the name if desired

**Pin to Dock/Taskbar:**
- After installing, drag the app icon to your Dock (Mac) or Taskbar (Windows)
- Set to open at login for "widget-like" behavior

## Export/Import

- **Export**: Click "📥 Export" in the header to download your data as JSON
- **Import**: Click "📤 Import" to upload a JSON file
  - Choose "Merge" to combine with existing data
  - Choose "Cancel" to replace all data

## Future: Cloud Sync

The storage layer is abstracted, making it easy to add cloud sync later:

1. Replace `localStorage` calls in `storage.js` with API calls
2. Add authentication (Firebase, Supabase, etc.)
3. Implement real-time sync subscriptions

## Documentation

- **[Project Summary](docs/PROJECT_SUMMARY.md)** - Overview of the codebase and refactoring status
- **[Refactoring Status](docs/REFACTORING_STATUS.md)** - Current refactoring progress and architecture improvements
- **[Integration Plans](docs/INTEGRATION_PLANS.md)** - Planned and completed feature integrations
- **[Architecture](docs/architecture/)** - System architecture and design patterns
- **[Guides](docs/guides/)** - Development guides and best practices

## Files

- `tasklist (1).html` - Main app (single-file HTML)
- `storage.js` - Storage abstraction layer
- `manifest.json` - PWA manifest
- `service-worker.js` - Offline caching
- `icon-192.png` / `icon-512.png` - App icons (you need to create these)

## Troubleshooting

**App won't install:**
- Make sure you're serving over HTTP (not file://)
- Check browser console for errors
- Ensure manifest.json and icons are accessible

**Service worker not working:**
- Check browser console for registration errors
- Clear browser cache and reload
- Make sure you're using HTTPS or localhost

**Data not syncing:**
- Currently uses localStorage (per-device)
- Use Export/Import to move data between devices
- Cloud sync coming in future update
