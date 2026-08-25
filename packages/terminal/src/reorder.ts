import type { Result, StableID } from '@sectile/core';
import {
  applySequenceReorderEvent,
  applyTreeReorderEvent,
  tryCreateSequenceReorderState,
  tryCreateTreeReorderState,
  type SequenceReorderEvent,
  type SequenceReorderCommand,
  type SequenceReorderState,
  type TreeReorderEvent,
  type TreeReorderCommand,
  type TreeReorderState,
} from '@sectile/core/reorder';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TreeNodeInput } from '@sectile/core/tree';
import { unwrap } from '@sectile/core/result';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface TerminalSequenceReorderOptions<ID extends StableID = StableID> {
  readonly ids: readonly ID[];
  readonly currentID?: ID | null;
  readonly disabled?: boolean;
  readonly onOrderChange?: (ids: readonly ID[]) => void;
  readonly onCurrentChange?: (id: ID | null) => void;
  readonly onUpdate?: () => void;
}

export interface TerminalSequenceReorderConnection<ID extends StableID = StableID> {
  readonly currentID: ID | null;
  getSnapshot(): RevisionSnapshot<SequenceReorderState<ID>>;
  focus(id: ID): boolean;
  handleEvent(event: SequenceReorderEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
  syncOrder(ids: readonly ID[]): Result<RevisionSnapshot<SequenceReorderState<ID>>>;
}

export interface TerminalTreeReorderOptions<ID extends StableID = StableID> {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly currentID?: ID | null;
  readonly disabled?: boolean;
  readonly onOrderChange?: (nodes: readonly TreeNodeInput<ID>[]) => void;
  readonly onCurrentChange?: (id: ID | null) => void;
  readonly onUpdate?: () => void;
}

export interface TerminalTreeReorderConnection<ID extends StableID = StableID> {
  readonly currentID: ID | null;
  getSnapshot(): RevisionSnapshot<TreeReorderState<ID>>;
  focus(id: ID): boolean;
  handleEvent(event: TreeReorderEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
  syncOrder(nodes: readonly TreeNodeInput<ID>[]): Result<RevisionSnapshot<TreeReorderState<ID>>>;
}

export function createReorder<ID extends StableID>(
  options: TerminalSequenceReorderOptions<ID>,
): TerminalSequenceReorderConnection<ID>;
export function createReorder<ID extends StableID>(
  options: TerminalTreeReorderOptions<ID>,
): TerminalTreeReorderConnection<ID>;
export function createReorder<ID extends StableID>(
  options: TerminalSequenceReorderOptions<ID> | TerminalTreeReorderOptions<ID>,
): TerminalSequenceReorderConnection<ID> | TerminalTreeReorderConnection<ID> {
  return 'nodes' in options ? createTreeReorder(options) : createSequenceReorder(options);
}

export function tryCreateReorder<ID extends StableID>(
  options: TerminalSequenceReorderOptions<ID>,
): Result<TerminalSequenceReorderConnection<ID>>;
export function tryCreateReorder<ID extends StableID>(
  options: TerminalTreeReorderOptions<ID>,
): Result<TerminalTreeReorderConnection<ID>>;
export function tryCreateReorder<ID extends StableID>(
  options: TerminalSequenceReorderOptions<ID> | TerminalTreeReorderOptions<ID>,
): Result<TerminalSequenceReorderConnection<ID> | TerminalTreeReorderConnection<ID>> {
  return 'nodes' in options ? tryCreateTreeReorder(options) : tryCreateSequenceReorder(options);
}

function createSequenceReorder<ID extends StableID>(
  options: TerminalSequenceReorderOptions<ID>,
): TerminalSequenceReorderConnection<ID> {
  return unwrap(tryCreateSequenceReorder(options));
}

function tryCreateSequenceReorder<ID extends StableID>(
  options: TerminalSequenceReorderOptions<ID>,
): Result<TerminalSequenceReorderConnection<ID>> {
  const runtime = createSemanticController<
    SequenceReorderState<ID>,
    SequenceReorderEvent<ID>,
    SequenceReorderCommand<ID>,
    SequenceReorderCommand<ID>
  >({
    initial: tryCreateSequenceReorderState(options.ids),
    reducer: applySequenceReorderEvent,
    notify: (previous: SequenceReorderState<ID>, proposed: SequenceReorderState<ID>) => {
      if (!sameIDs(previous.ids, proposed.ids)) options.onOrderChange?.(proposed.ids);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new TerminalSequenceReorder(options, runtime.value) }
    : runtime;
}

function createTreeReorder<ID extends StableID>(
  options: TerminalTreeReorderOptions<ID>,
): TerminalTreeReorderConnection<ID> {
  return unwrap(tryCreateTreeReorder(options));
}

function tryCreateTreeReorder<ID extends StableID>(
  options: TerminalTreeReorderOptions<ID>,
): Result<TerminalTreeReorderConnection<ID>> {
  const runtime = createSemanticController<
    TreeReorderState<ID>,
    TreeReorderEvent<ID>,
    TreeReorderCommand<ID>,
    TreeReorderCommand<ID>
  >({
    initial: tryCreateTreeReorderState(options.nodes),
    reducer: applyTreeReorderEvent,
    notify: (previous: TreeReorderState<ID>, proposed: TreeReorderState<ID>) => {
      if (!sameNodes(previous.nodes, proposed.nodes)) options.onOrderChange?.(proposed.nodes);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new TerminalTreeReorder(options, runtime.value) }
    : runtime;
}

class TerminalSequenceReorder<ID extends StableID>
  implements TerminalSequenceReorderConnection<ID> {
  readonly #options: TerminalSequenceReorderOptions<ID>;
  readonly #runtime: SemanticController<SequenceReorderState<ID>, SequenceReorderEvent<ID>, SequenceReorderCommand<ID>>;
  #currentID: ID | null;
  public constructor(
    options: TerminalSequenceReorderOptions<ID>,
    runtime: SemanticController<SequenceReorderState<ID>, SequenceReorderEvent<ID>, SequenceReorderCommand<ID>>,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#currentID = options.currentID ?? options.ids[0] ?? null;
  }
  public get currentID(): ID | null { return this.#currentID; }
  public getSnapshot(): RevisionSnapshot<SequenceReorderState<ID>> { return this.#runtime.getSnapshot(); }
  public focus(id: ID): boolean {
    if (!this.getSnapshot().state.ids.includes(id)) return false;
    this.#currentID = id;
    this.#options.onCurrentChange?.(id);
    this.#options.onUpdate?.();
    return true;
  }
  public handleEvent(event: SequenceReorderEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const id = this.#currentID;
    if (id === null) return false;
    const ids = this.getSnapshot().state.ids;
    const index = ids.indexOf(id);
    if (input.key === 'move-start') return this.handleEvent({ type: 'move-to-start', id });
    if (input.key === 'move-end') return this.handleEvent({ type: 'move-to-end', id });
    if (input.key === 'move-up' && index > 0) return this.handleEvent({ type: 'move-before', id, targetID: ids[index - 1]! });
    if (input.key === 'move-down' && index < ids.length - 1) return this.handleEvent({ type: 'move-after', id, targetID: ids[index + 1]! });
    return false;
  }
  public syncOrder(ids: readonly ID[]): Result<RevisionSnapshot<SequenceReorderState<ID>>> {
    const result = this.#runtime.replace(tryCreateSequenceReorderState(ids));
    if (result.ok && this.#currentID !== null && !ids.includes(this.#currentID)) {
      this.#currentID = ids[0] ?? null;
      this.#options.onCurrentChange?.(this.#currentID);
    }
    return result;
  }
}

class TerminalTreeReorder<ID extends StableID>
  implements TerminalTreeReorderConnection<ID> {
  readonly #options: TerminalTreeReorderOptions<ID>;
  readonly #runtime: SemanticController<TreeReorderState<ID>, TreeReorderEvent<ID>, TreeReorderCommand<ID>>;
  #currentID: ID | null;
  public constructor(
    options: TerminalTreeReorderOptions<ID>,
    runtime: SemanticController<TreeReorderState<ID>, TreeReorderEvent<ID>, TreeReorderCommand<ID>>,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#currentID = options.currentID ?? options.nodes[0]?.id ?? null;
  }
  public get currentID(): ID | null { return this.#currentID; }
  public getSnapshot(): RevisionSnapshot<TreeReorderState<ID>> { return this.#runtime.getSnapshot(); }
  public focus(id: ID): boolean {
    if (!this.getSnapshot().state.nodes.some((node) => node.id === id)) return false;
    this.#currentID = id;
    this.#options.onCurrentChange?.(id);
    this.#options.onUpdate?.();
    return true;
  }
  public handleEvent(event: TreeReorderEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const id = this.#currentID;
    if (id === null) return false;
    const nodes = this.getSnapshot().state.nodes;
    const node = nodes.find((candidate) => candidate.id === id);
    if (node === undefined) return false;
    const siblings = nodes.filter((candidate) => candidate.parentID === node.parentID);
    const index = siblings.findIndex((candidate) => candidate.id === id);
    if (input.key === 'move-start') return this.handleEvent({ type: 'move-node', id, parentID: node.parentID, beforeID: siblings[0]?.id ?? null });
    if (input.key === 'move-end') return this.handleEvent({ type: 'move-node', id, parentID: node.parentID, beforeID: null });
    if (input.key === 'move-up' && index > 0) return this.handleEvent({ type: 'move-node', id, parentID: node.parentID, beforeID: siblings[index - 1]!.id });
    if (input.key === 'move-down' && index < siblings.length - 1) return this.handleEvent({ type: 'move-node', id, parentID: node.parentID, beforeID: siblings[index + 2]?.id ?? null });
    if (input.key === 'indent' && index > 0) return this.handleEvent({ type: 'move-node', id, parentID: siblings[index - 1]!.id, beforeID: null });
    if (input.key === 'outdent' && node.parentID !== null) {
      const parent = nodes.find((candidate) => candidate.id === node.parentID);
      if (parent === undefined) return false;
      const parentSiblings = nodes.filter((candidate) => candidate.parentID === parent.parentID);
      const parentIndex = parentSiblings.findIndex((candidate) => candidate.id === parent.id);
      return this.handleEvent({ type: 'move-node', id, parentID: parent.parentID, beforeID: parentSiblings[parentIndex + 1]?.id ?? null });
    }
    return false;
  }
  public syncOrder(nodes: readonly TreeNodeInput<ID>[]): Result<RevisionSnapshot<TreeReorderState<ID>>> {
    const result = this.#runtime.replace(tryCreateTreeReorderState(nodes));
    if (result.ok && this.#currentID !== null && !nodes.some((node) => node.id === this.#currentID)) {
      this.#currentID = nodes[0]?.id ?? null;
      this.#options.onCurrentChange?.(this.#currentID);
    }
    return result;
  }
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
function sameNodes<ID extends StableID>(left: readonly TreeNodeInput<ID>[], right: readonly TreeNodeInput<ID>[]): boolean {
  return left.length === right.length && left.every((node, index) => node.id === right[index]?.id && node.parentID === right[index]?.parentID);
}
