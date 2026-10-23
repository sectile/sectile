import type { StableID } from '@sectile/core';
import { stableIDFromToken } from './token.js';

/** Registered identity only; stale or caller-written data markers do not confer ownership. */
export function findDelegatedIdentity<ID>(target: EventTarget | null, root: HTMLElement, owners: WeakMap<HTMLElement, ID>): ID | null {
  let element = target as HTMLElement | null;
  while (element && element !== root) {
    const id = owners.get(element);
    if (id !== undefined) return id;
    element = element.parentElement ?? null;
  }
  return null;
}

export function isNativeInteractionTarget(target: EventTarget | null): boolean {
  return (target as HTMLElement | null)?.matches?.('input,textarea,select,button,a[href],[contenteditable]:not([contenteditable="false"]),[role="textbox"]') === true;
}

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
