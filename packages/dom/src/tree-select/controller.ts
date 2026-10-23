import type { Result, StableID } from '@sectile/core';
import { createSemanticController, controlledFieldError, type SemanticController } from '@sectile/core/adapter-runtime';
import { sameStableIDOrder } from '@sectile/core/identity';
import type { InteractionState, InteractionStateInput } from '@sectile/core/interaction';
import { rejectRevisionInput, type RevisionResult, type RevisionSnapshot } from '@sectile/core/revision';
import type { Tree } from '@sectile/core/tree';
import { applyTreeSelectEvent, reconcileTreeSelectState, synchronizeTreeSelectState, tryCreateTreeSelectResults, tryCreateTreeSelectState,
  type TreeSelectState, type TreeSelectEvent, type TreeSelectCommand, type TreeSelectPolicies, type TreeSelectControlledParts,
  type TreeSelectSearchRequest, type TreeSelectSyncInput } from '@sectile/core/tree-select';
import { createDisabledItems } from '../choice/disabled-items.js';
import type { KeyboardInput } from '../tree-view.js';

export type { TreeSelectPolicies, TreeSelectSearchRequest } from '@sectile/core/tree-select';
export interface TreeSelectKeyboardInput extends KeyboardInput { readonly isComposing?: boolean }
export type TreeSelectPresentationEffect<ID extends StableID = StableID> = { readonly type: 'focus-element'; readonly id: ID } | { readonly type: 'close-popup' };
export type TreeSelectEffect<ID extends StableID = StableID> = TreeSelectPresentationEffect<ID> | { readonly type: 'search'; readonly request: TreeSelectSearchRequest };
export interface TreeSelectControllerOptions<ID extends StableID = StableID> extends InteractionStateInput {
  readonly tree: Tree<ID>; readonly selectionMode?: 'single' | 'multiple';
  readonly value?: readonly NoInfer<ID>[]; readonly defaultValue?: readonly NoInfer<ID>[];
  readonly expandedValues?: readonly NoInfer<ID>[]; readonly defaultExpandedValues?: readonly NoInfer<ID>[];
  readonly highlightedValue?: NoInfer<ID> | null; readonly defaultHighlightedValue?: NoInfer<ID> | null;
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly query?: string; readonly defaultQuery?: string;
  readonly matches?: readonly NoInfer<ID>[]; readonly disabledItems?: readonly NoInfer<ID>[]; readonly policies?: TreeSelectPolicies<NoInfer<ID>>;
  readonly onValueChange?: (value: readonly NoInfer<ID>[]) => void;
  readonly onExpandedValuesChange?: (value: readonly NoInfer<ID>[]) => void;
  readonly onHighlightedValueChange?: (value: NoInfer<ID> | null) => void;
  readonly onOpenChange?: (open: boolean) => void; readonly onQueryChange?: (query: string) => void;
  readonly onSearch?: (request: TreeSelectSearchRequest) => void;
  readonly onEffect?: (effect: TreeSelectPresentationEffect<NoInfer<ID>>) => void;
  readonly onUpdate?: () => void;
}
export interface TreeSelectControlledValues<ID extends StableID = StableID> {
  readonly value?: readonly ID[]; readonly expandedValues?: readonly ID[]; readonly highlightedValue?: ID | null;
  readonly open?: boolean; readonly query?: string; readonly results?: TreeSelectSyncInput<ID>['results'];
}
export interface TreeSelectController<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  getSnapshot(): RevisionSnapshot<TreeSelectState<ID>>;
  getActive(): boolean;
  getInteraction(): InteractionState;
  isDisabled(id: ID): boolean | null;
  syncInteraction(input: InteractionStateInput): Result<InteractionState>;
  syncControlledValues(values: TreeSelectControlledValues<NoInfer<ID>>): Result<RevisionSnapshot<TreeSelectState<ID>>>;
  handleEvent(event: TreeSelectEvent<NoInfer<ID>>, expectedRevision?: number): RevisionResult<TreeSelectState<ID>, TreeSelectEffect<ID>>;
  handleKeyboardInput(input: TreeSelectKeyboardInput, expectedRevision?: number): RevisionResult<TreeSelectState<ID>, TreeSelectEffect<ID>>;
  resolveSearch(request: TreeSelectSearchRequest, matches: readonly NoInfer<ID>[], expectedRevision?: number): RevisionResult<TreeSelectState<ID>, TreeSelectEffect<ID>>;
  /** Deliver an initial pending request after the host has attached; reconnects do not repeat it. */
  activateSearch(): boolean;
  dispose(): void;
}
interface Hooks<ID extends StableID> {
  value: TreeSelectControllerOptions<ID>['onValueChange']; expansion: TreeSelectControllerOptions<ID>['onExpandedValuesChange'];
  cursor: TreeSelectControllerOptions<ID>['onHighlightedValueChange']; open: TreeSelectControllerOptions<ID>['onOpenChange'];
  query: TreeSelectControllerOptions<ID>['onQueryChange']; search: TreeSelectControllerOptions<ID>['onSearch'];
  effect: TreeSelectControllerOptions<ID>['onEffect']; update: TreeSelectControllerOptions<ID>['onUpdate'];
}
interface Scope<ID extends StableID> {
  retired: boolean; admitting: boolean; interaction: InteractionState; hooks: Hooks<ID> | undefined; policies: TreeSelectPolicies<ID> | undefined;
  disabled: ReadonlySet<ID> | undefined; complete: ((effects: readonly TreeSelectEffect<ID>[]) => void) | undefined;
}
interface EffectFrame<ID extends StableID> { readonly revision: number; readonly effects: TreeSelectEffect<ID>[] }
type Runtime<ID extends StableID> = SemanticController<TreeSelectState<ID>, TreeSelectEvent<ID>, TreeSelectEffect<ID>>;

