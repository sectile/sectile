const OVERLAY_LIMIT = 32;

export const deleted: unique symbol = Symbol('form-index-deleted');

export class DeltaIndex<Key, Value> {
  readonly #base: ReadonlyMap<Key, Value>;
  readonly #parent: DeltaIndex<Key, Value> | null;
  readonly #changes: ReadonlyMap<Key, Value | typeof deleted>;
  readonly #depth: number;

  private constructor(
    base: ReadonlyMap<Key, Value>,
    parent: DeltaIndex<Key, Value> | null,
    changes: ReadonlyMap<Key, Value | typeof deleted>,
    depth: number,
  ) {
    this.#base = base;
    this.#parent = parent;
    this.#changes = changes;
    this.#depth = depth;
  }

  public static from<Key, Value>(entries: ReadonlyMap<Key, Value>): DeltaIndex<Key, Value> {
    return new DeltaIndex(new Map(entries), null, new Map(), 0);
  }

  public get(key: Key): Value | undefined {
    for (let index: DeltaIndex<Key, Value> | null = this; index !== null; index = index.#parent) {
      if (!index.#changes.has(key)) continue;
      const value = index.#changes.get(key);
      return value === deleted ? undefined : value;
    }
    return this.#base.get(key);
  }

  public has(key: Key): boolean { return this.get(key) !== undefined; }

  public update(
    changes: ReadonlyMap<Key, Value | typeof deleted>,
  ): DeltaIndex<Key, Value> {
    if (changes.size === 0) return this;
    if (this.#depth + 1 < OVERLAY_LIMIT) {
      return new DeltaIndex(this.#base, this, new Map(changes), this.#depth + 1);
    }
    const compacted = this.materialize();
    applyIndexChanges(compacted, changes);
    return DeltaIndex.from(compacted);
  }

  public materialize(): Map<Key, Value> {
    const output = new Map(this.#base);
    const layers: DeltaIndex<Key, Value>[] = [];
    for (let index: DeltaIndex<Key, Value> | null = this; index !== null; index = index.#parent) {
      if (index.#changes.size > 0) layers.push(index);
    }
    for (let layer = layers.length - 1; layer >= 0; layer -= 1) {
      applyIndexChanges(output, layers[layer]!.#changes);
    }
    return output;
  }
}

function applyIndexChanges<Key, Value>(
  target: Map<Key, Value>,
  changes: ReadonlyMap<Key, Value | typeof deleted>,
): void {
  for (const [key, value] of changes) {
    if (value === deleted) target.delete(key);
    else target.set(key, value);
  }
}

export class DeltaSet<Value> {
  readonly #index: DeltaIndex<Value, true>;
  readonly #size: number;
  readonly #overlayEntries: number;

  private constructor(index: DeltaIndex<Value, true>, size: number, overlayEntries: number) {
    this.#index = index;
    this.#size = size;
    this.#overlayEntries = overlayEntries;
  }

  public static from<Value>(values: Iterable<Value>): DeltaSet<Value> {
    const entries = new Map(Array.from(values, (value) => [value, true] as const));
    return new DeltaSet(DeltaIndex.from(entries), entries.size, 0);
  }

  public update(add: Iterable<Value>, remove: Iterable<Value>): DeltaSet<Value> {
    const requested = new Map<Value, true | typeof deleted>();
    for (const value of remove) requested.set(value, deleted);
    for (const value of add) requested.set(value, true);
    if (requested.size === 0) return this;
    const changes = new Map<Value, true | typeof deleted>();
    let size = this.#size;
    for (const [value, next] of requested) {
      const contained = this.#index.has(value);
      if (contained && next === deleted) {
        size -= 1;
        changes.set(value, next);
      } else if (!contained && next === true) {
        size += 1;
        changes.set(value, next);
      }
    }
    if (changes.size === 0) return this;
    if (size === 0) return DeltaSet.from([]);
    const overlayEntries = this.#overlayEntries + changes.size;
    if (overlayEntries > size) {
      const compacted = this.#index.materialize();
      applyIndexChanges(compacted, changes);
      return DeltaSet.from(compacted.keys());
    }
    return new DeltaSet(this.#index.update(changes), size, overlayEntries);
  }

  public values(): IterableIterator<Value> { return this.#index.materialize().keys(); }
}
