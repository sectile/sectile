import { inject, type ComputedRef } from 'vue';
import type { PartContract } from './part-contract.js';
import type { HostDirection } from '../host-provider.js';

export interface TabsIDs {
  readonly trigger: string;
  readonly content: string;
}

export interface TabsRootContext {
  readonly value: ComputedRef<string>;
  readonly highlighted: ComputedRef<string | null>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  readonly orientation: ComputedRef<'horizontal' | 'vertical'>;
  readonly direction: ComputedRef<HostDirection>;
  readonly partContract: PartContract;
  select(value: string, target: HTMLElement): void;
  keydown(event: KeyboardEvent): void;
  ids(value: string): TabsIDs;
  relativeTarget(direction: -1 | 1): string | null;
  activateRelative(direction: -1 | 1): boolean;
}

export const tabsRootContextKey = Symbol('SectileTabsRoot');

export function useTabsRootContext(part: string): TabsRootContext {
  const root = inject<TabsRootContext>(tabsRootContextKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside TabsRoot.`);
  return root;
}
