import type { Result, StableID } from '@sectile/primitives';
import { createSequence, type Sequence } from '@sectile/primitives/sequence';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import {
  applyAccordionEvent, createAccordionState,
  type AccordionCommand, type AccordionEvent, type AccordionPolicies, type AccordionState,
} from '@sectile/primitives/accordion';
import { findDelegatedID } from './internal/delegated-event.js';
import { createDisabledItems } from './internal/disabled-items.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import type { KeyboardInput } from './tabs.js';

export type AccordionEffect<ID extends StableID = StableID> = AccordionCommand<ID>;
export interface AccordionOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly items: readonly ID[];
  readonly policies?: AccordionPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly openIDs?: readonly ID[];
  readonly defaultOpenIDs?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly label?: string;
  readonly onOpenChange?: (openIDs: readonly ID[]) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onUpdate?: () => void;
}
export interface AccordionConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<AccordionState<ID>>;
  syncControlledValues(values: { readonly openIDs?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<AccordionState<ID>>>;
  setHeaderAttributes(element: HTMLElement, id: ID, panelID?: string, disabled?: boolean): void;
  setPanelAttributes(element: HTMLElement, id: ID, headerID?: string): void;
  handleEvent(event: AccordionEvent<ID>): boolean;
  disconnect(): void;
}
export function createAccordion<ID extends StableID>(options: AccordionOptions<ID>): Result<AccordionConnection<ID>> {
  const domain = createSequence(options.items); if (!domain.ok) return domain;
  const disabled = createDisabledItems(domain.value, options.disabledItems); if (!disabled.ok) return disabled;
  const suppliedEligibility = options.policies?.eligible;
  const policies: AccordionPolicies<ID> = Object.freeze({ ...options.policies, eligible: (id: ID) => !disabled.value.has(id) && (suppliedEligibility?.(id) ?? true) });
  const openControlled = options.openIDs !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const initialOpen = options.openIDs ?? options.defaultOpenIDs
    ?? (options.policies?.collapsible === false && options.items[0] !== undefined ? [options.items[0]] : []);
  const runtime = createSemanticController<AccordionState<ID>, AccordionEvent<ID>, AccordionCommand<ID>, AccordionEffect<ID>>({
    initial: createAccordionState(domain.value, {
      openIDs: initialOpen,
      current: options.highlightedValue !== undefined ? options.highlightedValue : options.defaultHighlightedValue ?? null,
    }, policies),
    reducer: (state, event) => applyAccordionEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => createAccordionState(domain.value, {
      openIDs: openControlled ? previous.openIDs : proposed.openIDs,
      current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
    }, policies),
    notify: (previous, proposed) => {
      if (!sameIDs(previous.openIDs, proposed.openIDs)) options.onOpenChange?.(proposed.openIDs);
      if (previous.cursor.current !== proposed.cursor.current) options.onHighlightedValueChange?.(proposed.cursor.current);
    },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMAccordionConnection(options, domain.value, runtime.value, openControlled, highlightControlled, policies, disabled.value) };
}
export function toAccordionEvent<ID extends StableID = StableID>(input: KeyboardInput): AccordionEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'ArrowDown') return 'next'; if (input.key === 'ArrowUp') return 'previous';
  if (input.key === 'Home') return 'first'; if (input.key === 'End') return 'last';
  if (input.key === 'Enter' || input.key === ' ') return 'toggle'; return null;
}
class DOMAccordionConnection<ID extends StableID> implements AccordionConnection<ID> {
  readonly #options: AccordionOptions<ID>; readonly #domain: Sequence<ID>;
  readonly #runtime: SemanticController<AccordionState<ID>, AccordionEvent<ID>, AccordionEffect<ID>>;
  readonly #openControlled: boolean; readonly #highlightControlled: boolean;
  readonly #policies: AccordionPolicies<ID>; readonly #disabledItems: ReadonlySet<ID>;
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void;
  public constructor(options: AccordionOptions<ID>, domain: Sequence<ID>, runtime: SemanticController<AccordionState<ID>, AccordionEvent<ID>, AccordionEffect<ID>>, openControlled: boolean, highlightControlled: boolean, policies: AccordionPolicies<ID>, disabledItems: ReadonlySet<ID>) {
    this.#options = options; this.#domain = domain; this.#runtime = runtime;
    this.#openControlled = openControlled; this.#highlightControlled = highlightControlled;
    this.#policies = policies; this.#disabledItems = disabledItems;
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    this.#keydown = (event): void => { const semantic = toAccordionEvent<ID>(event); if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); } };
    this.#click = (event): void => { const id = findDelegatedID(event.target, options.root, 'accordionId'); if (id !== null) this.handleEvent({ type: 'toggle', id: id as ID }); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click);
  }
  public getSnapshot(): RevisionSnapshot<AccordionState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValues(values: { readonly openIDs?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<AccordionState<ID>>> {
    if (this.#openControlled !== (values.openIDs !== undefined) || this.#highlightControlled !== (values.highlightedValue !== undefined)) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled accordion values must preserve their construction-time shape.' } };
    }
    const state = this.#runtime.getSnapshot().state;
    const result = this.#runtime.replace(createAccordionState(this.#domain, {
      openIDs: this.#openControlled ? (values.openIDs as readonly ID[]) : state.openIDs,
      current: this.#highlightControlled ? (values.highlightedValue as ID | null) : state.cursor.current,
    }, this.#policies));
    if (result.ok) this.#options.onUpdate?.(); return result;
  }
  public setHeaderAttributes(element: HTMLElement, id: ID, panelID?: string, disabled = false): void {
    const state = this.#runtime.getSnapshot().state; element.dataset['accordionId'] = id;
    element.setAttribute('aria-expanded', String(state.has(id))); element.tabIndex = state.cursor.current === id ? 0 : -1;
    if (panelID !== undefined) element.setAttribute('aria-controls', panelID);
    if (disabled || this.#disabledItems.has(id)) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled');
  }
  public setPanelAttributes(element: HTMLElement, id: ID, headerID?: string): void {
    element.setAttribute('role', 'region'); element.hidden = !this.#runtime.getSnapshot().state.has(id);
    if (headerID !== undefined) element.setAttribute('aria-labelledby', headerID);
  }
  public handleEvent(event: AccordionEvent<ID>): boolean {
    const result = this.#runtime.handle(event); if (result.ok) queueMicrotask(() => {
      for (const element of this.#options.root.querySelectorAll<HTMLElement>('[data-accordion-id]')) if (element.dataset['accordionId'] === result.snapshot.state.cursor.current) element.focus();
    }); this.#options.onUpdate?.(); return true;
  }
  public disconnect(): void { this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.root.removeEventListener('click', this.#click); }
}
function sameIDs<ID>(left: readonly ID[], right: readonly ID[]): boolean { return left.length === right.length && left.every((id, index) => id === right[index]); }
