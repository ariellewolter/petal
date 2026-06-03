import { registerPlugin } from '@capacitor/core';
import type { PetalVaultPlugin } from './definitions';

export * from './definitions';

export const PetalVault = registerPlugin<PetalVaultPlugin>('PetalVault', {
  web: () => import('./web').then((m) => new m.PetalVaultWeb()),
});
