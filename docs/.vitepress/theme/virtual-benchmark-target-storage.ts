export const benchmarkTargetStorageKey = 'sectile-virtual-benchmark-targets';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredTargets {
  readonly schemaVersion: 1;
  readonly targets: readonly unknown[];
}

export function restoreBenchmarkTargets<T extends { readonly id: number }>(
  storage: StorageLike,
  normalize: (value: unknown) => T | null,
): { readonly targets: readonly T[]; readonly nextID: number } {
  try {
    const raw = storage.getItem(benchmarkTargetStorageKey);
    if (raw === null) return { targets: [], nextID: 1 };
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredTargets(parsed)) throw new Error('Invalid benchmark target storage.');
    const seen = new Set<number>();
    const targets = parsed.targets.flatMap((value) => {
      const target = normalize(value);
      if (target === null || seen.has(target.id)) return [];
      seen.add(target.id);
      return [target];
    });
    return {
      targets,
      nextID: targets.length === 0 ? 1 : Math.max(...targets.map((target) => target.id)) + 1,
    };
  } catch {
    try {
      storage.removeItem(benchmarkTargetStorageKey);
    } catch {
      // Storage can be unavailable even when the page itself remains usable.
    }
    return { targets: [], nextID: 1 };
  }
}

export function persistBenchmarkTargets(
  storage: StorageLike,
  targets: readonly unknown[],
): void {
  try {
    if (targets.length === 0) {
      storage.removeItem(benchmarkTargetStorageKey);
      return;
    }
    const payload: StoredTargets = { schemaVersion: 1, targets };
    storage.setItem(benchmarkTargetStorageKey, JSON.stringify(payload));
  } catch {
    // Persistence is optional; storage failures must not block benchmarking.
  }
}

function isStoredTargets(value: unknown): value is StoredTargets {
  return typeof value === 'object' && value !== null
    && 'schemaVersion' in value && value.schemaVersion === 1
    && 'targets' in value && Array.isArray(value.targets);
}
