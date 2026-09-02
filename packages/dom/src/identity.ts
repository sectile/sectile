import type { StableID } from '@sectile/core';

/** Preserves the primitive type of a stable identity in host-owned metadata. */
export function stableIDToken(id: StableID): string {
  return typeof id === 'number' ? `n:${id}` : `s:${id}`;
}

/** Encodes a stable identity as an injective token suitable for an HTML id. */
export function stableIDElementToken(id: StableID): string {
  return encodeURIComponent(stableIDToken(id));
}