export function toTreeSelectEvent<ID extends StableID = StableID>(input: TreeSelectKeyboardInput): TreeSelectEvent<ID> | null {
  if (input.isComposing === true || input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  switch (input.key) {
    case 'ArrowDown': return 'next'; case 'ArrowUp': return 'previous'; case 'ArrowRight': return 'right'; case 'ArrowLeft': return 'left';
    case 'Home': return 'first'; case 'End': return 'last'; case 'Enter': case ' ': return 'select'; case 'Escape': return 'close';
    default: return null;
  }
}
export function createTreeSelectController<ID extends StableID>(options: TreeSelectControllerOptions<ID>): Result<TreeSelectController<ID>> {
  const { eligible, selectable, closeOnSelect } = options.policies ?? {};
  if (eligible !== undefined && typeof eligible !== 'function' || selectable !== undefined && typeof selectable !== 'function'
    || closeOnSelect !== undefined && typeof closeOnSelect !== 'boolean') return { ok: false, error: { class: 'construction', code: 'invalid-boundary', message: 'TreeSelect requires predicate policies and boolean closeOnSelect.' } };
  const { tree } = options, disabled = createDisabledItems(tree.preorder(), options.disabledItems);
  if (!disabled.ok) return disabled;
  const results = options.matches === undefined ? undefined : tryCreateTreeSelectResults(tree, options.matches);
  if (results && !results.ok) return results;
  const initial = tryCreateTreeSelectState(tree, { selectionMode: options.selectionMode ?? 'single', selected: options.value ?? options.defaultValue ?? [],
    expanded: options.expandedValues ?? options.defaultExpandedValues ?? [], current: options.highlightedValue !== undefined ? options.highlightedValue : options.defaultHighlightedValue ?? null,
    open: options.open ?? options.defaultOpen ?? false, query: options.query ?? options.defaultQuery ?? '', ...(results?.ok ? { results: results.value } : {}) });
  const flags = { selection: options.value !== undefined, expansion: options.expandedValues !== undefined, cursor: options.highlightedValue !== undefined,
    open: options.open !== undefined, query: options.query !== undefined };
  const scope: Scope<ID> = { retired: false, admitting: false, interaction: Object.freeze({ disabled: options.disabled ?? false, readOnly: options.readOnly ?? false }),
    hooks: { value: options.onValueChange, expansion: options.onExpandedValuesChange, cursor: options.onHighlightedValueChange,
      open: options.onOpenChange, query: options.onQueryChange, search: options.onSearch, effect: options.onEffect, update: options.onUpdate },
    policies: { ...(eligible === undefined ? {} : { eligible }), ...(selectable === undefined ? {} : { selectable }),
      ...(closeOnSelect === undefined ? {} : { closeOnSelect }) }, disabled: disabled.value, complete: undefined };
  const runtime = createRuntime(tree, initial, flags, scope);
  return runtime.ok ? { ok: true, value: new DOMTreeSelectController(tree, runtime.value, flags, scope) } : runtime;
}
/** Separate closure environment: runtime callbacks borrow the retireable scope, never construction options. */
function createRuntime<ID extends StableID>(tree: Tree<ID>, initial: Result<TreeSelectState<ID>>, flags: TreeSelectControlledParts, scope: Scope<ID>): Result<Runtime<ID>> {
  const eligible = (id: ID): boolean => !scope.disabled?.has(id) && (scope.policies?.eligible?.(id) ?? true);
  return createSemanticController<TreeSelectState<ID>, TreeSelectEvent<ID>, TreeSelectCommand<ID>, TreeSelectEffect<ID>>({
    initial, interaction: scope.interaction,
    interactionIntent: event => { const type = typeof event === 'object' ? event.type : event; return type === 'results' || type === 'close' ? 'configure' : type === 'select' || type === 'clear' || type === 'query' ? 'mutate' : 'navigate'; },
    reducer: (state, event) => {
      const result = applyTreeSelectEvent(tree, state, event, { ...scope.policies, eligible });
      return scope.retired ? { ok: false, error: { class: 'transition-rejection', code: 'interaction-disabled', message: 'TreeSelect controller was disposed during input admission.' } } : result;
    },
    reconcile: (previous, proposed) => reconcileTreeSelectState(tree, previous, proposed, flags),
    toEffect: command => command.type === 'focus' ? { type: 'focus-element', id: command.id } : command,
    notify: [
      () => { scope.admitting = false; },
      (before, after) => { if (!sameStableIDOrder(before.selection.selected, after.selection.selected)) scope.hooks?.value?.(after.selection.selected); },
      (before, after) => { if (!sameStableIDOrder(before.expansion.ids, after.expansion.ids)) scope.hooks?.expansion?.(after.expansion.ids); },
      (before, after) => { if (before.view.cursor.current !== after.view.cursor.current) scope.hooks?.cursor?.(after.view.cursor.current); },
      (before, after) => { if (before.open !== after.open) scope.hooks?.open?.(after.open); },
      (before, after) => { if (before.request.query !== after.request.query) scope.hooks?.query?.(after.request.query); },
    ], complete: effects => scope.complete?.(effects),
  });
}

class DOMTreeSelectController<ID extends StableID> implements TreeSelectController<ID> {
  public readonly tree: Tree<ID>;
  readonly #runtime: Runtime<ID>; readonly #flags: TreeSelectControlledParts; readonly #scope: Scope<ID>;
  #frame: EffectFrame<ID> | undefined;
  #deliveredSearch: TreeSelectSearchRequest | undefined;
  public constructor(tree: Tree<ID>, runtime: Runtime<ID>, flags: TreeSelectControlledParts, scope: Scope<ID>) {
    this.tree = tree; this.#runtime = runtime; this.#flags = flags; this.#scope = scope;
    scope.complete = effects => { if (this.#frame) this.#finish(effects, this.#frame); };
  }
  public getSnapshot(): RevisionSnapshot<TreeSelectState<ID>> { return this.#runtime.getSnapshot(); }
  public getActive(): boolean { return !this.#scope.retired; }
  public getInteraction(): InteractionState { return this.#scope.interaction; }
  public isDisabled(id: ID): boolean | null {
    if (!this.tree.has(id)) return null;
    return this.#scope.retired || this.#scope.interaction.disabled || !!this.#scope.disabled?.has(id) || this.#scope.policies?.eligible?.(id) === false;
  }
  public syncInteraction(input: InteractionStateInput): Result<InteractionState> {
    if (this.#scope.retired) return this.#retired();
    if (this.#scope.admitting) return this.#busy();
    const before = this.#scope.interaction, result = this.#runtime.syncInteraction(input);
    if (result.ok) { this.#scope.interaction = result.value; if (before.disabled !== result.value.disabled || before.readOnly !== result.value.readOnly) this.#scope.hooks?.update?.(); }
    return result;
  }
  public handleKeyboardInput(input: TreeSelectKeyboardInput, expectedRevision?: number): RevisionResult<TreeSelectState<ID>, TreeSelectEffect<ID>> {
    if (this.#scope.retired) return rejectRevisionInput(this.getSnapshot(), this.#retired().error);
    if (this.#scope.admitting) return rejectRevisionInput(this.getSnapshot(), this.#busy().error);
    const event = toTreeSelectEvent<ID>(input);
    return event === null ? this.#runtime.reject('unsupported-dom-key', 'DOM keyboard input does not map to a TreeSelect event.') : this.handleEvent(event, expectedRevision);
  }
  public handleEvent(event: TreeSelectEvent<ID>, expectedRevision = this.getSnapshot().revision): RevisionResult<TreeSelectState<ID>, TreeSelectEffect<ID>> {
    if (this.#scope.retired) return rejectRevisionInput(this.getSnapshot(), this.#retired().error);
    if (this.#scope.admitting) return rejectRevisionInput(this.getSnapshot(), this.#busy().error);
    const previous = this.#frame, frame: EffectFrame<ID> = { revision: this.getSnapshot().revision + 1, effects: [] }; this.#frame = frame;
    this.#scope.admitting = true;
    try {
      const result = this.#runtime.handle(event, expectedRevision);
      return result.ok ? Object.freeze({ ...result, commands: Object.freeze(frame.effects) }) : result;
    } finally { this.#scope.admitting = false; this.#frame = previous; }
  }
  public resolveSearch(request: TreeSelectSearchRequest, matches: readonly ID[], expectedRevision?: number): RevisionResult<TreeSelectState<ID>, TreeSelectEffect<ID>> {
    return this.handleEvent({ type: 'results', request, results: matches }, expectedRevision);
  }
  public activateSearch(): boolean {
    if (this.#scope.retired || this.#scope.admitting || this.#scope.interaction.disabled) return false;
    const state = this.getSnapshot().state;
    if (!state.pending || this.#deliveredSearch === state.request) return false;
    this.#deliveredSearch = state.request;
    this.#scope.hooks?.search?.(state.request);
    return true;
  }
  public syncControlledValues(values: TreeSelectControlledValues<ID>): Result<RevisionSnapshot<TreeSelectState<ID>>> {
    if (this.#scope.retired) return this.#retired();
    if (this.#scope.admitting) return this.#busy();
    this.#scope.admitting = true;
    let admitted: Result<{ readonly snapshot: RevisionSnapshot<TreeSelectState<ID>>; readonly effects: readonly TreeSelectCommand<ID>[] }>;
    try { admitted = this.#admitControlled(values); } finally { this.#scope.admitting = false; }
    if (!admitted.ok) return admitted;
    this.#finish(admitted.value.effects.map(command => command.type === 'focus' ? { type: 'focus-element', id: command.id } : command), { revision: admitted.value.snapshot.revision, effects: [] });
    return { ok: true, value: admitted.value.snapshot };
  }
  #admitControlled(values: TreeSelectControlledValues<ID>): Result<{ readonly snapshot: RevisionSnapshot<TreeSelectState<ID>>; readonly effects: readonly TreeSelectCommand<ID>[] }> {
    const { value, expandedValues, highlightedValue, open, query, results } = values, flags = this.#flags;
    const error = controlledFieldError(flags.selection === true, value !== undefined, 'value', 'TreeSelect values')
      ?? controlledFieldError(flags.expansion === true, expandedValues !== undefined, 'expanded-values', 'TreeSelect expansion')
      ?? controlledFieldError(flags.cursor === true, highlightedValue !== undefined, 'highlighted-value', 'TreeSelect cursor')
      ?? controlledFieldError(flags.open === true, open !== undefined, 'open', 'TreeSelect popup')
      ?? controlledFieldError(flags.query === true, query !== undefined, 'input-state', 'TreeSelect query');
    if (error) return { ok: false, error };
    const update = synchronizeTreeSelectState(this.tree, this.getSnapshot().state, {
      cursorFallback: flags.cursor ? 'preserve' : 'first',
      ...(value === undefined ? {} : { selected: value }), ...(expandedValues === undefined ? {} : { expanded: expandedValues }),
      ...(highlightedValue === undefined ? {} : { current: highlightedValue }), ...(open === undefined ? {} : { open }),
      ...(query === undefined ? {} : { query }), ...(results === undefined ? {} : { results }),
    }, { ...this.#scope.policies, eligible: id => this.isDisabled(id) === false });
    if (!update.ok) return update;
    if (this.#scope.retired) return this.#retired();
    const result = this.#runtime.replace({ ok: true, value: update.value.state });
    return result.ok ? { ok: true, value: { snapshot: result.value, effects: update.value.commands } } : result;
  }
  public dispose(): void {
    if (this.#scope.retired) return;
    this.#scope.retired = true;
    const retired = this.#runtime.syncInteraction({ disabled: true, readOnly: true });
    if (retired.ok) this.#scope.interaction = retired.value;
    try { this.#scope.hooks?.update?.(); }
    finally { this.#scope.hooks = undefined; this.#scope.policies = undefined; this.#scope.disabled = undefined; this.#scope.complete = undefined; this.#deliveredSearch = undefined; }
  }
  #retired(): { readonly ok: false; readonly error: { readonly class: 'transition-rejection'; readonly code: 'interaction-disabled'; readonly message: string } } {
    return { ok: false, error: { class: 'transition-rejection', code: 'interaction-disabled', message: 'TreeSelect controller has been disposed.' } };
  }
  #busy(): { readonly ok: false; readonly error: { readonly class: 'transition-rejection'; readonly code: 'invalid-boundary'; readonly message: string } } {
    return { ok: false, error: { class: 'transition-rejection', code: 'invalid-boundary', message: 'TreeSelect is admitting another input.' } };
  }
  #finish(effects: readonly TreeSelectEffect<ID>[], frame: EffectFrame<ID>): void {
    let failed = false, firstError: unknown;
    for (const effect of effects) {
      const snapshot = this.getSnapshot(); if (this.#scope.retired || snapshot.revision !== frame.revision) break;
      const state = snapshot.state;
      if (effect.type === 'search' ? state.request !== effect.request || !state.pending
        : effect.type === 'close-popup' ? state.open : this.#scope.interaction.disabled || !state.open || state.pending || state.view.cursor.current !== effect.id) continue;
      if (effect.type === 'search') {
        if (this.#deliveredSearch === effect.request) continue;
        this.#deliveredSearch = effect.request;
      }
      frame.effects.push(effect);
      try { if (effect.type === 'search') this.#scope.hooks?.search?.(effect.request); else this.#scope.hooks?.effect?.(effect); }
      catch (error) { if (!failed) { failed = true; firstError = error; } }
    }
    try { this.#scope.hooks?.update?.(); } catch (error) { if (!failed) { failed = true; firstError = error; } }
    if (failed) throw firstError;
  }
}
