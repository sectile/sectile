import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applyAccordionEvent, tryCreateAccordionState, type AccordionCommand, type AccordionEvent, type AccordionPolicies, type AccordionState } from '@sectile/core/accordion';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { createDisabledItems } from './internal/disabled-items.js';

export interface AccordionOptions<ID extends StableID = StableID> {
  readonly items: readonly ID[]; readonly policies?: AccordionPolicies<ID>; readonly disabledItems?: readonly ID[];
  readonly disabled?: boolean;
  readonly openIDs?: readonly ID[]; readonly defaultOpenIDs?: readonly ID[];
  readonly highlightedValue?: ID | null; readonly defaultHighlightedValue?: ID | null;
  readonly onOpenChange?: (openIDs: readonly ID[]) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void; readonly onUpdate?: () => void;
}

export type AccordionOpenChangeHandler<ID extends StableID = StableID> = NonNullable<AccordionOptions<ID>['onOpenChange']>;
export type AccordionHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<AccordionOptions<ID>['onHighlightedValueChange']>;
export type AccordionUpdateHandler<ID extends StableID = StableID> = NonNullable<AccordionOptions<ID>['onUpdate']>;
export interface AccordionConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<AccordionState<ID>>;
  syncControlledValues(values: { readonly openIDs?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<AccordionState<ID>>>;
  handleEvent(event: AccordionEvent<ID>): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}
export function createAccordion<ID extends StableID>(options: AccordionOptions<ID>): FacadeConnection<AccordionConnection<ID>> {
  return unwrap(tryCreateAccordion(options));
}

export function tryCreateAccordion<ID extends StableID>(options: AccordionOptions<ID>): Result<FacadeConnection<AccordionConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateAccordionConnection(options));
}

function tryCreateAccordionConnection<ID extends StableID>(options: AccordionOptions<ID>): Result<AccordionConnection<ID>> {
  const domain = tryCreateSequence(options.items); if (!domain.ok) return domain;
  const disabled = createDisabledItems(domain.value, options.disabledItems); if (!disabled.ok) return disabled;
  const suppliedEligibility = options.policies?.eligible;
  const policies: AccordionPolicies<ID> = Object.freeze({ ...options.policies, eligible: (id: ID) => !disabled.value.has(id) && (suppliedEligibility?.(id) ?? true) });
  const openControlled = options.openIDs !== undefined; const highlightControlled = options.highlightedValue !== undefined;
  const initialOpen = options.openIDs ?? options.defaultOpenIDs ?? (options.policies?.collapsible === false && options.items[0] !== undefined ? [options.items[0]] : []);
  const runtime = createSemanticController<AccordionState<ID>, AccordionEvent<ID>, AccordionCommand<ID>, AccordionCommand<ID>>({
    initial: tryCreateAccordionState(domain.value, { openIDs: initialOpen, current: options.highlightedValue !== undefined ? options.highlightedValue : options.defaultHighlightedValue ?? null }, policies),
    reducer: (state, event) => applyAccordionEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateAccordionState(domain.value, { openIDs: openControlled ? previous.openIDs : proposed.openIDs, current: highlightControlled ? previous.cursor.current : proposed.cursor.current }, policies),
    notify: (previous, proposed) => { if (!sameIDs(previous.openIDs, proposed.openIDs)) options.onOpenChange?.(proposed.openIDs); if (previous.cursor.current !== proposed.cursor.current) options.onHighlightedValueChange?.(proposed.cursor.current); },
    toEffect: (command) => command,
    interaction: options,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new TerminalAccordionConnection(options, domain.value, runtime.value, openControlled, highlightControlled, policies) };
}
export function toAccordionEvent<ID extends StableID = StableID>(input: TerminalKeyboardInput): AccordionEvent<ID> | null {
  if (input.key === 'down') return 'next'; if (input.key === 'up') return 'previous'; if (input.key === 'home') return 'first'; if (input.key === 'end') return 'last'; if (input.key === 'enter' || input.key === 'space') return 'toggle'; return null;
}
class TerminalAccordionConnection<ID extends StableID> implements AccordionConnection<ID> {
  readonly #options: AccordionOptions<ID>; readonly #domain: Sequence<ID>; readonly #runtime: SemanticController<AccordionState<ID>, AccordionEvent<ID>, AccordionCommand<ID>>; readonly #openControlled: boolean; readonly #highlightControlled: boolean; readonly #policies: AccordionPolicies<ID>;
  public constructor(options: AccordionOptions<ID>, domain: Sequence<ID>, runtime: SemanticController<AccordionState<ID>, AccordionEvent<ID>, AccordionCommand<ID>>, openControlled: boolean, highlightControlled: boolean, policies: AccordionPolicies<ID>) { this.#options = options; this.#domain = domain; this.#runtime = runtime; this.#openControlled = openControlled; this.#highlightControlled = highlightControlled; this.#policies = policies; }
  public getSnapshot(): RevisionSnapshot<AccordionState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValues(values: { readonly openIDs?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<AccordionState<ID>>> {
    if (this.#openControlled !== (values.openIDs !== undefined) || this.#highlightControlled !== (values.highlightedValue !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled accordion values must preserve their construction-time shape.' } };
    const state = this.#runtime.getSnapshot().state; const result = this.#runtime.replace(tryCreateAccordionState(this.#domain, { openIDs: this.#openControlled ? (values.openIDs as readonly ID[]) : state.openIDs, current: this.#highlightControlled ? (values.highlightedValue as ID | null) : state.cursor.current }, this.#policies)); if (result.ok) this.#options.onUpdate?.(); return result;
  }
  public handleEvent(event: AccordionEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { const event = toAccordionEvent<ID>(input); if (event === null) return false; return this.handleEvent(event); }
}
function sameIDs<ID>(left: readonly ID[], right: readonly ID[]): boolean { return left.length === right.length && left.every((id, index) => id === right[index]); }
