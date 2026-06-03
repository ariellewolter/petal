import Foundation

/// File-backed PetalVault (petal.json) with iCloud-friendly storage.
final class PetalVaultStore {
    static let folderName = "PetalVault"
    static let dataFileName = "petal.json"
    static let bookmarkKey = "petal_vault_security_scoped_bookmark"

    private let fileManager = FileManager.default

    var hasUserChosenBookmark: Bool {
        UserDefaults.standard.data(forKey: Self.bookmarkKey) != nil
    }

    // MARK: - Vault resolution

    func resolveVaultURL() throws -> URL {
        if let url = try resolveBookmarkedVault() {
            return url
        }
        if let url = try defaultUbiquityVaultURL() {
            try ensureVaultDirectory(at: url)
            return url
        }
        let docs = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        let url = docs.appendingPathComponent(Self.folderName, isDirectory: true)
        try ensureVaultDirectory(at: url)
        return url
    }

    func dataFileURL() throws -> URL {
        try resolveVaultURL().appendingPathComponent(Self.dataFileName)
    }

    func resolveBookmarkedVault() throws -> URL? {
        guard let data = UserDefaults.standard.data(forKey: Self.bookmarkKey) else {
            return nil
        }
        var stale = false
        let url = try URL(
            resolvingBookmarkData: data,
            options: [],
            relativeTo: nil,
            bookmarkDataIsStale: &stale
        )
        if stale {
            try storeBookmark(for: url)
        }
        return url
    }

    func defaultUbiquityVaultURL() throws -> URL? {
        guard let container = fileManager.url(forUbiquityContainerIdentifier: nil) else {
            return nil
        }
        return container
            .appendingPathComponent("Documents", isDirectory: true)
            .appendingPathComponent(Self.folderName, isDirectory: true)
    }

    /// Normalize picker result to the PetalVault folder (matches Mac `…/PetalVault/petal.json`).
    func normalizePickedVaultURL(_ url: URL) -> URL {
        var isDirectory: ObjCBool = false
        let exists = fileManager.fileExists(atPath: url.path, isDirectory: &isDirectory)

        if exists && !isDirectory.boolValue {
            if url.lastPathComponent == Self.dataFileName {
                return url.deletingLastPathComponent()
            }
        }

        if url.lastPathComponent == Self.folderName {
            return url
        }

        let nested = url.appendingPathComponent(Self.folderName, isDirectory: true)
        if fileManager.fileExists(atPath: nested.path) {
            return nested
        }

        return url.appendingPathComponent(Self.folderName, isDirectory: true)
    }

    func storeBookmark(for vaultURL: URL) throws {
        let data = try vaultURL.bookmarkData(
            options: [],
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        UserDefaults.standard.set(data, forKey: Self.bookmarkKey)
    }

    func clearBookmark() {
        UserDefaults.standard.removeObject(forKey: Self.bookmarkKey)
    }

    func ensureVaultDirectory(at url: URL) throws {
        try withSecurityScopedAccess(to: url) { scopedURL in
            if !fileManager.fileExists(atPath: scopedURL.path) {
                try fileManager.createDirectory(at: scopedURL, withIntermediateDirectories: true)
            }
        }
    }

    // MARK: - Security-scoped access (required for iCloud Drive / document picker)

    func withSecurityScopedAccess<T>(to url: URL, _ block: (URL) throws -> T) throws -> T {
        let accessed = url.startAccessingSecurityScopedResource()
        defer {
            if accessed {
                url.stopAccessingSecurityScopedResource()
            }
        }
        return try block(url)
    }

    func withResolvedVault<T>(_ block: (URL) throws -> T) throws -> T {
        let vaultURL = try resolveVaultURL()
        return try withSecurityScopedAccess(to: vaultURL, block)
    }

    // MARK: - Read / write

    func loadJSON() throws -> [String: Any] {
        try withResolvedVault { vaultURL in
            let fileURL = vaultURL.appendingPathComponent(Self.dataFileName)
            guard fileManager.fileExists(atPath: fileURL.path) else {
                return emptyPayload()
            }
            let data = try Data(contentsOf: fileURL)
            let parsed = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            return parsed ?? emptyPayload()
        }
    }

    func saveJSON(_ state: [String: Any]) throws {
        try withResolvedVault { vaultURL in
            if !fileManager.fileExists(atPath: vaultURL.path) {
                try fileManager.createDirectory(at: vaultURL, withIntermediateDirectories: true)
            }
            let fileURL = vaultURL.appendingPathComponent(Self.dataFileName)
            let data = try JSONSerialization.data(withJSONObject: state, options: [.prettyPrinted])
            let tmpURL = vaultURL.appendingPathComponent(".petal.json.tmp")
            try data.write(to: tmpURL, options: .atomic)
            if fileManager.fileExists(atPath: fileURL.path) {
                try fileManager.removeItem(at: fileURL)
            }
            try fileManager.moveItem(at: tmpURL, to: fileURL)
            let bakURL = vaultURL.appendingPathComponent("petal.json.bak")
            try? data.write(to: bakURL, options: .atomic)
        }
    }

    func vaultHasData() -> Bool {
        guard let fileURL = try? dataFileURL(),
              fileManager.fileExists(atPath: fileURL.path),
              let data = try? Data(contentsOf: fileURL),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return false }
        let tasks = json["tasks"] as? [[String: Any]] ?? []
        let projects = json["projects"] as? [[String: Any]] ?? []
        return !tasks.isEmpty || !projects.isEmpty
    }

    func dataFileModificationDate() -> Date? {
        guard let fileURL = try? dataFileURL(),
              let attrs = try? fileManager.attributesOfItem(atPath: fileURL.path),
              let mod = attrs[.modificationDate] as? Date
        else { return nil }
        return mod
    }

    private func emptyPayload() -> [String: Any] {
        [
            "tasks": [],
            "projects": [],
            "openProjects": [],
            "settings": [:] as [String: Any],
            "files": [],
            "fileHistory": [:] as [String: Any],
            "fileRegistry": [:] as [String: Any],
            "events": [],
            "recurringRules": [],
            "habits": [],
            "habitCheckins": [:] as [String: Any],
            "routines": [],
            "routineCheckins": [:] as [String: Any],
            "workflow": [:] as [String: Any],
            "prints3d": [],
        ]
    }
}
