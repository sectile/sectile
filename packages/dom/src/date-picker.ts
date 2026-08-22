import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, type DateValue } from '@sectile/core/date-field';
import { applyDatePickerEvent, createDatePickerMonth, createDatePickerState, datePickerID, isDatePickerValueAvailable, type DatePickerCommand, type DatePickerEvent, type DatePickerPolicies, type DatePickerState } from '@sectile/core/date-picker';
export { createDatePickerMonth, datePickerID, isDatePickerValueAvailable } from '@sectile/core/date-picker';
export type { DatePickerPolicies } from '@sectile/core/date-picker';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { createDateField, type DateFieldConnection } from './date-field.js';

export interface DatePickerOptions {
  readonly root: HTMLElement;
  readonly grid: HTMLElement;
  readonly trigger: HTMLElement;
  readonly input?: HTMLInputElement;
  readonly policies?: DatePickerPolicies;
  readonly value?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly onValueChange?: (value: DateValue | null) => void;
  readonly onHighlightedValueChange?: (value: DateValue) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}
export interface DatePickerControlledValues { readonly value?: DateValue | null; readonly highlightedValue?: DateValue; readonly open?: boolean; }
export interface DatePickerConnection {
  getSnapshot(): RevisionSnapshot<DatePickerState>;
  getMonth(): readonly (readonly DateValue[])[];
  syncControlledValues(values: DatePickerControlledValues): Result<RevisionSnapshot<DatePickerState>>;
  setCellAttributes(element: HTMLElement, value: DateValue): void;
  handleEvent(event: DatePickerEvent): boolean;
  refresh(): void;
  disconnect(): void;
}
export function createDatePicker(options: DatePickerOptions): FacadeConnection<DatePickerConnection> { return unwrap(tryCreateDatePicker(options)); }
export function tryCreateDatePicker(options: DatePickerOptions): Result<FacadeConnection<DatePickerConnection>> { return createFacadeConnection(options, construct); }
function construct(options: DatePickerOptions): Result<DatePickerConnection> {
  const controls = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const requestedValue = controls.value ? options.value : options.defaultValue;
  const requestedHighlight = controls.highlighted ? options.highlightedValue : options.defaultHighlightedValue;
  const requestedOpen = controls.open ? options.open : options.defaultOpen;
  const initial = createDatePickerState({ ...(requestedValue === undefined ? {} : { value: requestedValue }), ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }), ...(requestedOpen === undefined ? {} : { open: requestedOpen }) });
  const runtime = createSemanticController<DatePickerState, DatePickerEvent, DatePickerCommand, DatePickerCommand>({ initial, reducer: (state, event) => applyDatePickerEvent(state, event, { ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) }), reconcile: (previous, proposed) => createDatePickerState({ value: controls.value ? previous.value : proposed.value, highlighted: controls.highlighted ? previous.highlighted : proposed.highlighted, open: controls.open ? previous.open : proposed.open, view: controls.highlighted ? previous.view : proposed.view }), notify: (previous, proposed) => { if (compareNullable(previous.value, proposed.value) !== 0) options.onValueChange?.(proposed.value); if (compareDateValues(previous.highlighted, proposed.highlighted) !== 0) options.onHighlightedValueChange?.(proposed.highlighted); if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open); }, toEffect: (command) => command, interaction: options });
  return runtime.ok ? { ok: true, value: new DOMDatePicker(options, runtime.value, controls) } : runtime;
}
class DOMDatePicker implements DatePickerConnection {
  readonly options: DatePickerOptions; readonly runtime: SemanticController<DatePickerState, DatePickerEvent, DatePickerCommand>; readonly controls: { value: boolean; highlighted: boolean; open: boolean };
  readonly #field: FacadeConnection<DateFieldConnection> | null;
  #syncingField = false;
  readonly #trigger = (): void => { this.handleEvent('toggle'); };
  readonly #keydown = (event: KeyboardEvent): void => { const semantic = keyEvent(event); if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); } };
  readonly #click = (event: MouseEvent): void => { const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-date-picker-id]') : null; if (target !== null && this.options.grid.contains(target)) { const parsed = target.dataset['datePickerId']?.split('-').map(Number); if (parsed?.length === 3) this.handleEvent({ type: 'select', value: { year: parsed[0] as number, month: parsed[1] as number, day: parsed[2] as number } }); } };
  public constructor(options: DatePickerOptions, runtime: SemanticController<DatePickerState, DatePickerEvent, DatePickerCommand>, controls: { value: boolean; highlighted: boolean; open: boolean }) {
    this.options = options;
    this.runtime = runtime;
    this.controls = controls;
    this.#field = options.input === undefined ? null : createDateField({
      input: options.input,
      defaultValue: runtime.getSnapshot().state.value,
      policies: {
        ...(options.policies?.min === undefined ? {} : { min: options.policies.min }),
        ...(options.policies?.max === undefined ? {} : { max: options.policies.max }),
        ...(options.policies?.unavailable === undefined ? {} : { unavailable: options.policies.unavailable }),
      },
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      ...(options.required === undefined ? {} : { required: options.required }),
      ...(options.label === undefined ? {} : { label: options.label }),
      onValueChange: (value) => {
        if (!this.#syncingField) this.handleEvent({ type: 'set-value', value });
      },
    });
    options.trigger.addEventListener('click', this.#trigger);
    options.grid.addEventListener('keydown', this.#keydown);
    options.grid.addEventListener('click', this.#click);
    options.root.setAttribute('role', 'dialog');
    options.root.setAttribute('aria-modal', 'false');
    options.grid.setAttribute('role', 'grid');
    setInteractionAttributes(options.trigger, options, { native: true });
    setInteractionAttributes(options.grid, options);
    this.refresh();
  }
  public getSnapshot(): RevisionSnapshot<DatePickerState> { return this.runtime.getSnapshot(); }
  public getMonth(): readonly (readonly DateValue[])[] { return unwrap(createDatePickerMonth(this.getSnapshot().state.view, this.options.policies?.weekStartsOn)); }
  public syncControlledValues(values: DatePickerControlledValues): Result<RevisionSnapshot<DatePickerState>> { if (this.controls.value !== (values.value !== undefined) || this.controls.highlighted !== (values.highlightedValue !== undefined) || this.controls.open !== (values.open !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date picker values must preserve their construction-time shape.' } }; const state = this.getSnapshot().state; const highlighted = this.controls.highlighted ? values.highlightedValue as DateValue : state.highlighted; const result = this.runtime.replace(createDatePickerState({ value: this.controls.value ? values.value as DateValue | null : state.value, highlighted, view: { year: highlighted.year, month: highlighted.month }, open: this.controls.open ? values.open as boolean : state.open })); if (result.ok) { this.refresh(); this.options.onUpdate?.(); } return result; }
  public setCellAttributes(element: HTMLElement, value: DateValue): void { const state = this.getSnapshot().state; const available = isDatePickerValueAvailable(value, this.options.policies); element.dataset['datePickerId'] = datePickerID(value); element.setAttribute('role', 'gridcell'); element.setAttribute('aria-selected', String(state.value !== null && compareDateValues(state.value, value) === 0)); element.setAttribute('aria-disabled', String(!available)); element.tabIndex = compareDateValues(state.highlighted, value) === 0 ? 0 : -1; }
  public handleEvent(event: DatePickerEvent): boolean { const result = this.runtime.handle(event); if (result.ok) { this.refresh(); this.options.onUpdate?.(); if (result.commands.some((command) => command.type === 'open-changed' && !command.open)) this.options.trigger.focus(); else if (result.commands.some((command) => command.type === 'highlight-changed')) queueMicrotask(() => this.options.grid.querySelector<HTMLElement>('[tabindex="0"]')?.focus()); } return result.ok; }
  public refresh(): void {
    const state = this.getSnapshot().state;
    this.options.root.hidden = !state.open;
    this.options.trigger.setAttribute('aria-haspopup', 'dialog');
    this.options.trigger.setAttribute('aria-expanded', String(state.open));
    if (this.options.label !== undefined) this.options.grid.setAttribute('aria-label', this.options.label);
    if (this.#field !== null && compareNullable(this.#field.getValue(), state.value) !== 0) {
      this.#syncingField = true;
      this.#field.handleEvent({ type: 'set-value', value: state.value });
      this.#syncingField = false;
    }
  }
  public disconnect(): void {
    this.#field?.disconnect();
    this.options.trigger.removeEventListener('click', this.#trigger);
    this.options.grid.removeEventListener('keydown', this.#keydown);
    this.options.grid.removeEventListener('click', this.#click);
  }
}
function keyEvent(event: KeyboardEvent): DatePickerEvent | null { if (event.altKey || event.ctrlKey || event.metaKey) return null; if (event.key === 'ArrowLeft') return 'previous-day'; if (event.key === 'ArrowRight') return 'next-day'; if (event.key === 'ArrowUp') return 'previous-week'; if (event.key === 'ArrowDown') return 'next-week'; if (event.key === 'Home') return 'start-of-week'; if (event.key === 'End') return 'end-of-week'; if (event.key === 'PageUp') return event.shiftKey ? 'previous-year' : 'previous-month'; if (event.key === 'PageDown') return event.shiftKey ? 'next-year' : 'next-month'; if (event.key === 'Enter' || event.key === ' ') return 'select-highlighted'; if (event.key === 'Escape') return 'close'; return null; }
function compareNullable(left: DateValue | null, right: DateValue | null): number { return left === null ? right === null ? 0 : -1 : right === null ? 1 : compareDateValues(left, right); }
