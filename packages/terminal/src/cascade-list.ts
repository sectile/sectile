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
import type { Tree, TreeNodeInput } from '@sectile/core/tree';
import type { TerminalKeyboardInput } from './keyboard.js';
import {
  toTerminalCascadeChoiceEvent,
  tryCreateTerminalCascadeChoiceDomain,
  withDisabledCascadeChoicePolicies,
} from './internal/cascade-choice.js';

export interface CascadeListOptions<ID extends StableID = StableID> {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly disabledItems?: readonly ID[];
  readonly policies?: CascadeListPolicies<ID>;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onUpdate?: () => void;
}

export type CascadeListValueChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeListOptions<ID>['onValueChange']>;
export type CascadeListHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeListOptions<ID>['onHighlightedValueChange']>;
export type CascadeListUpdateHandler<ID extends StableID = StableID> = NonNullable<CascadeListOptions<ID>['onUpdate']>;

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
  handleEvent(event: CascadeListEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
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
  const domain = tryCreateTerminalCascadeChoiceDomain(options.nodes, options.disabledItems, 'cascade list');
  if (!domain.ok) return domain;
  const policies = withDisabledCascadeChoicePolicies(options.policies, domain.value.disabledItems);
  const controlled = {
    value: options.value !== undefined,
    highlighted: options.highlightedValue !== undefined,
  };
  const runtime = createSemanticController<CascadeListState<ID>, CascadeListEvent<ID>, CascadeListCommand<ID>, CascadeListCommand<ID>>({
    interaction: options,
    interactionIntent: (event) => event === 'select' || (typeof event === 'object' && event.type === 'select')
      ? 'mutate'
      : 'navigate',
    initial: tryCreateCascadeListState(domain.value.tree, {
      value: options.value ?? options.defaultValue ?? null,
      highlighted: options.highlightedValue ?? options.defaultHighlightedValue ?? options.value ?? options.defaultValue ?? null,
    }),
    reducer: (state, event) => applyCascadeListEvent(domain.value.tree, state, event, policies),
    reconcile: (previous, proposed) => tryCreateCascadeListState(domain.value.tree, {
      value: controlled.value ? previous.value : proposed.value,
      highlighted: controlled.highlighted ? previous.highlighted : proposed.highlighted,
      path: proposed.path,
    }),
    notify: (previous, proposed) => {
      if (previous.value !== proposed.value) options.onValueChange?.(proposed.value);
      if (previous.highlighted !== proposed.highlighted) options.onHighlightedValueChange?.(proposed.highlighted);
    },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  return {
    ok: true,
    value: new TerminalCascadeListConnection(options, domain.value.tree, runtime.value, controlled),
  };
}

class TerminalCascadeListConnection<ID extends StableID> implements CascadeListConnection<ID> {
  public readonly tree: Tree<ID>;
  readonly #options: CascadeListOptions<ID>;
  readonly #runtime: SemanticController<CascadeListState<ID>, CascadeListEvent<ID>, CascadeListCommand<ID>>;
  readonly #controlled: { value: boolean; highlighted: boolean };

  public constructor(
    options: CascadeListOptions<ID>,
    tree: Tree<ID>,
    runtime: SemanticController<CascadeListState<ID>, CascadeListEvent<ID>, CascadeListCommand<ID>>,
    controlled: { value: boolean; highlighted: boolean },
  ) {
    this.#options = options;
    this.tree = tree;
    this.#runtime = runtime;
    this.#controlled = controlled;
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

  public handleEvent(event: CascadeListEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const event = toTerminalCascadeChoiceEvent<ID>(input);
    return event === null ? false : this.handleEvent(event);
  }
}
