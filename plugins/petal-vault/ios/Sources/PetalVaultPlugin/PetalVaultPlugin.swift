import Foundation
import Capacitor
import UIKit
import UniformTypeIdentifiers

@objc(PetalVaultPlugin)
public class PetalVaultPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PetalVaultPlugin"
    public let jsName = "PetalVault"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "loadState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getVaultPath", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDataPath", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getVaultDetails", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkVaultExists", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vaultGetStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vaultEnsureResolved", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vaultChoose", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vaultDiscover", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vaultSetActive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkExternalChanges", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "supportReloadExternalChanges", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "markStateDirty", returnType: CAPPluginReturnPromise),
    ]

    private let store = PetalVaultStore()
    private var lastModified: Date?
    private var pendingChooseCall: CAPPluginCall?
    private var pollTimer: Timer?

    public override func load() {
        super.load()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        startPollingExternalChanges()
    }

    deinit {
        pollTimer?.invalidate()
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func appDidBecomeActive() {
        _ = checkExternalChangesAndNotify()
    }

    private func startPollingExternalChanges() {
        pollTimer?.invalidate()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            _ = self?.checkExternalChangesAndNotify()
        }
    }

    @discardableResult
    private func checkExternalChangesAndNotify() -> Bool {
        guard let mod = store.dataFileModificationDate() else { return false }
        let changed = lastModified != nil && mod > lastModified!
        if changed {
            lastModified = mod
            if let path = try? store.dataFileURL().path {
                notifyListeners("vault:externalModification", data: ["path": path])
            }
        }
        return changed
    }

    private func statusPayload() -> [String: Any] {
        do {
            let path = try store.resolveVaultURL().path
            let resolved = true
            let needsChoice = !store.hasUserChosenBookmark && !store.vaultHasData()
            return [
                "resolved": resolved,
                "activeVaultPath": path,
                "vaultPath": path,
                "needsChoice": needsChoice,
                "initialized": true,
                "activeVault": [
                    "path": path,
                    "exists": FileManager.default.fileExists(atPath: path),
                    "isValid": true,
                ],
            ]
        } catch {
            return [
                "resolved": false,
                "activeVaultPath": NSNull(),
                "needsChoice": true,
                "initialized": true,
                "lastError": error.localizedDescription,
            ]
        }
    }

    @objc func loadState(_ call: CAPPluginCall) {
        do {
            let data = try store.loadJSON()
            lastModified = store.dataFileModificationDate()
            call.resolve([
                "data": data,
                "hasConflicts": false,
                "conflicts": [],
                "newerConflicts": [],
            ])
        } catch {
            call.reject("loadState failed: \(error.localizedDescription)")
        }
    }

    @objc func saveState(_ call: CAPPluginCall) {
        guard let state = call.getObject("state") else {
            call.reject("Missing state")
            return
        }
        do {
            try store.saveJSON(state)
            lastModified = store.dataFileModificationDate()
            call.resolve(["ok": true])
        } catch {
            call.resolve(["ok": false, "error": error.localizedDescription])
        }
    }

    @objc func getVaultPath(_ call: CAPPluginCall) {
        do {
            call.resolve(["path": try store.resolveVaultURL().path])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func getDataPath(_ call: CAPPluginCall) {
        do {
            call.resolve(["path": try store.dataFileURL().path])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func getVaultDetails(_ call: CAPPluginCall) {
        do {
            let vault = try store.resolveVaultURL().path
            let data = try store.dataFileURL().path
            call.resolve([
                "activeVaultPath": vault,
                "vaultPath": vault,
                "dataPath": data,
                "exists": FileManager.default.fileExists(atPath: data),
            ])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func checkVaultExists(_ call: CAPPluginCall) {
        do {
            let path = try store.dataFileURL().path
            call.resolve([
                "exists": FileManager.default.fileExists(atPath: path),
                "path": path,
            ])
        } catch {
            call.resolve(["exists": false])
        }
    }

    @objc func vaultGetStatus(_ call: CAPPluginCall) {
        call.resolve(statusPayload())
    }

    @objc func vaultEnsureResolved(_ call: CAPPluginCall) {
        let status = statusPayload()
        let resolved = (status["resolved"] as? Bool) == true
        if resolved, let path = status["activeVaultPath"] as? String {
            notifyListeners("vault:resolved", data: ["vaultPath": path])
        } else {
            notifyListeners("vault:needsChoice", data: [:])
        }
        call.resolve(status)
    }

    @objc func vaultChoose(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let presenter = self.bridge?.viewController else {
                call.reject("No view controller to present picker")
                return
            }
            self.pendingChooseCall = call
            let picker: UIDocumentPickerViewController
            if #available(iOS 14.0, *) {
                picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.folder], asCopy: false)
            } else {
                picker = UIDocumentPickerViewController(documentTypes: ["public.folder"], in: .open)
            }
            picker.delegate = self
            picker.allowsMultipleSelection = false
            picker.modalPresentationStyle = .formSheet
            if #available(iOS 13.0, *) {
                picker.shouldShowFileExtensions = true
            }
            presenter.present(picker, animated: true)
        }
    }

    @objc func vaultDiscover(_ call: CAPPluginCall) {
        var vaults: [[String: Any]] = []
        if let url = try? store.resolveVaultURL() {
            vaults.append([
                "path": url.path,
                "label": "Active vault",
                "hasData": store.vaultHasData(),
            ])
        }
        if let ubiquity = try? store.defaultUbiquityVaultURL() {
            let path = ubiquity.path
            if !vaults.contains(where: { ($0["path"] as? String) == path }) {
                vaults.append([
                    "path": path,
                    "label": "iCloud (app container)",
                    "hasData": false,
                ])
            }
        }
        call.resolve(["success": true, "vaults": vaults])
    }

    @objc func vaultSetActive(_ call: CAPPluginCall) {
        guard let path = call.getString("vaultPath") else {
            call.reject("vaultPath required")
            return
        }
        let url = URL(fileURLWithPath: path, isDirectory: true)
        do {
            try store.storeBookmark(for: url)
            call.resolve(["ok": true, "success": true, "vaultPath": path])
            notifyListeners("vault:resolved", data: ["vaultPath": path])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func checkExternalChanges(_ call: CAPPluginCall) {
        let changed = checkExternalChangesAndNotify()
        call.resolve(["changed": changed])
    }

    @objc func supportReloadExternalChanges(_ call: CAPPluginCall) {
        do {
            let data = try store.loadJSON()
            lastModified = store.dataFileModificationDate()
            call.resolve(["ok": true, "data": data])
            notifyListeners("vault:reloadState", data: ["data": data])
        } catch {
            call.resolve(["ok": false])
        }
    }

    @objc func markStateDirty(_ call: CAPPluginCall) {
        call.resolve()
    }

    private func finishVaultChoose(cancelled: Bool, vaultURL: URL? = nil, error: String? = nil) {
        guard let call = pendingChooseCall else { return }
        pendingChooseCall = nil
        if cancelled {
            call.resolve(["success": false, "canceled": true, "cancelled": true])
            return
        }
        if let error = error {
            call.resolve(["success": false, "error": error])
            return
        }
        guard let vaultURL = vaultURL else {
            call.resolve(["success": false, "error": "No folder selected"])
            return
        }
        do {
            let normalized = store.normalizePickedVaultURL(vaultURL)
            try store.withSecurityScopedAccess(to: vaultURL) { _ in () }
            try store.storeBookmark(for: normalized)
            try store.ensureVaultDirectory(at: normalized)
            let path = normalized.path
            lastModified = store.dataFileModificationDate()
            call.resolve([
                "success": true,
                "vaultPath": path,
                "canceled": false,
                "cancelled": false,
            ])
            notifyListeners("vault:resolved", data: ["vaultPath": path])
        } catch let err {
            call.resolve(["success": false, "error": err.localizedDescription])
        }
    }
}

extension PetalVaultPlugin: UIDocumentPickerDelegate {
    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        finishVaultChoose(cancelled: true)
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let picked = urls.first else {
            finishVaultChoose(cancelled: true)
            return
        }
        finishVaultChoose(cancelled: false, vaultURL: picked)
    }
}
