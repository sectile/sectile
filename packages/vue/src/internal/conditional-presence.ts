import {
  computed,
  onBeforeUnmount,
  shallowReactive,
  shallowRef,
  watch,
  type ComputedRef,
  type ShallowRef,
} from 'vue';
import { retainExitPresence, type ExitPresenceCancel } from '@sectile/dom/presence';
import { usePresence } from './presence.js';

export interface ConditionalPresenceProps {
  readonly forcePresent?: boolean;
}

export const conditionalPresenceProps = {
  forcePresent: { type: Boolean, default: false },
} as const;

export interface ConditionalPresence {
  readonly element: ShallowRef<HTMLElement | undefined>;
  readonly present: ComputedRef<boolean>;
  readonly hidden: ComputedRef<boolean>;
  register(element: unknown): HTMLElement | undefined;
}

export function resolvePresenceElement(element: unknown): HTMLElement | undefined {
  return typeof HTMLElement !== 'undefined' && element instanceof HTMLElement
    ? element
    : undefined;
}

export function useConditionalPresence(
  active: ComputedRef<boolean>,
  forcePresent: ComputedRef<boolean>,
): ConditionalPresence {
  const element = shallowRef<HTMLElement>();
  const requested = computed(() => active.value || forcePresent.value);
  const retained = usePresence(requested, element);
  const present = computed(() => forcePresent.value || retained.value);
  return Object.freeze({
    element,
    present,
    hidden: computed(() => !present.value),
    register(candidate: unknown) {
      const resolved = resolvePresenceElement(candidate);
      element.value = resolved;
      return resolved;
    },
  });
}

export interface ConditionalPresenceRegistry {
  register(key: string, element: unknown): void;
  isPresent(key: string, active: boolean, forcePresent?: boolean): boolean;
}

export function useConditionalPresenceRegistry(
  activeKeys: ComputedRef<ReadonlySet<string>>,
): ConditionalPresenceRegistry {
  const elements = new Map<string, HTMLElement>();
  const exiting = shallowReactive(new Set<string>());
  const connections = new Map<string, ExitPresenceCancel>();

  const cancelConnection = (key: string): void => {
    const cancel = connections.get(key);
    if (cancel === undefined) return;
    cancel();
    connections.delete(key);
  };

  const cancelExit = (key: string): void => {
    cancelConnection(key);
    exiting.delete(key);
  };

  const startExit = (key: string): void => {
    if (activeKeys.value.has(key)) {
      cancelExit(key);
      return;
    }
    const element = elements.get(key);
    if (element === undefined) {
      cancelExit(key);
      return;
    }
    cancelConnection(key);
    const cancel = retainExitPresence(element, () => {
      connections.delete(key);
      exiting.delete(key);
    });
    if (cancel !== null) connections.set(key, cancel);
  };

  watch(activeKeys, (next, previous) => {
    for (const key of previous) {
      if (!next.has(key)) exiting.add(key);
    }
    for (const key of next) {
      if (!previous.has(key)) cancelExit(key);
    }
  }, { flush: 'sync' });

  watch(activeKeys, (next) => {
    for (const key of exiting) {
      if (!next.has(key) && !connections.has(key)) startExit(key);
    }
  }, { flush: 'post' });

  onBeforeUnmount(() => {
    for (const cancel of connections.values()) cancel();
    connections.clear();
    exiting.clear();
    elements.clear();
  });

  return Object.freeze({
    register(key: string, candidate: unknown) {
      const previousElement = elements.get(key);
      const element = resolvePresenceElement(candidate);
      if (element === undefined) {
        elements.delete(key);
        if (connections.has(key)) cancelExit(key);
        return;
      }
      elements.set(key, element);
      if (!connections.has(key) || previousElement === element) return;
      cancelConnection(key);
      if (!activeKeys.value.has(key) && exiting.has(key)) {
        queueMicrotask(() => {
          if (!activeKeys.value.has(key) && exiting.has(key) && !connections.has(key)) startExit(key);
        });
      }
    },
    isPresent: (key: string, active: boolean, forcePresent?: boolean) => forcePresent || active || exiting.has(key),
  });
}
