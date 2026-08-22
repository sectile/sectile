import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { createSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applySelectEvent, createSelectState, type SelectCommand, type SelectEvent, type SelectPolicies, type SelectState } from '@sectile/core/select';
export type { SelectPolicies } from '@sectile/core/select';
import { findDelegatedID } from './internal/delegated-event.js';
import { createDisabledItems } from './internal/disabled-items.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface SelectOptions<ID extends StableID = StableID> { readonly root: HTMLElement; readonly trigger: HTMLButtonElement; readonly popup: HTMLElement; readonly items: readonly ID[]; readonly disabledItems?: readonly ID[]; readonly policies?: SelectPolicies<ID>; readonly disabled?: boolean; readonly readOnly?: boolean; readonly value?: ID | null; readonly defaultValue?: ID | null; readonly highlightedValue?: ID | null; readonly defaultHighlightedValue?: ID | null; readonly open?: boolean; readonly defaultOpen?: boolean; readonly label?: string; readonly onValueChange?: (value: ID | null) => void; readonly onHighlightedValueChange?: (value: ID | null) => void; readonly onOpenChange?: (open: boolean) => void; readonly onUpdate?: () => void }
export type SelectEffect<ID extends StableID = StableID> = { readonly type: 'focus-option'; readonly id: ID } | { readonly type: 'close-popup' };
export interface SelectConnection<ID extends StableID = StableID> { getSnapshot(): RevisionSnapshot<SelectState<ID>>; syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null; readonly open?: boolean }): Result<RevisionSnapshot<SelectState<ID>>>; setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void; handleEvent(event: SelectEvent<ID>): boolean; disconnect(): void }

export function createSelect<ID extends StableID>(options: SelectOptions<ID>): FacadeConnection<SelectConnection<ID>> {
  return unwrap(tryCreateSelect(options));
}

export function tryCreateSelect<ID extends StableID>(options: SelectOptions<ID>): Result<FacadeConnection<SelectConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateSelectConnection(options));
}

function tryCreateSelectConnection<ID extends StableID>(options: SelectOptions<ID>): Result<SelectConnection<ID>> {
  const domain = createSequence(options.items); if (!domain.ok) return domain;
  const disabled = createDisabledItems(domain.value, options.disabledItems); if (!disabled.ok) return disabled;
  const suppliedEligibility = options.policies?.eligible;
  const policies: SelectPolicies<ID> = { ...options.policies, eligible: (id) => !disabled.value.has(id) && (suppliedEligibility?.(id) ?? true) };
  const controlled = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const runtime = createSemanticController<SelectState<ID>, SelectEvent<ID>, SelectCommand<ID>, SelectEffect<ID>>({
    interaction: options, interactionIntent: (event) => event === 'select' || (typeof event === 'object' && event.type === 'select') ? 'mutate' : 'navigate',
    initial: createSelectState(domain.value, { value: options.value ?? options.defaultValue ?? null, current: options.highlightedValue ?? options.defaultHighlightedValue ?? options.value ?? options.defaultValue ?? null, open: options.open ?? options.defaultOpen ?? false }),
    reducer: (state, event) => applySelectEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => createSelectState(domain.value, { value: controlled.value ? previous.choice.selection.selected[0] ?? null : proposed.choice.selection.selected[0] ?? null, current: controlled.highlighted ? previous.choice.cursor.current : proposed.choice.cursor.current, open: controlled.open ? previous.open : proposed.open }),
    notify: (previous, proposed) => { const before = previous.choice.selection.selected[0] ?? null; const after = proposed.choice.selection.selected[0] ?? null; if (before !== after) options.onValueChange?.(after); if (previous.choice.cursor.current !== proposed.choice.cursor.current) options.onHighlightedValueChange?.(proposed.choice.cursor.current); if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open); },
    toEffect: (command) => command.type === 'focus' ? { type: 'focus-option', id: command.id } : { type: 'close-popup' },
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMSelectConnection(options, domain.value, runtime.value, disabled.value, controlled) };
}

