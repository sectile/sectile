import type { RowProfile } from './constants.js';

export function requiresExactTotalHeight(rowProfile: RowProfile): boolean {
  return rowProfile === 'uniform';
}
