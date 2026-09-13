import type { StableID } from '@sectile/core';

export type CompositeFocusEntryMode = 'root' | 'item';

export interface CompositeFocusEntryBindingOptions {
  readonly available?: boolean;
  readonly fallbackEligible?: boolean;
}

interface FocusBinding {
  readonly element: HTMLElement;
  readonly available: boolean;
  readonly fallbackEligible: boolean;
  readonly rank: number | null;
}

export class DOMCompositeFocusEntry<ID extends StableID> {
  readonly #mode: CompositeFocusEntryMode;
  readonly #root: HTMLElement;
  readonly #rootEnabled: boolean;
  readonly #rank: ((id: ID) => number | null) | undefined;
  readonly #bindings = new Map<ID, FocusBinding>();
  readonly #owners = new WeakMap<HTMLElement, ID>();
  #current: ID | null;
  #fallback: ID | null = null;

  public constructor(options: {
    readonly mode: CompositeFocusEntryMode;
    readonly root: HTMLElement;
    readonly current: ID | null;
    readonly rootEnabled?: boolean;
    readonly rank?: (id: ID) => number | null;
  }) {
    this.#mode = options.mode;
    this.#root = options.root;
    this.#current = options.current;
    this.#rootEnabled = options.rootEnabled ?? true;
    this.#rank = options.rank;
    this.#root.tabIndex = this.#mode === 'root' && this.#rootEnabled ? 0 : -1;
  }

  public bind(
    element: HTMLElement,
    id: ID,
    options: CompositeFocusEntryBindingOptions = {},
  ): void {
    const previousEntry = this.#entryElement();
    const previous = this.#bindings.get(id);
    if (previous !== undefined && previous.element !== element) {
      previous.element.tabIndex = -1;
      if (this.#owners.get(previous.element) === id) this.#owners.delete(previous.element);
    }
    const previousOwner = this.#owners.get(element);
    if (previousOwner !== undefined && previousOwner !== id) {
      this.#releaseBinding(previousOwner, element);
    }
    const available = options.available ?? true;
    const fallbackEligible = options.fallbackEligible ?? available;
    const rank = this.#mode === 'item' && fallbackEligible
      ? this.#rank?.(id) ?? null
      : null;
    this.#bindings.set(id, { element, available, fallbackEligible, rank });
    this.#owners.set(element, id);
    this.#updateFallback(id);
    const nextEntry = this.#entryElement();
    if (element !== previousEntry && element !== nextEntry) element.tabIndex = -1;
    this.#projectEntry(previousEntry, nextEntry);
  }

  public release(id: ID, element?: HTMLElement): void {
    const binding = this.#bindings.get(id);
    if (binding === undefined || (element !== undefined && binding.element !== element)) return;
    const previousEntry = this.#entryElement();
    this.#releaseBinding(id, binding.element);
    this.#projectEntry(previousEntry);
  }

  public setCurrent(current: ID | null): void {
    if (this.#current === current) return;
    const previousEntry = this.#entryElement();
    this.#current = current;
    this.#projectEntry(previousEntry);
  }

  public elementFor(id: ID): HTMLElement | undefined {
    return this.#bindings.get(id)?.element;
  }

  public disconnect(): void {
    if (this.#mode === 'root') this.#root.tabIndex = -1;
    for (const binding of this.#bindings.values()) binding.element.tabIndex = -1;
    this.#bindings.clear();
    this.#current = null;
    this.#fallback = null;
  }

  #releaseBinding(id: ID, element: HTMLElement): void {
    const binding = this.#bindings.get(id);
    if (binding === undefined || binding.element !== element) return;
    binding.element.tabIndex = -1;
    this.#bindings.delete(id);
    if (this.#owners.get(element) === id) this.#owners.delete(element);
    if (this.#fallback === id) this.#repairFallback();
  }

  #updateFallback(id: ID): void {
    if (this.#mode !== 'item') return;
    const binding = this.#bindings.get(id);
    if (binding === undefined) return;
    if (!binding.available || !binding.fallbackEligible || binding.rank === null) {
      if (this.#fallback === id) this.#repairFallback();
      return;
    }
    if (this.#fallback === id) return;
    const currentFallback = this.#fallback === null ? undefined : this.#bindings.get(this.#fallback);
    if (
      currentFallback === undefined
      || !currentFallback.available
      || !currentFallback.fallbackEligible
      || currentFallback.rank === null
      || binding.rank < currentFallback.rank
    ) {
      this.#fallback = id;
    }
  }

  #repairFallback(): void {
    this.#fallback = null;
    let bestRank = Number.POSITIVE_INFINITY;
    for (const [id, binding] of this.#bindings) {
      if (!binding.available || !binding.fallbackEligible || binding.rank === null) continue;
      if (binding.rank >= bestRank) continue;
      bestRank = binding.rank;
      this.#fallback = id;
    }
  }

  #entryElement(): HTMLElement | null {
    if (this.#current !== null) {
      const current = this.#bindings.get(this.#current);
      if (current?.available === true) return current.element;
    }
    if (this.#mode === 'root') return this.#rootEnabled ? this.#root : null;
    if (this.#fallback === null) return null;
    const fallback = this.#bindings.get(this.#fallback);
    return fallback?.available === true ? fallback.element : null;
  }

  #projectEntry(
    previousEntry: HTMLElement | null,
    nextEntry: HTMLElement | null = this.#entryElement(),
  ): void {
    if (previousEntry === nextEntry) return;
    if (previousEntry !== null) previousEntry.tabIndex = -1;
    if (nextEntry !== null) nextEntry.tabIndex = 0;
  }
}
