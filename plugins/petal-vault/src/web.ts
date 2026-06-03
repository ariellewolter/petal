import { WebPlugin } from '@capacitor/core';
import type { PetalVaultPlugin } from './definitions';

export class PetalVaultWeb extends WebPlugin implements PetalVaultPlugin {
  async loadState(): Promise<never> {
    throw this.unimplemented('loadState');
  }
  async saveState(): Promise<never> {
    throw this.unimplemented('saveState');
  }
  async getVaultPath() {
    return { path: '' };
  }
  async getDataPath() {
    return { path: '' };
  }
  async getVaultDetails() {
    return {};
  }
  async checkVaultExists() {
    return { exists: false };
  }
  async vaultGetStatus() {
    return { resolved: false, needsChoice: true };
  }
  async vaultEnsureResolved() {
    return { resolved: false };
  }
  async vaultChoose() {
    return { cancelled: true };
  }
  async vaultDiscover() {
    return { vaults: [] };
  }
  async vaultSetActive() {
    return { ok: false };
  }
  async vaultOpenFolder() {
    return { ok: false };
  }
  async checkExternalChanges() {
    return { changed: false };
  }
  async supportReloadExternalChanges() {
    return { ok: false };
  }
  async markStateDirty() {
    return undefined;
  }
}
