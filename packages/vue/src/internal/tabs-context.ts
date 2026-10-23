import { inject, type ComputedRef } from 'vue';
import type { Sequence } from '@sectile/core/sequence';
import { stableIDElementToken } from '@sectile/dom/identity';
import type { PartContract } from './part-contract.js';
import type { HostDirection } from '../host-provider.js';

export interface TabsIDs {
  readonly trigger: string;
  readonly content: string;
}
export interface TabsIDCache {
  readonly retained: number;
  get(value: string): TabsIDs;
  reconcile(): void;
  dispose(): void;
}
/** IDs are deterministic; only members of the current canonical domain are retained. */
export function createTabsIDCache(instanceID: string, source: () => Sequence<string>): TabsIDCache {
  const entries = new Map<string, TabsIDs>();
  let readDomain: (() => Sequence<string>) | null = source, current: Sequence<string> | null = null;
  const synchronize = (): Sequence<string> => {
    if (readDomain === null) throw new TypeError('Tabs identity owner has been disposed');
    const next = readDomain();
    if (next !== current) {
      for (const id of entries.keys()) if (!next.contains(id)) entries.delete(id);
      current = next;
    }
    return next;
  };
  return Object.freeze({
    get retained() { return entries.size; },
    get(value: string): TabsIDs {
      const domain = synchronize(), cached = entries.get(value);
      if (cached !== undefined) return cached;
      const safe = stableIDElementToken(value);
      const created = Object.freeze({ trigger: `sectile-tabs-${instanceID}-${safe}-trigger`, content: `sectile-tabs-${instanceID}-${safe}-content` });
      if (domain.contains(value)) entries.set(value, created);
      return created;
    },
    reconcile(): void { if (readDomain !== null) synchronize(); },
    dispose(): void { entries.clear(); readDomain = null; current = null; },
  });
}

export interface TabsRootContext {
  readonly domain: ComputedRef<Sequence<string>>;
  readonly value: ComputedRef<string>;
  readonly highlighted: ComputedRef<string | null>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  readonly items: ComputedRef<readonly string[]>;
  readonly orientation: ComputedRef<'horizontal' | 'vertical'>;
  readonly direction: ComputedRef<HostDirection>;
  readonly partContract: PartContract;
  select(value: string, target: HTMLElement): void;
  focus(value: string): void;
  keydown(event: KeyboardEvent): void;
  ids(value: string): TabsIDs;
  activateTarget(value: string): boolean;
}

export const tabsRootContextKey = Symbol('SectileTabsRoot');

export function useTabsRootContext(part: string): TabsRootContext {
  const root = inject<TabsRootContext>(tabsRootContextKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside TabsRoot.`);
  return root;
}
