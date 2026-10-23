import type { CoreErrorCode, Result, SectileError, StableID } from '@sectile/core';
import { createSemanticController, controlledFieldError, type SemanticController } from '@sectile/core/adapter-runtime';
import { sameStableIDOrder } from '@sectile/core/identity';
import { tryCreateInteractionState, requireInteraction, type InteractionState, type InteractionStateInput } from '@sectile/core/interaction';
import { findListboxTypeaheadMatch } from '@sectile/core/listbox';
import { rejectRevisionInput, type RevisionResult, type RevisionSnapshot } from '@sectile/core/revision';
import type { Sequence } from '@sectile/core/sequence';
import type { TreeNodeInput } from '@sectile/core/tree';
import { applyTransferEvent, getTransferItems, reconcileTransferState, synchronizeTransferState, tryCreateTransferState,
  type TransferCommand, type TransferControlledParts, type TransferEvent, type TransferPolicies, type TransferSide, type TransferState, type TransferSyncInput } from '@sectile/core/transfer';
import { createDisabledItems } from '../choice/disabled-items.js';
import { toListboxEvent, type KeyboardInput, type ListboxTypeaheadOptions } from '../listbox.js';
import { horizontalArrow, printableKey, repeatedTypeahead, type ReadingDirection } from '../interaction/keyboard.js';

export type { TransferSide } from '@sectile/core/transfer';
export type TransferControllerPolicies<ID extends StableID = StableID> = Omit<TransferPolicies<ID>, 'disabled' | 'readonly'>;
export interface TransferPaneOptions<ID extends StableID = StableID> {
  readonly value?: readonly ID[];
  readonly defaultValue?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
}
export interface TransferControlledValues<ID extends StableID = StableID> {
  readonly nodes?: readonly TreeNodeInput<ID>[];
  readonly source?: Pick<TransferPaneOptions<ID>, 'value' | 'highlightedValue'>;
  readonly target?: Pick<TransferPaneOptions<ID>, 'value' | 'highlightedValue'>;
}
/** One complete move proposal, not independently committed pane updates. */
export interface TransferMoveProposal<ID extends StableID = StableID> {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly sourceValue: readonly ID[];
  readonly targetValue: readonly ID[];
  readonly sourceHighlightedValue: ID | null;
  readonly targetHighlightedValue: ID | null;
}
export type TransferEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-element'; readonly side: TransferSide; readonly id: ID | null }
  | { readonly type: 'dispatch-activation'; readonly side: TransferSide; readonly id: ID };
