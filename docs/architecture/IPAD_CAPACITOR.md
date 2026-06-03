# Petal on iPad (Capacitor + iCloud vault sync)

Petal’s Mac app stores data in **PetalVault/petal.json**. The iPad app uses the same format via the **PetalVault** Capacitor plugin and the shared **petalPlatform** JS layer.

## Cross-device sync (Mac + iPad)

| Platform | Vault location |
|----------|----------------|
| **Mac (Electron)** | `iCloud Drive/PetalVault/petal.json` (default) |
| **iPad** | **Same folder** — user picks `iCloud Drive → PetalVault` in the document picker |

**Requirements:** Same Apple ID, iCloud Drive enabled on both devices.

### First launch on iPad

1. Confirm Mac vault in **Settings → Vault** (path should end in `PetalVault`).
2. On iPad, accept the welcome prompt **or** go to **Settings → Choose iCloud Vault Folder**.
3. In the Files picker: **iCloud Drive → PetalVault** (select the folder).
4. Wait for iCloud to finish uploading on Mac if the folder was just created.

## Apple Developer (your account)

| Field | Value |
|-------|--------|
| Team ID | `74MA96HS7Z` |
| Bundle ID | `com.petal.tasktracker` |
| Program | Apple Developer Program (Individual) |

## Repo layout

```
src/platform/          # petalPlatform (electron | ios | web)
plugins/petal-vault/   # Native iOS vault + document picker
www/                   # Generated (npm run cap:prepare)
ios/                   # Xcode project (after cap add ios)
capacitor.config.ts
```

## Developer setup

### Prerequisites

- macOS with **Xcode** and **CocoaPods** (`brew install cocoapods`)
- Node 24+

### Commands

```bash
npm install
npm run cap:prepare
npx cap add ios              # once
npm run cap:sync:ios
npm run cap:open:ios
```

### Xcode (required)

1. **Signing**: Team **74MA96HS7Z**, bundle `com.petal.tasktracker`
2. **Capabilities → iCloud**: enable **iCloud Documents**
3. Run on **iPad** simulator or device

### TestFlight → App Store

1. Xcode → **Product → Archive** → **Distribute** → App Store Connect
2. [App Store Connect](https://appstoreconnect.apple.com) → create app **Petal**
3. **TestFlight** for beta; **App Review** for public release

Mac **GitHub Releases** stay separate (no fork, no npm package for users).

## Roadmap

- [x] petalPlatform abstraction
- [x] PetalVault plugin (load/save, bookmarks, document picker)
- [x] External change polling + reload
- [x] Settings / init flows for iPad vault pick
- [ ] `npx cap add ios` + commit `ios/` project (on your Mac)
- [ ] iPad layout pass (sidebar, touch targets)
- [ ] iOS file open / pick for linked files
- [ ] TestFlight build

## Troubleshooting

- **Empty on iPad**: Wrong folder — re-pick **iCloud Drive/PetalVault**.
- **Plugin not found**: `npm run cap:sync:ios`
- **Picker cancelled**: Settings → **Choose iCloud Vault Folder** again.
