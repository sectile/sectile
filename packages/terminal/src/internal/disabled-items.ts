import type { Result, StableID } from '@sectile/core';
import { tryCreateDisabledIdentitySet } from '@sectile/core/adapter-runtime';

export interface IdentityDomain<ID extends StableID> {
  contains(id: ID): boolean;
}

export function createDisabledItems<ID extends StableID>(
  domain: IdentityDomain<ID>,
  items: readonly ID[] = [],
): Result<ReadonlySet<ID>> {
  return tryCreateDisabledIdentitySet(domain, items);
}
