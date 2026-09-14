import {
  onBeforeUnmount,
  shallowRef,
  watch,
  type ShallowRef,
} from 'vue';

interface ProjectionEntry {
  readonly signal: ShallowRef<number>;
  consumers: number;
}

export interface ItemProjectionRegistry {
  acquire(id: string): ShallowRef<number>;
  release(id: string): void;
  invalidate(id: string | null | undefined): void;
  invalidateAll(): void;
  clear(): void;
}

export function createItemProjectionRegistry(): ItemProjectionRegistry {
  const entries = new Map<string, ProjectionEntry>();
  return Object.freeze({
    acquire(id: string): ShallowRef<number> {
      const existing = entries.get(id);
      if (existing !== undefined) {
        existing.consumers += 1;
        return existing.signal;
      }
      const signal = shallowRef(0);
      entries.set(id, { signal, consumers: 1 });
      return signal;
    },
    release(id: string): void {
      const entry = entries.get(id);
      if (entry === undefined) return;
      entry.consumers -= 1;
      if (entry.consumers === 0) entries.delete(id);
    },
    invalidate(id: string | null | undefined): void {
      if (id === null || id === undefined) return;
      const signal = entries.get(id)?.signal;
      if (signal !== undefined) signal.value += 1;
    },
    invalidateAll(): void {
      for (const entry of entries.values()) entry.signal.value += 1;
    },
    clear(): void {
      entries.clear();
    },
  });
}

export function useItemProjectionSignal(
  registry: ItemProjectionRegistry,
  id: () => string,
): () => number {
  let currentID = id();
  let signal = registry.acquire(currentID);
  watch(id, (nextID) => {
    if (nextID === currentID) return;
    registry.release(currentID);
    currentID = nextID;
    signal = registry.acquire(currentID);
  }, { flush: 'sync' });
  onBeforeUnmount(() => registry.release(currentID));
  return () => signal.value;
}
