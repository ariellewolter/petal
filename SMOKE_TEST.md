# Smoke Test Sequence

This document outlines the required smoke tests that must pass in both development and packaged builds.

## Prerequisites

- Development build: `npm start`
- Packaged build: Install and run the packaged application

## Test Sequence A: First Launch with No Config

### Steps:

1. **Delete Application Support/Petal/** (or at least the config file) to simulate a clean install.
   - macOS: `~/Library/Application Support/Petal/`
   - Windows: `%APPDATA%\Petal\`
   - Linux: `~/.config/Petal/`

2. **Launch the app**

3. **Expected**: Vault discovery or prompt should appear

4. **Choose/create a vault folder**
   - Select a folder (recommended: OneDrive/iCloud Drive for sync)
   - Or create a new vault

5. **Create 1 task**
   - Add a task with a unique title (e.g., "Smoke Test Task - [timestamp]")
   - Verify it appears in the UI

6. **Close app**

7. **Reopen app**

8. **Expected**: Task persists and appears in the UI

## Test Sequence B: Verify Truth Source Paths

### Steps:

1. **Open renderer console** (DevTools)
   - Development: DevTools should be open automatically
   - Packaged: Use `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)

2. **Run diagnostics command**:
   ```javascript
   const d = await window.electronAPI.vaultGetDiagnostics();
   console.log(d);
   ```

3. **Confirm in the output**:
   - ✅ `config_path` is under Application Support / userData
   - ✅ `active_vault_path` is what you selected
   - ✅ `petal.json` exists and has a recent modified time
   - ✅ `active_vault.data_file.exists` is `true`
   - ✅ `active_vault.data_file.last_modified` is recent

### Alternative: Use Diagnostics UI

- Right-click on the vault path in the header (or press `Ctrl+Shift+D` / `Cmd+Shift+D`)
- Verify all paths are correct

## Test Sequence C: Packaged Build Test

**CRITICAL**: This test must be run in the packaged build, not just development.

### Steps:

1. **Install/run the packaged build**

2. **Repeat Test Sequence A** (first launch, create task, verify persistence)

3. **Repeat Test Sequence B** (verify paths)

4. **Additional check**: Verify preload works
   ```javascript
   console.log(!!window.electronAPI, window.electronAPI && Object.keys(window.electronAPI));
   ```
   - Expected: `true` and a non-empty array of API methods
   - If `false` or empty, persistence will never work

## Additional Validation Tests

### 2. Confirm Renderer State is Wired to Vault Lifecycle

**Test**: On boot, renderer must wait for vault resolution before loading state.

**How to verify**:
1. Open DevTools console
2. Look for log messages:
   - ✅ "⏳ Waiting for vault resolution..."
   - ✅ "✓ Vault resolved event received:" or "✓ Vault already resolved:"
   - ✅ State loads only after vault is resolved

**Failure symptoms**:
- Tasks don't persist
- "Vault not resolved" errors in console
- State loads before vault is ready

### 3. Validate No Split-Brain (Backward Compatibility)

**Test**: All save/load operations use the same vault path.

**How to verify**:
1. Check console logs during save:
   - Should show: "💾 Saved successfully to vault: [path]"
   - Path should match `active_vault_path` from diagnostics

2. Check console logs during load:
   - Should show: "📂 Loading from vault: [path]"
   - Path should match `active_vault_path` from diagnostics

3. Verify no fallback to old `getDefaultVaultPath()`:
   - All operations should use `VaultManager.getActiveVaultPath()`

**Failure symptoms**:
- Tasks saved to one location, loaded from another
- "Using default vault (no user selection)" warnings when vault is set

### 4. Canary Write Test

**Test**: Filesystem access is verified on vault activation.

**How to verify**:
1. Check main process logs (or vault manager logs):
   - Should show: "✓ Canary write test passed"
   - Should show canary file path and stats

2. Check vault folder:
   - File `.petal_canary` should exist
   - Should contain vault ID and timestamp

**Failure symptoms**:
- "✗ Canary write test FAILED" in logs
- Missing `.petal_canary` file
- Permission errors

### 5. External Modification Detection

**Test**: App detects when petal.json is modified externally.

**How to verify**:
1. With app open, manually edit `petal.json` in a text editor
2. Save the file
3. Expected: Banner notification appears: "Vault Updated Externally"
4. Expected: Console log: "⚠️ External modification detected on petal.json"

**Failure symptoms**:
- No notification when file changes
- Changes not detected

### 6. Diagnostics UI

**Test**: Diagnostics panel shows correct information.

**How to verify**:
1. Open diagnostics: Right-click vault path or press `Ctrl+Shift+D` / `Cmd+Shift+D`
2. Verify all fields are populated:
   - App version
   - Platform
   - Config path (under Application Support)
   - Active vault path
   - Data file exists and has recent mtime
   - Preload status shows "Present"

**Failure symptoms**:
- Missing or incorrect paths
- Preload shows "Missing"
- Data file shows "Not found"

### 7. Preload Path in Packaged Builds

**Test**: Preload script loads correctly in packaged build.

**How to verify**:
1. In packaged build, open DevTools
2. Run: `console.log(!!window.electronAPI, window.electronAPI && Object.keys(window.electronAPI));`
3. Expected: `true [array of method names]`
4. If false, check:
   - `main.js` uses `path.join(__dirname, 'preload.js')`
   - Preload file is included in packaged build
   - No path resolution errors in main process logs

**Failure symptoms**:
- `window.electronAPI` is `undefined`
- IPC calls fail silently
- No persistence works

## Quality Gate: 8 Checks That Mean "Persistence is Real"

Run these checks in **both dev and packaged builds**. If any one fails, the diagnostics modal + logs should tell you exactly why.

### Check 1: Diagnostics Modal Opens
- **Test**: Press `Cmd/Ctrl+Shift+D` (or right-click vault path)
- **Expected**: Diagnostics modal opens
- **Verify**: Shows `window.electronAPI: Present`
- **Failure**: If missing, preload didn't load → persistence won't work

### Check 2: Vault Path Matches Selection
- **Test**: Open diagnostics modal
- **Expected**: `Active Vault Path` matches where you selected it
- **Verify**: Path is correct and exists
- **Failure**: Split-brain or wrong vault selected

### Check 3: Vault Manifest Exists
- **Test**: Check vault folder in Finder/Explorer
- **Expected**: `.vault_manifest.json` exists at vault root
- **Verify**: File contains vault ID and creation date
- **Failure**: Vault not properly initialized

### Check 4: Canary File Exists
- **Test**: Check vault folder after activation
- **Expected**: `.petal_canary` exists and contains vault ID
- **Verify**: File has recent timestamp and matches vault ID
- **Failure**: Filesystem access test failed → writes may fail

### Check 5: petal.json Updates on Edit
- **Test**: 
  1. Note current `petal.json` mtime (from diagnostics or file properties)
  2. Edit a task in the app
  3. Wait 1-2 seconds
  4. Check mtime again
- **Expected**: mtime updates to current time
- **Verify**: File size may also change
- **Failure**: Saves not actually writing to disk

### Check 6: State Reloads on Restart
- **Test**: 
  1. Create/edit a task
  2. Close app completely
  3. Reopen app
- **Expected**: Task persists and appears in UI
- **Verify**: Task count matches, task content is correct
- **Failure**: Load not reading from correct file or vault not resolved

### Check 7: Cloud Sync Works
- **Test**: 
  1. Move vault to OneDrive/iCloud Drive folder
  2. Restart app
  3. Verify it still loads
- **Expected**: App finds and loads vault from new location
- **Verify**: Diagnostics shows new path, tasks load correctly
- **Failure**: Path resolution broken or config not updated

### Check 8: External Modification Detection
- **Test**: 
  1. With app open, manually edit `petal.json` (add whitespace, change a value)
  2. Save the file
  3. Wait 2-5 seconds
- **Expected**: Banner notification appears: "Vault Updated Externally"
- **Verify**: Console shows "⚠️ External modification detected"
- **Failure**: File watcher/polling not working

## Deliverable Checklist

- [ ] Packaged build creates/chooses vault on first launch
- [ ] `petal.json` is created in vault root
- [ ] Tasks persist across restart
- [ ] `vaultGetDiagnostics()` reports correct paths and timestamps
- [ ] Preload works in packaged build (`window.electronAPI` present)
- [ ] No silent failures: save returns `{ok:false, error}` on failure and UI surfaces it
- [ ] No split-brain: only one canonical vault path used everywhere
- [ ] Canary write test passes on vault activation
- [ ] External modifications are detected and user is notified
- [ ] Diagnostics UI shows all correct information
- [ ] **All 8 Quality Gate checks pass in dev build**
- [ ] **All 8 Quality Gate checks pass in packaged build**
- [ ] **All 4 Additional Quality Gate checks pass (see below)**

## Additional Quality Gate: 4 Production-Grade Tests

These tests ensure the app handles edge cases gracefully and doesn't lose data.

### Check 9: Corrupt JSON Recovery
- **Test**: 
  1. Close app
  2. Manually edit `petal.json` to make it invalid JSON (e.g., remove a closing brace)
  3. Save the file
  4. Launch app
- **Expected**: 
  - App opens successfully
  - Banner shows: "Data file unreadable; restored from backup"
  - Corrupted file saved as `petal.json.corrupt.<timestamp>`
  - App loads data from `petal.json.bak`
- **Failure**: App crashes or shows empty state without recovery attempt

### Check 10: Vault Relocation
- **Test**: 
  1. Note current vault path
  2. Close app
  3. Move/rename the vault folder to a new location
  4. Launch app
- **Expected**: 
  - App detects vault is missing
  - Runs discovery (finds vault by ID)
  - Automatically updates config with new path
  - OR prompts: "Vault moved—select new location"
  - App loads correctly from new location
- **Failure**: App shows "no vault" or creates empty vault instead of finding moved one

### Check 11: External Change with Dirty State
- **Test**: 
  1. Edit a task in the app (don't save yet)
  2. In another editor, modify `petal.json` externally
  3. Wait for detection (2-5 seconds)
- **Expected**: 
  - Banner appears: "⚠️ External Changes Detected"
  - Shows three options:
    - "Reload External Changes" (discards local changes)
    - "Keep My Current State" (keeps local, may overwrite external)
    - "Export My State" (saves local to file)
  - Does NOT silently overwrite external changes
- **Failure**: No warning shown, or external changes silently overwritten

### Check 12: Single Instance Enforcement
- **Test**: 
  1. Launch app (first instance)
  2. Try to launch app again (second instance)
- **Expected**: 
  - Second launch focuses existing window
  - Only one instance runs
  - No multiple writers to same file
- **Failure**: Two instances run simultaneously, causing write conflicts

## Deliverable Checklist

- [ ] Packaged build creates/chooses vault on first launch
- [ ] `petal.json` is created in vault root
- [ ] Tasks persist across restart
- [ ] `vaultGetDiagnostics()` reports correct paths and timestamps
- [ ] Preload works in packaged build (`window.electronAPI` present)
- [ ] No silent failures: save returns `{ok:false, error}` on failure and UI surfaces it
- [ ] No split-brain: only one canonical vault path used everywhere
- [ ] Canary write test passes on vault activation
- [ ] External modifications are detected and user is notified
- [ ] Diagnostics UI shows all correct information
- [ ] **All 8 Quality Gate checks pass in dev build**
- [ ] **All 8 Quality Gate checks pass in packaged build**
- [ ] **All 4 Additional Quality Gate checks pass**

## Common Issues and Solutions

### Issue: "Vault not resolved" errors
**Solution**: Check that `vault:resolved` event is sent from main process and renderer waits for it.

### Issue: Tasks don't persist
**Solution**: 
1. Check preload is loaded (`window.electronAPI` exists)
2. Check vault is resolved before state loads
3. Check save returns `{ok: true}`

### Issue: Split-brain (saves to one place, loads from another)
**Solution**: Ensure all `storage:save` and `storage:load` handlers use `VaultManager.getActiveVaultPath()` only.

### Issue: Preload not working in packaged build
**Solution**: 
1. Verify `preload.js` is in the same directory as `main.js`
2. Check `path.join(__dirname, 'preload.js')` resolves correctly
3. Ensure preload is included in build assets
4. **Check diagnostics**: Preload path should show actual resolved path
5. **Verify**: `window.electronAPI` exists in packaged build console
6. If `__dirname` is wrong in packaged build, may need to use `app.getAppPath()` or adjust build config

### Issue: Canary write fails
**Solution**: 
1. Check vault folder permissions
2. Check if vault is in a cloud sync folder (may have delays)
3. Verify filesystem access is not restricted

## Notes

- All tests must pass in **both** development and packaged builds
- Packaged build test is **mandatory** and cannot be skipped
- If any test fails, the issue must be fixed before considering the feature complete
