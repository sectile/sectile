import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyCascadeSelectEvent, tryCreateCascadeSelectState, getCascadeSelectColumns,
  getCascadeSelectValuePath, type CascadeSelectCommand, type CascadeSelectEvent,
  type CascadeSelectPolicies, type CascadeSelectState,
} from '@sectile/core/cascade-select';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';

export interface CascadeSelectOptions<ID extends StableID = StableID> {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly disabledItems?: readonly ID[];
  readonly policies?: CascadeSelectPolicies<ID>;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}

export type CascadeSelectValueChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeSelectOptions<ID>['onValueChange']>;
export type CascadeSelectHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeSelectOptions<ID>['onHighlightedValueChange']>;
export type CascadeSelectOpenChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeSelectOptions<ID>['onOpenChange']>;
export type CascadeSelectUpdateHandler<ID extends StableID = StableID> = NonNullable<CascadeSelectOptions<ID>['onUpdate']>;

export interface CascadeSelectConnection<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  getSnapshot(): RevisionSnapshot<CascadeSelectState<ID>>;
  getColumns(): readonly (readonly ID[])[];
  getValuePath(): readonly ID[];
  syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null; readonly open?: boolean }): Result<RevisionSnapshot<CascadeSelectState<ID>>>;
  handleEvent(event: CascadeSelectEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createCascadeSelect<ID extends StableID>(options: CascadeSelectOptions<ID>): FacadeConnection<CascadeSelectConnection<ID>> {
  return unwrap(tryCreateCascadeSelect(options));
}
export function tryCreateCascadeSelect<ID extends StableID>(options: CascadeSelectOptions<ID>): Result<FacadeConnection<CascadeSelectConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateCascadeSelectConnection(options));
}

function tryCreateCascadeSelectConnection<ID extends StableID>(options: CascadeSelectOptions<ID>): Result<CascadeSelectConnection<ID>> {
  const tree = tryCreateTree(options.nodes); if (!tree.ok) return tree;
  const disabled = new Set(options.disabledItems ?? []); for (const id of disabled) if (!tree.value.has(id)) return { ok: false, error: { class: 'construction', code: 'disabled-item-outside-domain', message: 'Every disabled cascade select item must exist in the tree.' } };
  const suppliedEligibility = options.policies?.eligible; const policies: CascadeSelectPolicies<ID> = { ...options.policies, eligible: (id) => !disabled.has(id) && (suppliedEligibility?.(id) ?? true) };
  const controlled = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const runtime = createSemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectCommand<ID>, CascadeSelectCommand<ID>>({
    interaction: options, interactionIntent: (event) => event === 'select' || (typeof event === 'object' && event.type === 'select') ? 'mutate' : 'navigate',
    initial: tryCreateCascadeSelectState(tree.value, { value: options.value ?? options.defaultValue ?? null, highlighted: options.highlightedValue ?? options.defaultHighlightedValue ?? options.value ?? options.defaultValue ?? null, open: options.open ?? options.defaultOpen ?? false }),
    reducer: (state, event) => applyCascadeSelectEvent(tree.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateCascadeSelectState(tree.value, { value: controlled.value ? previous.value : proposed.value, highlighted: controlled.highlighted ? previous.highlighted : proposed.highlighted, open: controlled.open ? previous.open : proposed.open, path: proposed.path }),
    notify: (previous, proposed) => { if (previous.value !== proposed.value) options.onValueChange?.(proposed.value); if (previous.highlighted !== proposed.highlighted) options.onHighlightedValueChange?.(proposed.highlighted); if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open); },
    toEffect: (command) => command,
  });
  return runtime.ok ? { ok: true, value: new TerminalCascadeSelectConnection(options, tree.value, runtime.value, controlled) } : runtime;
}

class TerminalCascadeSelectConnection<ID extends StableID> implements CascadeSelectConnection<ID> {
  public readonly tree: Tree<ID>;
  readonly #options: CascadeSelectOptions<ID>; readonly #runtime: SemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectCommand<ID>>; readonly #controlled: { value: boolean; highlighted: boolean; open: boolean };
  public constructor(options: CascadeSelectOptions<ID>, tree: Tree<ID>, runtime: SemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectCommand<ID>>, controlled: { value: boolean; highlighted: boolean; open: boolean }) { this.#options = options; this.tree = tree; this.#runtime = runtime; this.#controlled = controlled; }
  public getSnapshot(): RevisionSnapshot<CascadeSelectState<ID>> { return this.#runtime.getSnapshot(); }
  public getColumns(): readonly (readonly ID[])[] { return getCascadeSelectColumns(this.tree, this.getSnapshot().state); }
  public getValuePath(): readonly ID[] { return getCascadeSelectValuePath(this.tree, this.getSnapshot().state.value); }
  public syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null; readonly open?: boolean }): Result<RevisionSnapshot<CascadeSelectState<ID>>> { if (this.#controlled.value !== (values.value !== undefined) || this.#controlled.highlighted !== (values.highlightedValue !== undefined) || this.#controlled.open !== (values.open !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled cascade select values must preserve their construction-time shape.' } }; const state = this.getSnapshot().state; const result = this.#runtime.replace(tryCreateCascadeSelectState(this.tree, { value: this.#controlled.value ? values.value ?? null : state.value, highlighted: this.#controlled.highlighted ? values.highlightedValue ?? null : state.highlighted, open: this.#controlled.open ? values.open ?? false : state.open })); if (result.ok) this.#options.onUpdate?.(); return result; }
  public handleEvent(event: CascadeSelectEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { const event = toCascadeSelectEvent<ID>(input); return event === null ? false : this.handleEvent(event); }
}

function toCascadeSelectEvent<ID extends StableID>(input: TerminalKeyboardInput): CascadeSelectEvent<ID> | null {
  if (input.key === 'down') return 'next'; if (input.key === 'up') return 'previous'; if (input.key === 'right') return 'right'; if (input.key === 'left') return 'left'; if (input.key === 'home') return 'first'; if (input.key === 'end') return 'last'; if (input.key === 'enter' || input.key === 'space') return 'select'; if (input.key === 'escape') return 'close'; return null;
}
