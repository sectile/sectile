import type { StableID } from '@sectile/core';
import { stableIDFromToken } from './stable-id-token.js';

export function findDelegatedID(
  target: EventTarget | null,
  root: HTMLElement,
  key: string,
): string | null {
  let element = target as HTMLElement | null;
  while (element != null && element !== root) {
    const id = element.dataset?.[key];
    if (id !== undefined) return id;
    element = element.parentElement ?? null;
  }
  return root.dataset[key] ?? null;
}

export function findDelegatedStableID(
  target: EventTarget | null,
  root: HTMLElement,
  key: string,
): StableID | null {
  const token = findDelegatedID(target, root, key);
  return token === null ? null : stableIDFromToken(token);
}
