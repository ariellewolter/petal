export interface PetalVaultPlugin {
  loadState(): Promise<LoadStateResult>;
  saveState(options: { state: Record<string, unknown> }): Promise<SaveStateResult>;
  getVaultPath(): Promise<{ path: string }>;
  getDataPath(): Promise<{ path: string }>;
  getVaultDetails(): Promise<VaultDetails>;
  checkVaultExists(): Promise<{ exists: boolean; path?: string }>;
  vaultGetStatus(): Promise<VaultStatus>;
  vaultEnsureResolved(): Promise<{ resolved: boolean; vaultPath?: string }>;
  vaultChoose(): Promise<VaultChooseResult>;
  vaultDiscover(): Promise<{ vaults: VaultCandidate[] }>;
  vaultSetActive(options: { vaultPath: string }): Promise<{ ok: boolean }>;
  vaultOpenFolder(options: { vaultPath?: string }): Promise<{ ok: boolean }>;
  checkExternalChanges(): Promise<{ changed: boolean }>;
  supportReloadExternalChanges(): Promise<{ ok: boolean; data?: unknown }>;
  markStateDirty(): Promise<void>;
  addListener(
    eventName: string,
    listenerFunc: (data: unknown) => void
  ): Promise<{ remove: () => void }>;
}

export interface LoadStateResult {
  data: Record<string, unknown>;
  hasConflicts?: boolean;
  conflicts?: string[];
  newerConflicts?: string[];
}

export interface SaveStateResult {
  ok: boolean;
  error?: string;
}

export interface VaultStatus {
  resolved: boolean;
  vaultPath?: string | null;
  needsChoice?: boolean;
}

export interface VaultChooseResult {
  cancelled?: boolean;
  vaultPath?: string;
}

export interface VaultCandidate {
  path: string;
  label: string;
  hasData?: boolean;
}

export interface VaultDetails {
  vaultPath?: string;
  dataPath?: string;
  exists?: boolean;
}