export interface TransferKeyboardInput extends KeyboardInput { readonly isComposing?: boolean; readonly shiftKey?: boolean }
export type TransferTypeaheadOptions<ID extends StableID = StableID> = ListboxTypeaheadOptions<ID> & {
  /** Maximum buffered Unicode code points before restarting from the latest key. Default256. */
  readonly maxQueryLength?: number;
};
export interface TransferControllerOptions<ID extends StableID = StableID> extends InteractionStateInput {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly sourceID: NoInfer<ID>; readonly targetID: NoInfer<ID>;
  readonly controlled?: boolean;
  readonly source?: TransferPaneOptions<NoInfer<ID>>;
  readonly target?: TransferPaneOptions<NoInfer<ID>>;
  readonly direction?: ReadingDirection;
  readonly disabledItems?: readonly NoInfer<ID>[];
  readonly policies?: TransferControllerPolicies<NoInfer<ID>>;
  readonly typeahead?: TransferTypeaheadOptions<NoInfer<ID>>;
  readonly onMove?: (proposal: TransferMoveProposal<NoInfer<ID>>) => void;
  readonly onValueChange?: (side: TransferSide, value: readonly NoInfer<ID>[]) => void;
  readonly onHighlightedValueChange?: (side: TransferSide, value: NoInfer<ID> | null) => void;
  readonly onEffect?: (effect: TransferEffect<NoInfer<ID>>) => void;
  readonly onUpdate?: () => void;
}
export interface TransferController<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<TransferState<ID>>;
  getItems(side: TransferSide): Sequence<ID>;
  getActive(): boolean;
  getInteraction(): InteractionState;
  isDisabled(id: ID): boolean | null;
  syncInteraction(input: InteractionStateInput): Result<InteractionState>;
  syncControlledValues(values: TransferControlledValues<NoInfer<ID>>): Result<RevisionSnapshot<TransferState<ID>>>;
  handleEvent(event: TransferEvent<NoInfer<ID>>, expectedRevision?: number): RevisionResult<TransferState<ID>, TransferEffect<ID>>;
  handleKeyboardInput(side: TransferSide, input: TransferKeyboardInput, expectedRevision?: number): RevisionResult<TransferState<ID>, TransferEffect<ID>>;
  dispose(): void;
}
interface Hooks<ID extends StableID> {
  move: TransferControllerOptions<ID>['onMove']; value: TransferControllerOptions<ID>['onValueChange'];
  highlight: TransferControllerOptions<ID>['onHighlightedValueChange']; effect: TransferControllerOptions<ID>['onEffect']; update: TransferControllerOptions<ID>['onUpdate'];
}
interface Scope<ID extends StableID> {
  retired: boolean; admitting: boolean; interaction: InteractionState;
  hooks: Hooks<ID> | undefined; policies: TransferControllerPolicies<ID> | undefined; disabled: ReadonlySet<ID> | undefined;
  complete: ((effects: readonly (TransferEffect<ID> | null)[]) => void) | undefined;
  typeahead: TypeaheadSettings<ID> | undefined;
}
interface TypeaheadSettings<ID extends StableID> {
  readonly textValue: (id: ID) => string; readonly normalize: ((text: string) => string) | undefined;
  readonly now: (() => number) | undefined; readonly timeoutMs: number; readonly maxQueryLength: number;
}
interface QueryFrame { query: string; length: number; at: number }
const retiredSearch = /* @__PURE__ */ Symbol('retired Transfer input');
interface EffectFrame<ID extends StableID> { readonly revision: number; readonly effects: TransferEffect<ID>[] }
type Runtime<ID extends StableID> = SemanticController<TransferState<ID>, TransferEvent<ID>, TransferEffect<ID> | null>;
const sides: readonly TransferSide[] = ['source', 'target'];

export function toTransferEvent<ID extends StableID = StableID>(side: TransferSide, input: TransferKeyboardInput, direction: ReadingDirection = 'ltr'): TransferEvent<ID> | null {
  if (input.isComposing === true || input.shiftKey === true || input.altKey === true || input.metaKey === true) return null;
  if (input.ctrlKey === true) {
    const movement = horizontalArrow(input.key, direction);
    return (side === 'source' && movement === 'next') || (side === 'target' && movement === 'previous') ? { type: 'move', from: side } : null;
  }
  const event = toListboxEvent<ID>(input);
  return event === null ? null : { type: 'listbox', side, event };
}

