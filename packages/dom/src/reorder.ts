import type { Result, StableID } from '@sectile/core';
import {
  applySequenceReorderEvent,
  applyTreeReorderEvent,
  tryCreateSequenceReorderState,
  tryCreateTreeReorderState,
  type SequenceReorderEvent,
  type SequenceReorderState,
  type TreeReorderEvent,
  type TreeReorderState,
} from '@sectile/core/reorder';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TreeNodeInput } from '@sectile/core/tree';
import { unwrap } from '@sectile/core/result';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './internal/interaction.js';

export type ReorderOrientation = 'horizontal' | 'vertical';

interface ReorderHostOptions<ID extends StableID> {
  readonly root: HTMLElement;
  readonly orientation?: ReorderOrientation;
  readonly disabled?: boolean;
  readonly onUpdate?: () => void;
}

export interface SequenceReorderOptions<ID extends StableID = StableID>
  extends ReorderHostOptions<ID> {
  readonly ids: readonly ID[];
  readonly onOrderChange?: (ids: readonly ID[]) => void;
}

export interface SequenceReorderConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<SequenceReorderState<ID>>;
  syncOrder(ids: readonly ID[]): Result<RevisionSnapshot<SequenceReorderState<ID>>>;
  setItemAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: SequenceReorderEvent<ID>): boolean;
  disconnect(): void;
}

export interface TreeReorderOptions<ID extends StableID = StableID>
  extends ReorderHostOptions<ID> {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly onOrderChange?: (nodes: readonly TreeNodeInput<ID>[]) => void;
}

export interface TreeReorderConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<TreeReorderState<ID>>;
  syncOrder(nodes: readonly TreeNodeInput<ID>[]): Result<RevisionSnapshot<TreeReorderState<ID>>>;
  setItemAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: TreeReorderEvent<ID>): boolean;
  disconnect(): void;
}

export function createReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID>,
): SequenceReorderConnection<ID>;
export function createReorder<ID extends StableID>(
  options: TreeReorderOptions<ID>,
): TreeReorderConnection<ID>;
export function createReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID> | TreeReorderOptions<ID>,
): SequenceReorderConnection<ID> | TreeReorderConnection<ID> {
  return 'nodes' in options ? createTreeReorder(options) : createSequenceReorder(options);
}

export function tryCreateReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID>,
): Result<SequenceReorderConnection<ID>>;
export function tryCreateReorder<ID extends StableID>(
  options: TreeReorderOptions<ID>,
): Result<TreeReorderConnection<ID>>;
export function tryCreateReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID> | TreeReorderOptions<ID>,
): Result<SequenceReorderConnection<ID> | TreeReorderConnection<ID>> {
  return 'nodes' in options ? tryCreateTreeReorder(options) : tryCreateSequenceReorder(options);
}

function createSequenceReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID>,
): SequenceReorderConnection<ID> {
  return unwrap(tryCreateSequenceReorder(options));
}

function tryCreateSequenceReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID>,
): Result<SequenceReorderConnection<ID>> {
  const runtime = createSemanticController<
    SequenceReorderState<ID>,
    SequenceReorderEvent<ID>,
    { readonly type: 'sequence-order-changed'; readonly ids: readonly ID[] },
    { readonly type: 'sequence-order-changed'; readonly ids: readonly ID[] }
  >({
    initial: tryCreateSequenceReorderState(options.ids),
    reducer: applySequenceReorderEvent,
    notify: (previous, proposed) => {
      if (!sameIDs(previous.ids, proposed.ids)) options.onOrderChange?.(proposed.ids);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMSequenceReorder(options, runtime.value) }
    : runtime;
}

function createTreeReorder<ID extends StableID>(
  options: TreeReorderOptions<ID>,
): TreeReorderConnection<ID> {
  return unwrap(tryCreateTreeReorder(options));
}

function tryCreateTreeReorder<ID extends StableID>(
  options: TreeReorderOptions<ID>,
): Result<TreeReorderConnection<ID>> {
  const runtime = createSemanticController<
    TreeReorderState<ID>,
    TreeReorderEvent<ID>,
    { readonly type: 'tree-order-changed'; readonly nodes: readonly TreeNodeInput<ID>[] },
    { readonly type: 'tree-order-changed'; readonly nodes: readonly TreeNodeInput<ID>[] }
  >({
    initial: tryCreateTreeReorderState(options.nodes),
    reducer: applyTreeReorderEvent,
    notify: (previous, proposed) => {
      if (!sameNodes(previous.nodes, proposed.nodes)) options.onOrderChange?.(proposed.nodes);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMTreeReorder(options, runtime.value) }
    : runtime;
}

abstract class DOMReorderHost<ID extends StableID, State, Event> {
  protected readonly root: HTMLElement;
  protected readonly orientation: ReorderOrientation;
  protected readonly elements = new Map<ID, HTMLElement>();
  protected readonly runtime: SemanticController<State, Event, unknown>;
  readonly #onUpdate: (() => void) | undefined;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #pointerdown: (event: PointerEvent) => void;
  readonly #pointermove: (event: PointerEvent) => void;
  readonly #pointerup: (event: PointerEvent) => void;
  readonly #pointercancel: () => void;
  #drag: { readonly id: ID; readonly pointerID: number } | null = null;
  #target: { readonly id: ID; readonly before: boolean } | null = null;

  protected constructor(
    options: ReorderHostOptions<ID>,
    runtime: SemanticController<State, Event, unknown>,
  ) {
    this.root = options.root;
    this.orientation = options.orientation ?? 'vertical';
    this.runtime = runtime;
    this.#onUpdate = options.onUpdate;
    this.#keydown = (event) => {
      const id = this.resolveTarget(event.target);
      if (id !== null && this.handleKeyboard(id, event)) event.preventDefault();
    };
    this.#pointerdown = (event) => {
      if (event.button !== 0) return;
      const id = this.resolveTarget(event.target);
      if (id === null) return;
      event.preventDefault();
      this.#drag = { id, pointerID: event.pointerId };
      this.#target = { id, before: true };
      this.root.setPointerCapture?.(event.pointerId);
    };
    this.#pointermove = (event) => {
      if (this.#drag?.pointerID !== event.pointerId) return;
      const id = this.resolveTarget(event.target) ?? this.nearest(event);
      const element = id === null ? undefined : this.elements.get(id);
      if (id === null || element === undefined) return;
      const rect = element.getBoundingClientRect();
      const coordinate = this.orientation === 'horizontal' ? event.clientX : event.clientY;
      const midpoint = this.orientation === 'horizontal'
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      this.#target = { id, before: coordinate < midpoint };
    };
    this.#pointerup = (event) => {
      if (this.#drag?.pointerID !== event.pointerId) return;
      const { id } = this.#drag;
      const target = this.#target;
      this.clearDrag();
      if (target !== null && target.id !== id) this.drop(id, target.id, target.before);
    };
    this.#pointercancel = () => { this.clearDrag(); };
    setInteractionAttributes(this.root, options);
    this.root.setAttribute('aria-roledescription', 'sortable');
    this.root.addEventListener('keydown', this.#keydown);
    this.root.addEventListener('pointerdown', this.#pointerdown);
    this.root.addEventListener('pointermove', this.#pointermove);
    this.root.addEventListener('pointerup', this.#pointerup);
    this.root.addEventListener('pointercancel', this.#pointercancel);
  }

  protected abstract handleKeyboard(id: ID, event: KeyboardEvent): boolean;
  protected abstract drop(id: ID, targetID: ID, before: boolean): void;
  protected abstract refresh(): void;

  protected updated(ok: boolean): boolean {
    if (ok) {
      this.refresh();
      this.#onUpdate?.();
    }
    return ok;
  }

  protected focus(id: ID): void { queueMicrotask(() => this.elements.get(id)?.focus()); }

  public setItemAttributes(element: HTMLElement, id: ID): void {
    this.elements.set(id, element);
    element.tabIndex = element.tabIndex < 0 ? 0 : element.tabIndex;
    element.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown Alt+Home Alt+End');
    this.refresh();
  }

  public disconnect(): void {
    this.root.removeEventListener('keydown', this.#keydown);
    this.root.removeEventListener('pointerdown', this.#pointerdown);
    this.root.removeEventListener('pointermove', this.#pointermove);
    this.root.removeEventListener('pointerup', this.#pointerup);
    this.root.removeEventListener('pointercancel', this.#pointercancel);
    this.elements.clear();
  }

  private resolveTarget(target: EventTarget | null): ID | null {
    for (const [id, element] of this.elements) {
      if (target === element) return id;
      try { if (target !== null && element.contains(target as Node)) return id; } catch { /* noop */ }
    }
    return null;
  }

  private nearest(event: PointerEvent): ID | null {
    const coordinate = this.orientation === 'horizontal' ? event.clientX : event.clientY;
    let nearest: { readonly id: ID; readonly distance: number } | null = null;
    for (const [id, element] of this.elements) {
      const rect = element.getBoundingClientRect();
      const midpoint = this.orientation === 'horizontal'
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      const distance = Math.abs(coordinate - midpoint);
      if (nearest === null || distance < nearest.distance) nearest = { id, distance };
    }
    return nearest?.id ?? null;
  }

  private clearDrag(): void {
    if (this.#drag !== null) this.root.releasePointerCapture?.(this.#drag.pointerID);
    this.#drag = null;
    this.#target = null;
  }
}

class DOMSequenceReorder<ID extends StableID>
  extends DOMReorderHost<ID, SequenceReorderState<ID>, SequenceReorderEvent<ID>>
  implements SequenceReorderConnection<ID> {
  public constructor(
    options: SequenceReorderOptions<ID>,
    runtime: SemanticController<SequenceReorderState<ID>, SequenceReorderEvent<ID>, unknown>,
  ) { super(options, runtime); }
  public getSnapshot(): RevisionSnapshot<SequenceReorderState<ID>> { return this.runtime.getSnapshot(); }
  public syncOrder(ids: readonly ID[]): Result<RevisionSnapshot<SequenceReorderState<ID>>> {
    const result = this.runtime.replace(tryCreateSequenceReorderState(ids));
    if (result.ok) this.refresh();
    return result;
  }
  public handleEvent(event: SequenceReorderEvent<ID>): boolean {
    return this.updated(this.runtime.handle(event).ok);
  }
  protected handleKeyboard(id: ID, event: KeyboardEvent): boolean {
    if (!event.altKey || event.ctrlKey || event.metaKey) return false;
    const ids = this.getSnapshot().state.ids;
    const index = ids.indexOf(id);
    let semantic: SequenceReorderEvent<ID> | null = null;
    if (event.key === 'Home') semantic = { type: 'move-to-start', id };
    else if (event.key === 'End') semantic = { type: 'move-to-end', id };
    else if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && index > 0) semantic = { type: 'move-before', id, targetID: ids[index - 1]! };
    else if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && index < ids.length - 1) semantic = { type: 'move-after', id, targetID: ids[index + 1]! };
    if (semantic === null) return false;
    const ok = this.handleEvent(semantic);
    if (ok) this.focus(id);
    return ok;
  }
  protected drop(id: ID, targetID: ID, before: boolean): void {
    this.handleEvent({ type: before ? 'move-before' : 'move-after', id, targetID });
    this.focus(id);
  }
  protected refresh(): void {
    const ids = this.getSnapshot().state.ids;
    for (const [id, element] of this.elements) {
      const index = ids.indexOf(id);
      if (index < 0) continue;
      element.dataset['reorderId'] = String(id);
      element.setAttribute('aria-posinset', String(index + 1));
      element.setAttribute('aria-setsize', String(ids.length));
    }
  }
}

class DOMTreeReorder<ID extends StableID>
  extends DOMReorderHost<ID, TreeReorderState<ID>, TreeReorderEvent<ID>>
  implements TreeReorderConnection<ID> {
  public constructor(
    options: TreeReorderOptions<ID>,
    runtime: SemanticController<TreeReorderState<ID>, TreeReorderEvent<ID>, unknown>,
  ) { super(options, runtime); }
  public getSnapshot(): RevisionSnapshot<TreeReorderState<ID>> { return this.runtime.getSnapshot(); }
  public syncOrder(nodes: readonly TreeNodeInput<ID>[]): Result<RevisionSnapshot<TreeReorderState<ID>>> {
    const result = this.runtime.replace(tryCreateTreeReorderState(nodes));
    if (result.ok) this.refresh();
    return result;
  }
  public handleEvent(event: TreeReorderEvent<ID>): boolean {
    return this.updated(this.runtime.handle(event).ok);
  }
  protected handleKeyboard(id: ID, event: KeyboardEvent): boolean {
    if (!event.altKey || event.ctrlKey || event.metaKey) return false;
    const nodes = this.getSnapshot().state.nodes;
    const node = nodes.find((candidate) => candidate.id === id);
    if (node === undefined) return false;
    const siblings = nodes.filter((candidate) => candidate.parentID === node.parentID);
    const index = siblings.findIndex((candidate) => candidate.id === id);
    let semantic: TreeReorderEvent<ID> | null = null;
    if (event.key === 'Home') semantic = { type: 'move-node', id, parentID: node.parentID, beforeID: siblings[0]?.id ?? null };
    else if (event.key === 'End') semantic = { type: 'move-node', id, parentID: node.parentID, beforeID: null };
    else if ((event.key === 'ArrowUp') && index > 0) semantic = { type: 'move-node', id, parentID: node.parentID, beforeID: siblings[index - 1]!.id };
    else if (event.key === 'ArrowDown' && index < siblings.length - 1) semantic = { type: 'move-node', id, parentID: node.parentID, beforeID: siblings[index + 2]?.id ?? null };
    else if (event.key === 'ArrowRight' && index > 0) semantic = { type: 'move-node', id, parentID: siblings[index - 1]!.id, beforeID: null };
    else if (event.key === 'ArrowLeft' && node.parentID !== null) {
      const parent = nodes.find((candidate) => candidate.id === node.parentID);
      if (parent !== undefined) {
        const parentSiblings = nodes.filter((candidate) => candidate.parentID === parent.parentID);
        const parentIndex = parentSiblings.findIndex((candidate) => candidate.id === parent.id);
        semantic = { type: 'move-node', id, parentID: parent.parentID, beforeID: parentSiblings[parentIndex + 1]?.id ?? null };
      }
    }
    if (semantic === null) return false;
    const ok = this.handleEvent(semantic);
    if (ok) this.focus(id);
    return ok;
  }
  protected drop(id: ID, targetID: ID, before: boolean): void {
    const nodes = this.getSnapshot().state.nodes;
    const target = nodes.find((node) => node.id === targetID);
    if (target === undefined) return;
    const siblings = nodes.filter((node) => node.parentID === target.parentID && node.id !== id);
    const index = siblings.findIndex((node) => node.id === targetID);
    this.handleEvent({
      type: 'move-node',
      id,
      parentID: target.parentID,
      beforeID: before ? targetID : siblings[index + 1]?.id ?? null,
    });
    this.focus(id);
  }
  protected refresh(): void {
    const nodes = this.getSnapshot().state.nodes;
    for (const [id, element] of this.elements) {
      const node = nodes.find((candidate) => candidate.id === id);
      if (node === undefined) continue;
      const siblings = nodes.filter((candidate) => candidate.parentID === node.parentID);
      element.dataset['reorderId'] = String(id);
      element.setAttribute('aria-level', String(depth(nodes, id) + 1));
      element.setAttribute('aria-posinset', String(siblings.findIndex((candidate) => candidate.id === id) + 1));
      element.setAttribute('aria-setsize', String(siblings.length));
    }
  }
}

function depth<ID extends StableID>(nodes: readonly TreeNodeInput<ID>[], id: ID): number {
  let current = nodes.find((node) => node.id === id)?.parentID ?? null;
  let value = 0;
  while (current !== null) {
    value += 1;
    current = nodes.find((node) => node.id === current)?.parentID ?? null;
  }
  return value;
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function sameNodes<ID extends StableID>(left: readonly TreeNodeInput<ID>[], right: readonly TreeNodeInput<ID>[]): boolean {
  return left.length === right.length && left.every((node, index) => node.id === right[index]?.id && node.parentID === right[index]?.parentID);
}
