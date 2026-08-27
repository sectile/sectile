import { createFacadeConnection, createSemanticController, type FacadeConnection, type SemanticController } from '@sectile/core/adapter-runtime';
import type { Result, StableID } from '@sectile/core';
import {
  applyCascadeListEvent,
  getCascadeListColumns,
  getCascadeListValuePath,
  tryCreateCascadeListState,
  type CascadeListCommand,
  type CascadeListEvent,
  type CascadeListPolicies,
  type CascadeListState,
} from '@sectile/core/cascade-list';
import { unwrap } from '@sectile/core/result';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import {
  createDOMCascadeChoiceBinding,
  type DOMCascadeChoiceBinding,
} from './internal/cascade-choice-binding.js';

export type { TreeNodeInput as CascadeListItemDefinition } from '@sectile/core/tree';
export type { CascadeListPolicies } from '@sectile/core/cascade-list';

export interface CascadeListOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly disabledItems?: readonly ID[];
  readonly policies?: CascadeListPolicies<ID>;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly label?: string;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onUpdate?: () => void;
}

export type CascadeListValueChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeListOptions<ID>['onValueChange']>;
export type CascadeListHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeListOptions<ID>['onHighlightedValueChange']>;
export type CascadeListUpdateHandler<ID extends StableID = StableID> = NonNullable<CascadeListOptions<ID>['onUpdate']>;

export type CascadeListEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-option'; readonly id: ID }
  | { readonly type: 'select-value'; readonly id: ID };

export interface CascadeListControlledValues<ID extends StableID = StableID> {
  readonly value?: ID | null;
  readonly highlightedValue?: ID | null;
}

export interface CascadeListConnection<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  getSnapshot(): RevisionSnapshot<CascadeListState<ID>>;
  getColumns(): readonly (readonly ID[])[];
  getValuePath(): readonly ID[];
  syncControlledValues(values: CascadeListControlledValues<ID>): Result<RevisionSnapshot<CascadeListState<ID>>>;
  setColumnAttributes(element: HTMLElement, parentID?: ID | null, label?: string): void;
  setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void;
  handleEvent(event: CascadeListEvent<ID>): boolean;
  disconnect(): void;
}

export function createCascadeList<ID extends StableID>(
  options: CascadeListOptions<ID>,
): FacadeConnection<CascadeListConnection<ID>> {
  return unwrap(tryCreateCascadeList(options));
}

export function tryCreateCascadeList<ID extends StableID>(
  options: CascadeListOptions<ID>,
): Result<FacadeConnection<CascadeListConnection<ID>>> {
  return createFacadeConnection(options, (input) => tryCreateCascadeListConnection(input));
}

function tryCreateCascadeListConnection<ID extends StableID>(
  options: CascadeListOptions<ID>,
): Result<CascadeListConnection<ID>> {
  const tree = tryCreateTree(options.nodes);
  if (!tree.ok) return tree;
  const disabled = new Set(options.disabledItems ?? []);
  for (const id of disabled) {
    if (!tree.value.has(id)) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'disabled-item-outside-domain',
          message: 'Every disabled cascade list item must exist in the tree.',
          details: { id },
        },
      };
    }
  }
  const suppliedEligibility = options.policies?.eligible;
  const policies: CascadeListPolicies<ID> = {
    ...options.policies,
    eligible: (id) => !disabled.has(id) && (suppliedEligibility?.(id) ?? true),
  };
  const controlled = {
    value: options.value !== undefined,
    highlighted: options.highlightedValue !== undefined,
  };
  const runtime = createSemanticController<CascadeListState<ID>, CascadeListEvent<ID>, CascadeListCommand<ID>, CascadeListEffect<ID>>({
    interaction: options,
    interactionIntent: (event) => event === 'select' || (typeof event === 'object' && event.type === 'select')
      ? 'mutate'
      : 'navigate',
    initial: tryCreateCascadeListState(tree.value, {
      value: options.value ?? options.defaultValue ?? null,
      highlighted: options.highlightedValue ?? options.defaultHighlightedValue ?? options.value ?? options.defaultValue ?? null,
    }),
    reducer: (state, event) => applyCascadeListEvent(tree.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateCascadeListState(tree.value, {
      value: controlled.value ? previous.value : proposed.value,
      highlighted: controlled.highlighted ? previous.highlighted : proposed.highlighted,
      path: proposed.path,
    }),
    notify: (previous, proposed) => {
      if (previous.value !== proposed.value) options.onValueChange?.(proposed.value);
      if (previous.highlighted !== proposed.highlighted) options.onHighlightedValueChange?.(proposed.highlighted);
    },
    toEffect: (command) => command.type === 'focus'
      ? { type: 'focus-option', id: command.id }
      : command,
  });
  if (!runtime.ok) return runtime;
  return {
    ok: true,
    value: new DOMCascadeListConnection(options, tree.value, runtime.value, disabled, controlled),
  };
}