export function createTransferController<ID extends StableID>(options: TransferControllerOptions<ID>): Result<TransferController<ID>> {
  const { nodes, sourceID, targetID, controlled = false, direction = 'ltr' } = options;
  if (typeof controlled !== 'boolean' || (direction !== 'ltr' && direction !== 'rtl')) return rejected('invalid-boundary', 'Transfer controlled mode and reading direction must be valid.', 'construction');
  const typeahead = prepareTypeahead(options.typeahead); if (!typeahead.ok) return typeahead;
  const source = paneSettings(options.source), target = paneSettings(options.target);
  const initial = tryCreateTransferState(nodes, { sourceID, targetID, source: source.input, target: target.input });
  if (!initial.ok) return initial;
  const left = getTransferItems(initial.value, 'source'), right = getTransferItems(initial.value, 'target');
  const requested = options.disabledItems ?? [];
  if (!Array.isArray(requested)) return rejected('invalid-boundary', 'Transfer disabled items require an array.', 'construction');
  const count = requested.length;
  if (!Number.isSafeInteger(count) || count < 0 || count > left.size + right.size) return rejected('item-ceiling-exceeded', 'Transfer disabled items exceed the pane domain.', 'construction');
  const ids: ID[] = []; for (let index = 0; index < count; index++) ids.push(requested[index]!);
  const disabled = createDisabledItems({ contains: id => left.contains(id) || right.contains(id) }, ids);
  if (!disabled.ok) return disabled;
  const interaction = captureInteraction(options);
  if (!interaction.ok) return interaction;
  const { eligible, canMove, capacity, maxScan } = options.policies ?? {};
  if ((eligible !== undefined && typeof eligible !== 'function') || (canMove !== undefined && typeof canMove !== 'function')) return rejected('invalid-eligibility-policy', 'Transfer eligibility policies must be functions.', 'construction');
  if (capacity !== undefined && (capacity === null || typeof capacity !== 'object' || Array.isArray(capacity))) return rejected('invalid-boundary', 'Transfer capacity must name source and target limits.', 'construction');
  const sourceCapacity = capacity?.source, targetCapacity = capacity?.target;
  const policies: TransferControllerPolicies<ID> = {
    ...(eligible === undefined ? {} : { eligible }), ...(canMove === undefined ? {} : { canMove }), ...(maxScan === undefined ? {} : { maxScan }),
    ...(capacity === undefined ? {} : { capacity: Object.freeze({ ...(sourceCapacity === undefined ? {} : { source: sourceCapacity }), ...(targetCapacity === undefined ? {} : { target: targetCapacity }) }) }),
  };
  const scope: Scope<ID> = { retired: false, admitting: false, interaction: interaction.value, disabled: disabled.value, policies,
    hooks: { move: options.onMove, value: options.onValueChange, highlight: options.onHighlightedValueChange, effect: options.onEffect, update: options.onUpdate }, complete: undefined, typeahead: typeahead.value };
  const flags: TransferControlledParts = { membership: controlled, sourceSelection: source.selection, targetSelection: target.selection, sourceCursor: source.cursor, targetCursor: target.cursor };
  const accepted = synchronizeTransferState(initial.value, { source: { current: initial.value.source.cursor.current }, target: { current: initial.value.target.cursor.current } }, activePolicies(scope));
  const runtime = createRuntime(accepted, flags, scope);
  return runtime.ok ? { ok: true, value: new DOMTransferController(runtime.value, flags, scope, direction) } : runtime;
}
function prepareTypeahead<ID extends StableID>(input: TransferTypeaheadOptions<ID> | undefined): Result<TypeaheadSettings<ID> | undefined> {
  if (input === undefined) return { ok: true, value: undefined };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return rejected('invalid-boundary', 'Transfer typeahead requires named options.', 'construction');
  const { textValue, normalize, now, timeoutMs = 500, maxQueryLength = 256 } = input;
  if (typeof textValue !== 'function') return rejected('invalid-typeahead-text-value', 'Transfer typeahead requires a text resolver.', 'construction');
  if (normalize !== undefined && typeof normalize !== 'function') return rejected('invalid-typeahead-normalizer', 'Transfer typeahead normalize must be a function.', 'construction');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) return rejected('invalid-typeahead-timeout', 'Transfer typeahead timeout must be nonnegative and finite.', 'construction');
  if ((now !== undefined && typeof now !== 'function') || !Number.isSafeInteger(maxQueryLength) || maxQueryLength < 1) return rejected('invalid-boundary', 'Transfer typeahead clock and query ceiling must be valid.', 'construction');
  return { ok: true, value: Object.freeze({ textValue, normalize, now, timeoutMs, maxQueryLength }) };
}
function captureKeyboard(input: TransferKeyboardInput, scope: { readonly retired: boolean }): Result<TransferKeyboardInput> {
  const key = input.key; if (scope.retired) return rejected('interaction-disabled', 'Transfer was disposed during keyboard admission.');
  if (typeof key !== 'string') return rejected('invalid-boundary', 'Transfer keyboard keys must be strings.');
  const captured: { key: string; isComposing?: boolean; shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean } = { key };
  for (const name of ['isComposing', 'shiftKey', 'altKey', 'ctrlKey', 'metaKey'] as const) {
    const value = input[name]; if (scope.retired) return rejected('interaction-disabled', 'Transfer was disposed during keyboard admission.');
    if (value !== undefined) captured[name] = value;
  }
  return { ok: true, value: captured };
}
function paneSettings<ID extends StableID>(options: TransferPaneOptions<ID> = {}) {
  const { value, defaultValue, highlightedValue, defaultHighlightedValue } = options;
  return { input: { selected: value !== undefined ? value : defaultValue !== undefined ? defaultValue : [],
    current: highlightedValue !== undefined ? highlightedValue : defaultHighlightedValue !== undefined ? defaultHighlightedValue : null }, selection: value !== undefined, cursor: highlightedValue !== undefined };
}
/** Capture caller scalars once and stop reading payload after getter-triggered retirement. */
function captureInteraction(input: InteractionStateInput, scope?: { readonly retired: boolean }): Result<InteractionState> {
  const disabled = input.disabled;
  if (scope?.retired) return rejected('interaction-disabled', 'Transfer was disposed during interaction admission.');
  const readOnly = input.readOnly;
  if (scope?.retired) return rejected('interaction-disabled', 'Transfer was disposed during interaction admission.');
  return tryCreateInteractionState({ ...(disabled === undefined ? {} : { disabled }), ...(readOnly === undefined ? {} : { readOnly }) });
}
function activePolicies<ID extends StableID>(scope: Scope<ID>): TransferControllerPolicies<ID> {
  return { ...scope.policies, eligible: id => !scope.disabled?.has(id) && (scope.policies?.eligible?.(id) ?? true) };
}
/** Runtime closures capture the retireable scope, never the construction options. */
function createRuntime<ID extends StableID>(initial: Result<TransferState<ID>>, flags: TransferControlledParts, scope: Scope<ID>): Result<Runtime<ID>> {
  return createSemanticController<TransferState<ID>, TransferEvent<ID>, TransferCommand<ID>, TransferEffect<ID> | null>({
    initial, interaction: scope.interaction,
    interactionIntent: event => event?.type === 'listbox' && (event.event === 'next' || event.event === 'previous' || event.event === 'first' || event.event === 'last' || (typeof event.event === 'object' && event.event?.type === 'focus')) ? 'navigate' : 'mutate',
    reducer: (state, event) => { const update = applyTransferEvent(state, event, activePolicies(scope)); return scope.retired ? rejected('interaction-disabled', 'Transfer was disposed during input admission.') : update; },
    reconcile: (before, after) => { const result = reconcileTransferState(before, after, flags, activePolicies(scope)); return scope.retired ? rejected('interaction-disabled', 'Transfer was disposed during reconciliation.') : result; },
    toEffect: command => command.type === 'focus' ? { type: 'focus-element', side: command.side, id: command.id }
      : command.type === 'activate' ? { type: 'dispatch-activation', side: command.side, id: command.id } : null,
    notify: [
      () => { scope.admitting = false; },
      (before, after) => { if (before.nodes !== after.nodes) scope.hooks?.move?.(Object.freeze({ nodes: after.nodes, sourceValue: after.source.selection.selected,
        targetValue: after.target.selection.selected, sourceHighlightedValue: after.source.cursor.current, targetHighlightedValue: after.target.cursor.current })); },
      ...sides.flatMap(side => [
        (before: TransferState<ID>, after: TransferState<ID>) => { if (before.nodes === after.nodes && !sameStableIDOrder(before[side].selection.selected, after[side].selection.selected)) scope.hooks?.value?.(side, after[side].selection.selected); },
        (before: TransferState<ID>, after: TransferState<ID>) => { if (before.nodes === after.nodes && before[side].cursor.current !== after[side].cursor.current) scope.hooks?.highlight?.(side, after[side].cursor.current); },
      ]),
    ], complete: effects => scope.complete?.(effects),
  });
}

