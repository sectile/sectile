import type { Result, StableID } from '@sectile/core';

export interface IdentityDomain<ID extends StableID> {
  contains(id: ID): boolean;
}

export function createDisabledItems<ID extends StableID>(
  domain: IdentityDomain<ID>,
  items: readonly ID[] = [],
): Result<ReadonlySet<ID>> {
  const disabled = new Set(items);
  for (const id of disabled) {
    if (!domain.contains(id)) {
      return { ok: false, error: {
        class: 'construction',
        code: 'disabled-item-outside-domain',
        message: 'Every disabled item must exist in the component domain.',
        details: { id },
      } };
    }
  }
  return { ok: true, value: disabled };
}