class DOMCascadeListConnection<ID extends StableID> implements CascadeListConnection<ID> {
  public readonly tree: Tree<ID>;
  readonly #options: CascadeListOptions<ID>;
  readonly #runtime: SemanticController<CascadeListState<ID>, CascadeListEvent<ID>, CascadeListEffect<ID>>;
  readonly #controlled: { value: boolean; highlighted: boolean };
  readonly #choice: DOMCascadeChoiceBinding<ID>;

  public constructor(
    options: CascadeListOptions<ID>,
    tree: Tree<ID>,
    runtime: SemanticController<CascadeListState<ID>, CascadeListEvent<ID>, CascadeListEffect<ID>>,
    disabled: ReadonlySet<ID>,
    controlled: { value: boolean; highlighted: boolean },
  ) {
    this.#options = options;
    this.tree = tree;
    this.#runtime = runtime;
    this.#controlled = controlled;
    this.#choice = createDOMCascadeChoiceBinding<ID, CascadeListEvent<ID>>({
      root: options.root,
      surface: options.root,
      tree,
      disabledItems: disabled,
      disabled: options.disabled,
      readOnly: options.readOnly,
      label: options.label,
      scope: 'cascade-list',
      readState: () => this.getSnapshot().state,
      handleEvent: (event) => this.handleEvent(event),
      toEvent: toCascadeListEvent,
    });
  }

  public getSnapshot(): RevisionSnapshot<CascadeListState<ID>> {
    return this.#runtime.getSnapshot();
  }

  public getColumns(): readonly (readonly ID[])[] {
    return getCascadeListColumns(this.tree, this.getSnapshot().state);
  }

  public getValuePath(): readonly ID[] {
    return getCascadeListValuePath(this.tree, this.getSnapshot().state.value);
  }

  public syncControlledValues(values: CascadeListControlledValues<ID>): Result<RevisionSnapshot<CascadeListState<ID>>> {
    if (this.#controlled.value !== (values.value !== undefined)
      || this.#controlled.highlighted !== (values.highlightedValue !== undefined)) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'controlled-shape-mismatch',
          message: 'Controlled cascade list values must preserve their construction-time shape.',
        },
      };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateCascadeListState(this.tree, {
      value: this.#controlled.value ? values.value ?? null : state.value,
      highlighted: this.#controlled.highlighted ? values.highlightedValue ?? null : state.highlighted,
    }));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public setColumnAttributes(element: HTMLElement, parentID: ID | null = null, label?: string): void {
    this.#choice.setColumnAttributes(element, parentID, label);
  }

  public setItemAttributes(element: HTMLElement, id: ID, disabled = false): void {
    this.#choice.setItemAttributes(element, id, disabled);
  }

  public handleEvent(event: CascadeListEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (!result.ok) return false;
    for (const effect of result.commands) {
      if (effect.type === 'focus-option') this.#choice.focusItem(effect.id);
    }
    this.#options.onUpdate?.();
    return true;
  }

  public disconnect(): void {
    this.#choice.disconnect();
  }
}

export function toCascadeListEvent<ID extends StableID>(
  input: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>,
): CascadeListEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'ArrowDown') return 'next';
  if (input.key === 'ArrowUp') return 'previous';
  if (input.key === 'ArrowRight') return 'right';
  if (input.key === 'ArrowLeft') return 'left';
  if (input.key === 'Home') return 'first';
  if (input.key === 'End') return 'last';
  if (input.key === 'Enter' || input.key === ' ') return 'select';
  return null;
}