class DOMTransferController<ID extends StableID> implements TransferController<ID> {
  readonly #runtime: Runtime<ID>; readonly #flags: TransferControlledParts; readonly #scope: Scope<ID>; readonly #direction: ReadingDirection;
  #frame: EffectFrame<ID> | undefined;
  readonly #queries: Record<TransferSide, QueryFrame> = { source: { query: '', length: 0, at: -Infinity }, target: { query: '', length: 0, at: -Infinity } };
  public constructor(runtime: Runtime<ID>, flags: TransferControlledParts, scope: Scope<ID>, direction: ReadingDirection) {
    this.#runtime = runtime; this.#flags = flags; this.#scope = scope; this.#direction = direction;
    scope.complete = effects => { if (this.#frame) this.#finish(effects, this.#frame); };
  }
  public getSnapshot(): RevisionSnapshot<TransferState<ID>> { return this.#runtime.getSnapshot(); }
  public getItems(side: TransferSide): Sequence<ID> { return getTransferItems(this.getSnapshot().state, side); }
  public getActive(): boolean { return !this.#scope.retired; }
  public getInteraction(): InteractionState { return this.#scope.interaction; }
  public isDisabled(id: ID): boolean | null {
    if (!this.getItems('source').contains(id) && !this.getItems('target').contains(id)) return null;
    return this.#scope.retired || this.#scope.interaction.disabled || this.#scope.disabled?.has(id) === true || this.#scope.policies?.eligible?.(id) === false;
  }
  public syncInteraction(input: InteractionStateInput): Result<InteractionState> {
    if (this.#scope.retired) return this.#retired();
    if (this.#scope.admitting) return this.#busy();
    const before = this.#scope.interaction;
    let result: Result<InteractionState>;
    this.#scope.admitting = true;
    try { const captured = captureInteraction(input, this.#scope); result = captured.ok ? this.#runtime.syncInteraction(captured.value) : captured; }
    finally { this.#scope.admitting = false; }
    if (this.#scope.retired) { this.#runtime.syncInteraction(this.#scope.interaction); return this.#retired(); }
    if (result.ok) { this.#scope.interaction = result.value; if (result.value.disabled) this.#resetQueries(); if (before.disabled !== result.value.disabled || before.readOnly !== result.value.readOnly) this.#scope.hooks?.update?.(); }
    return result;
  }
  public handleKeyboardInput(side: TransferSide, input: TransferKeyboardInput, expectedRevision?: number): RevisionResult<TransferState<ID>, TransferEffect<ID>> {
    if (this.#scope.retired) return rejectRevisionInput(this.getSnapshot(), this.#retired().error);
    if (this.#scope.admitting) return rejectRevisionInput(this.getSnapshot(), this.#busy().error);
    const before = this.getSnapshot(), revision = expectedRevision ?? before.revision;
    if (revision !== before.revision) return rejectRevisionInput(before, rejected('stale-revision', 'Transfer keyboard revision is stale.').error);
    const permitted = requireInteraction(this.#scope.interaction, 'navigate'); if (!permitted.ok) return rejectRevisionInput(before, permitted.error);
    let event: TransferEvent<ID>;
    this.#scope.admitting = true;
    try {
      const captured = captureKeyboard(input, this.#scope); if (!captured.ok) return rejectRevisionInput(this.getSnapshot(), captured.error);
      const mapped = toTransferEvent<ID>(side, captured.value, this.#direction);
      if (mapped !== null) event = mapped;
      else {
        const typed = this.#typeaheadEvent(side, captured.value); if (!typed.ok) return rejectRevisionInput(this.getSnapshot(), typed.error);
        event = typed.value;
      }
    } catch (error) { if (error === retiredSearch) return rejectRevisionInput(this.getSnapshot(), this.#retired().error); throw error; }
    finally { this.#scope.admitting = false; }
    return this.handleEvent(event, revision);
  }
  #typeaheadEvent(side: TransferSide, input: TransferKeyboardInput): Result<TransferEvent<ID>> {
    const settings = this.#scope.typeahead, part = input.isComposing === true || (input.shiftKey === true && input.key === ' ') ? null : printableKey(input);
    if (!settings || part === null) return rejected('unsupported-dom-key', 'DOM keyboard input does not map to a Transfer event.');
    const live = (): void => { if (this.#scope.retired) throw retiredSearch; };
    const now = settings.now?.() ?? Date.now(); live();
    if (!Number.isFinite(now)) return rejected('invalid-boundary', 'Transfer typeahead clock must return a finite value.');
    const frame = this.#queries[side], restart = now < frame.at || now - frame.at > settings.timeoutMs || frame.length >= settings.maxQueryLength;
    const query = restart ? part : repeatedTypeahead(frame.query, part), length = query === part ? 1 : frame.length + 1;
    const match = findListboxTypeaheadMatch(this.getItems(side), this.getSnapshot().state[side].cursor.current, query, {
      textValue: id => { live(); const value = settings.textValue(id); live(); return value; },
      ...(settings.normalize === undefined ? {} : { normalize: (text: string) => { live(); const value = settings.normalize!(text); live(); return value; } }),
      eligible: id => { live(); const enabled = this.isDisabled(id) === false; live(); return enabled; },
      ...(this.#scope.policies?.maxScan === undefined ? {} : { maxScan: this.#scope.policies.maxScan }),
    });
    live(); frame.query = query; frame.length = length; frame.at = now;
    if (!match.ok) return match;
    return match.value === null ? rejected('typeahead-no-match', 'Transfer typeahead did not match an eligible item.') : { ok: true, value: { type: 'listbox', side, event: { type: 'focus', id: match.value } } };
  }
  #resetQueries(): void { for (const side of sides) { const frame = this.#queries[side]; frame.query = ''; frame.length = 0; frame.at = -Infinity; } }
  public handleEvent(event: TransferEvent<ID>, expectedRevision = this.getSnapshot().revision): RevisionResult<TransferState<ID>, TransferEffect<ID>> {
    if (this.#scope.retired) return rejectRevisionInput(this.getSnapshot(), this.#retired().error);
    if (this.#scope.admitting) return rejectRevisionInput(this.getSnapshot(), this.#busy().error);
    const previous = this.#frame, frame: EffectFrame<ID> = { revision: this.getSnapshot().revision + 1, effects: [] };
    this.#frame = frame; this.#scope.admitting = true;
    const nodes = this.getSnapshot().state.nodes;
    try { const result = this.#runtime.handle(event, expectedRevision); if (result.ok && result.snapshot.state.nodes !== nodes) this.#resetQueries(); return result.ok ? Object.freeze({ ...result, commands: Object.freeze(frame.effects) }) : result; }
    finally { this.#scope.admitting = false; this.#frame = previous; }
  }
  public syncControlledValues(values: TransferControlledValues<ID>): Result<RevisionSnapshot<TransferState<ID>>> {
    if (this.#scope.retired) return this.#retired();
    if (this.#scope.admitting) return this.#busy();
    this.#scope.admitting = true;
    const before = this.getSnapshot(); let result: Result<RevisionSnapshot<TransferState<ID>>>;
    try { result = this.#synchronize(values); } finally { this.#scope.admitting = false; }
    if (!result.ok) return result;
    if (result.value.state.nodes !== before.state.nodes) this.#resetQueries();
    const effects: TransferEffect<ID>[] = [];
    for (const side of sides) if (before.state[side].cursor.current !== result.value.state[side].cursor.current) effects.push({ type: 'focus-element', side, id: result.value.state[side].cursor.current });
    this.#finish(effects, { revision: result.value.revision, effects: [] });
    return result;
  }
  #synchronize(values: TransferControlledValues<ID>): Result<RevisionSnapshot<TransferState<ID>>> {
    const { nodes, source, target } = values, flags = this.#flags;
    const error = controlledFieldError(flags.membership === true, nodes !== undefined, 'value', 'Transfer membership')
      ?? controlledFieldError(flags.sourceSelection === true, source?.value !== undefined, 'value', 'Transfer source selection')
      ?? controlledFieldError(flags.targetSelection === true, target?.value !== undefined, 'value', 'Transfer target selection')
      ?? controlledFieldError(flags.sourceCursor === true, source?.highlightedValue !== undefined, 'highlighted-value', 'Transfer source cursor')
      ?? controlledFieldError(flags.targetCursor === true, target?.highlightedValue !== undefined, 'highlighted-value', 'Transfer target cursor');
    if (error) return { ok: false, error };
    const input: TransferSyncInput<ID> = { ...(nodes === undefined ? {} : { nodes }),
      ...(source === undefined ? {} : { source: { ...(source.value === undefined ? {} : { selected: source.value }), ...(source.highlightedValue === undefined ? {} : { current: source.highlightedValue }) } }),
      ...(target === undefined ? {} : { target: { ...(target.value === undefined ? {} : { selected: target.value }), ...(target.highlightedValue === undefined ? {} : { current: target.highlightedValue }) } }) };
    const next = synchronizeTransferState(this.getSnapshot().state, input, activePolicies(this.#scope));
    if (!next.ok) return next;
    return this.#scope.retired ? this.#retired() : this.#runtime.replace(next);
  }
  public dispose(): void {
    if (this.#scope.retired) return;
    this.#scope.retired = true;
    const result = this.#runtime.syncInteraction({ disabled: true, readOnly: true });
    if (result.ok) this.#scope.interaction = result.value;
    try { this.#scope.hooks?.update?.(); }
    finally { this.#scope.hooks = undefined; this.#scope.policies = undefined; this.#scope.disabled = undefined; this.#scope.complete = undefined; this.#scope.typeahead = undefined; this.#resetQueries(); }
  }
  #retired() { return rejected('interaction-disabled', 'Transfer controller is disposed.'); }
  #busy() { return rejected('invalid-boundary', 'Transfer is admitting another input.'); }
  #finish(effects: readonly (TransferEffect<ID> | null)[], frame: EffectFrame<ID>): void {
    let failed = false, firstError: unknown;
    for (const effect of effects) {
      const snapshot = this.getSnapshot(); if (this.#scope.retired || snapshot.revision !== frame.revision) break;
      if (effect === null || this.#scope.interaction.disabled || snapshot.state[effect.side].cursor.current !== effect.id
        || (effect.type === 'dispatch-activation' && this.#scope.interaction.readOnly)) continue;
      frame.effects.push(effect);
      try { this.#scope.hooks?.effect?.(effect); } catch (error) { if (!failed) { failed = true; firstError = error; } }
    }
    if (!this.#scope.retired && this.getSnapshot().revision === frame.revision) {
      try { this.#scope.hooks?.update?.(); } catch (error) { if (!failed) { failed = true; firstError = error; } }
    }
    if (failed) throw firstError;
  }
}
function rejected(code: CoreErrorCode, message: string, errorClass: 'construction' | 'transition-rejection' = 'transition-rejection'): { readonly ok: false; readonly error: SectileError } {
  return { ok: false, error: { class: errorClass, code, message } };
}