class DOMSelectConnection<ID extends StableID> implements SelectConnection<ID> {
  readonly #options: SelectOptions<ID>; readonly #domain: Sequence<ID>; readonly #runtime: SemanticController<SelectState<ID>, SelectEvent<ID>, SelectEffect<ID>>; readonly #disabled: ReadonlySet<ID>; readonly #controlled: { value: boolean; highlighted: boolean; open: boolean }; readonly #triggerClick: () => void; readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void;
  constructor(options: SelectOptions<ID>, domain: Sequence<ID>, runtime: SemanticController<SelectState<ID>, SelectEvent<ID>, SelectEffect<ID>>, disabled: ReadonlySet<ID>, controlled: { value: boolean; highlighted: boolean; open: boolean }) { this.#options = options; this.#domain = domain; this.#runtime = runtime; this.#disabled = disabled; this.#controlled = controlled; setInteractionAttributes(options.root, options, { readOnly: true }); options.trigger.disabled = options.disabled === true; options.trigger.setAttribute('aria-haspopup', 'listbox'); options.popup.setAttribute('role', 'listbox'); if (options.label !== undefined) { options.trigger.setAttribute('aria-label', options.label); options.popup.setAttribute('aria-label', options.label); } this.#triggerClick = () => { this.handleEvent('toggle'); }; this.#keydown = (event) => { const isClosedTriggerActivation = event.target === options.trigger && !this.#runtime.getSnapshot().state.open && (event.key === 'Enter' || event.key === ' '); const semantic = isClosedTriggerActivation ? 'open' : toSelectEvent<ID>(event); if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); } }; this.#click = (event) => { const id = findDelegatedID(event.target, options.popup, 'selectId') as ID | null; if (id !== null && !this.#disabled.has(id)) this.handleEvent({ type: 'select', id }); }; options.trigger.addEventListener('click', this.#triggerClick); options.root.addEventListener('keydown', this.#keydown); options.popup.addEventListener('click', this.#click); this.#render(); }
  getSnapshot() { return this.#runtime.getSnapshot(); }
  syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null; readonly open?: boolean }) { if (this.#controlled.value !== (values.value !== undefined) || this.#controlled.highlighted !== (values.highlightedValue !== undefined) || this.#controlled.open !== (values.open !== undefined)) return { ok: false as const, error: { class: 'construction' as const, code: 'controlled-shape-mismatch', message: 'Controlled select values must preserve their construction-time shape.' } }; const state = this.#runtime.getSnapshot().state; const result = this.#runtime.replace(createSelectState(this.#domain, { value: this.#controlled.value ? values.value ?? null : state.choice.selection.selected[0] ?? null, current: this.#controlled.highlighted ? values.highlightedValue ?? null : state.choice.cursor.current, open: this.#controlled.open ? values.open ?? false : state.open })); if (result.ok) { this.#render(); this.#options.onUpdate?.(); } return result; }
  setItemAttributes(element: HTMLElement, id: ID, disabled = false): void { const state = this.#runtime.getSnapshot().state; element.dataset['selectId'] = id; element.setAttribute('role', 'option'); element.setAttribute('aria-selected', String(state.choice.selection.has(id))); element.tabIndex = state.choice.cursor.current === id ? 0 : -1; if (disabled || this.#disabled.has(id)) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled'); }
  handleEvent(event: SelectEvent<ID>): boolean { const result = this.#runtime.handle(event); if (!result.ok) return false; this.#render(); for (const effect of result.commands) { if (effect.type === 'focus-option') queueMicrotask(() => { for (const element of this.#options.popup.querySelectorAll<HTMLElement>('[data-select-id]')) if (element.dataset['selectId'] === effect.id) element.focus(); }); else this.#options.trigger.focus(); } this.#options.onUpdate?.(); return true; }
  disconnect(): void { this.#options.trigger.removeEventListener('click', this.#triggerClick); this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.popup.removeEventListener('click', this.#click); }
  #render(): void { const open = this.#runtime.getSnapshot().state.open; this.#options.trigger.setAttribute('aria-expanded', String(open)); this.#options.popup.hidden = !open; }
}
function toSelectEvent<ID extends StableID>(input: KeyboardEvent): SelectEvent<ID> | null { if (input.altKey || input.ctrlKey || input.metaKey) return null; if (input.key === 'ArrowDown') return 'next'; if (input.key === 'ArrowUp') return 'previous'; if (input.key === 'Home') return 'first'; if (input.key === 'End') return 'last'; if (input.key === 'Enter' || input.key === ' ') return 'select'; if (input.key === 'Escape') return 'close'; return null; }
