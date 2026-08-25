import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError, StableID } from '@sectile/core';
import {
  tryCreateInteractionState,
  requireInteraction,
  type InteractionState,
} from '@sectile/core/interaction';
import {
  applyCalendarEvent,
  tryCreateCalendarState,
  type CalendarCommand,
  type CalendarEvent,
  type CalendarPolicies,
  type CalendarState,
} from '@sectile/core/calendar';
export type { CalendarPolicies } from '@sectile/core/calendar';
import { tryCreateGrid, type Grid } from '@sectile/core/grid';
import {
  tryCreateRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';
import { findDelegatedID } from './internal/delegated-event.js';
import { setInteractionAttributes } from './internal/interaction.js';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

export type CalendarEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-element'; readonly id: ID }
  | { readonly type: 'request-page'; readonly direction: -1 | 1; readonly from: ID | null };

export interface CalendarValueChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface CalendarHighlightChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface CalendarControllerOptions<ID extends StableID = StableID> {
  readonly grid: Grid<ID>;
  readonly disabled?: boolean;
  readonly policies?: CalendarPolicies<ID>;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly onValueChange?: (change: CalendarValueChangeDetails<ID>) => void;
  readonly onHighlightedValueChange?: (change: CalendarHighlightChangeDetails<ID>) => void;
}

export type CalendarControllerValueChangeHandler<ID extends StableID = StableID> = NonNullable<CalendarControllerOptions<ID>['onValueChange']>;
export type CalendarControllerHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<CalendarControllerOptions<ID>['onHighlightedValueChange']>;

export interface CalendarControlledValues<ID extends StableID = StableID> {
  readonly value?: ID | null;
  readonly highlightedValue?: ID | null;
}

export interface CalendarController<ID extends StableID = StableID> {
  readonly grid: Grid<ID>;
  getSnapshot(): RevisionSnapshot<CalendarState<ID>>;
  syncControlledValues(
    values: CalendarControlledValues<ID>,
  ): Result<RevisionSnapshot<CalendarState<ID>>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<CalendarState<ID>, CalendarEffect<ID>>;
  handleEvent(
    event: CalendarEvent<ID>,
    expectedRevision?: number,
  ): RevisionResult<CalendarState<ID>, CalendarEffect<ID>>;
}

export interface CalendarPageRequestDetails<ID extends StableID = StableID> {
  readonly direction: -1 | 1;
  readonly from: ID | null;
}

export interface CalendarTransitionDetails<ID extends StableID = StableID> {
  readonly event: CalendarEvent<ID>;
  readonly result: RevisionResult<CalendarState<ID>, CalendarEffect<ID>>;
}

export interface CalendarConnectionOptions<ID extends StableID = StableID> {
  readonly controller: CalendarController<ID>;
  readonly root: HTMLElement;
  readonly disabled?: boolean;
  readonly onPageRequest?: (details: CalendarPageRequestDetails<ID>) => void;
  readonly onTransition?: (details: CalendarTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
}

export type CalendarConnectionPageRequestHandler<ID extends StableID = StableID> = NonNullable<CalendarConnectionOptions<ID>['onPageRequest']>;
export type CalendarConnectionTransitionHandler<ID extends StableID = StableID> = NonNullable<CalendarConnectionOptions<ID>['onTransition']>;
export type CalendarConnectionUpdateHandler<ID extends StableID = StableID> = NonNullable<CalendarConnectionOptions<ID>['onUpdate']>;

export interface CalendarCellAttributes<ID extends StableID = StableID> {
  readonly id: ID;
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly disabled?: boolean;
}

export interface CalendarConnection<ID extends StableID = StableID> {
  readonly grid: Grid<ID>;
  getSnapshot(): RevisionSnapshot<CalendarState<ID>>;
  syncControlledValues(
    values: CalendarControlledValues<ID>,
  ): Result<RevisionSnapshot<CalendarState<ID>>>;
  setCalendarAttributes(label?: string): void;
  setCellAttributes(element: HTMLElement, attributes: CalendarCellAttributes<ID>): void;
  handleEvent(event: CalendarEvent<ID>): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  focusCurrent(): void;
  disconnect(): void;
}

export type CalendarOptions<ID extends StableID = StableID> =
  Omit<CalendarControllerOptions<ID>, 'grid'>
  & Omit<CalendarConnectionOptions<ID>, 'controller'>
  & { readonly rows: readonly (readonly ID[])[] };

export function createCalendarController<ID extends StableID>(
  options: CalendarControllerOptions<ID>,
): Result<CalendarController<ID>> {
  const value = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const current = options.highlightedValue !== undefined
    ? options.highlightedValue
    : options.defaultHighlightedValue ?? null;
  const initial = tryCreateCalendarState(options.grid, {
    selected: value === null ? [] : [value],
    anchor: value,
    current,
  });
  if (!initial.ok) return initial;
  const snapshot = tryCreateRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  const interaction = tryCreateInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new DOMCalendarController(options, snapshot.value, interaction.value) };
}

export function createCalendar<ID extends StableID>(
  options: CalendarOptions<ID>,
): FacadeConnection<CalendarConnection<ID>> {
  return unwrap(tryCreateCalendar(options));
}

export function tryCreateCalendar<ID extends StableID>(
  options: CalendarOptions<ID>,
): Result<FacadeConnection<CalendarConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateCalendarConnection(options));
}

function tryCreateCalendarConnection<ID extends StableID>(
  options: CalendarOptions<ID>,
): Result<CalendarConnection<ID>> {
  const grid = tryCreateGrid(options.rows);
  if (!grid.ok) return grid;
  const controller = createCalendarController({ ...options, grid: grid.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectCalendar({ ...options, controller: controller.value }) };
}

export function connectCalendar<ID extends StableID>(
  options: CalendarConnectionOptions<ID>,
): CalendarConnection<ID> {
  return new DOMCalendarConnection(options);
}

export function toCalendarEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
): CalendarEvent<ID> | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  if (input.key === 'ArrowLeft') return 'left';
  if (input.key === 'ArrowRight') return 'right';
  if (input.key === 'ArrowUp') return 'up';
  if (input.key === 'ArrowDown') return 'down';
  if (input.key === ' ' || input.key === 'Enter') return 'select';
  if (input.key === 'PageUp') return 'previous-page';
  if (input.key === 'PageDown') return 'next-page';
  return null;
}

export function toCalendarEffect<ID extends StableID>(
  command: CalendarCommand<ID>,
): CalendarEffect<ID> {
  return Object.freeze(command.type === 'focus'
    ? { type: 'focus-element', id: command.id }
    : { type: 'request-page', direction: command.direction, from: command.from });
}

class DOMCalendarConnection<ID extends StableID> implements CalendarConnection<ID> {
  public readonly grid: Grid<ID>;
  readonly #controller: CalendarController<ID>;
  readonly #root: HTMLElement;
  readonly #onPageRequest: ((details: CalendarPageRequestDetails<ID>) => void) | undefined;
  readonly #onTransition: ((details: CalendarTransitionDetails<ID>) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handleClick: (event: MouseEvent) => void;

  public constructor(options: CalendarConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.grid = options.controller.grid;
    this.#root = options.root;
    this.#onPageRequest = options.onPageRequest;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    setInteractionAttributes(this.#root, options);
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event)) event.preventDefault();
    };
    this.#handleClick = (event): void => {
      const id = findDelegatedID(event.target, this.#root, 'calendarId');
      if (id !== null) this.handleEvent({ type: 'select', id: id as ID });
    };
    this.#root.addEventListener('keydown', this.#handleKeydown);
    this.#root.addEventListener('click', this.#handleClick);
  }

  public getSnapshot(): RevisionSnapshot<CalendarState<ID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: CalendarControlledValues<ID>,
  ): Result<RevisionSnapshot<CalendarState<ID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result;
  }

  public setCalendarAttributes(label?: string): void {
    this.#root.setAttribute('role', 'grid');
    this.#root.setAttribute('aria-rowcount', String(this.grid.rowCount));
    this.#root.setAttribute('aria-colcount', String(this.grid.columnCount));
    if (label === undefined) this.#root.removeAttribute('aria-label');
    else this.#root.setAttribute('aria-label', label);
  }

  public setCellAttributes(
    element: HTMLElement,
    attributes: CalendarCellAttributes<ID>,
  ): void {
    const state = this.#controller.getSnapshot().state;
    element.dataset['calendarId'] = String(attributes.id);
    element.tabIndex = state.cursor.current === attributes.id ? 0 : -1;
    element.setAttribute('role', 'gridcell');
    element.setAttribute('aria-rowindex', String(attributes.rowIndex));
    element.setAttribute('aria-colindex', String(attributes.columnIndex));
    element.setAttribute('aria-selected', String(state.selection.has(attributes.id)));
    if (attributes.disabled === true) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  }

  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const input: KeyboardInput = {
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };
    const semanticEvent = toCalendarEvent<ID>(input);
    if (semanticEvent === null) return false;
    return this.handleEvent(semanticEvent);
  }

  public handleEvent(event: CalendarEvent<ID>): boolean {
    const result = this.#controller.handleEvent(event);
    if (result.ok) this.#applyEffects(result.commands);
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result.ok;
  }

  public focusCurrent(): void {
    queueMicrotask((): void => {
      const current = this.#controller.getSnapshot().state.cursor.current;
      if (current === null) {
        this.#root.focus();
        return;
      }
      for (const element of this.#root.querySelectorAll<HTMLElement>('[data-calendar-id]')) {
        if (element.dataset['calendarId'] !== String(current)) continue;
        element.focus();
        return;
      }
    });
  }

  public disconnect(): void {
    this.#root.removeEventListener('keydown', this.#handleKeydown);
    this.#root.removeEventListener('click', this.#handleClick);
  }

  #applyEffects(effects: readonly CalendarEffect<ID>[]): void {
    for (const effect of effects) {
      if (effect.type !== 'request-page') continue;
      this.#onPageRequest?.(Object.freeze({ direction: effect.direction, from: effect.from }));
    }
  }
}

class DOMCalendarController<ID extends StableID> implements CalendarController<ID> {
  public readonly grid: Grid<ID>;
  readonly #grid: Grid<ID>;
  readonly #policies: CalendarPolicies<ID>;
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #onValueChange: ((change: CalendarValueChangeDetails<ID>) => void) | undefined;
  readonly #onHighlightedValueChange:
    | ((change: CalendarHighlightChangeDetails<ID>) => void)
    | undefined;
  readonly #interaction: InteractionState;
  #snapshot: RevisionSnapshot<CalendarState<ID>>;

  public constructor(
    options: CalendarControllerOptions<ID>,
    snapshot: RevisionSnapshot<CalendarState<ID>>,
    interaction: InteractionState,
  ) {
    this.grid = options.grid;
    this.#grid = options.grid;
    this.#policies = options.policies ?? {};
    this.#valueControlled = options.value !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
    this.#interaction = interaction;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<CalendarState<ID>> {
    return this.#snapshot;
  }

  public syncControlledValues(
    values: CalendarControlledValues<ID>,
  ): Result<RevisionSnapshot<CalendarState<ID>>> {
    const error = controlledInputError(
      this.#valueControlled,
      this.#highlightControlled,
      values,
    );
    if (error !== null) return { ok: false, error };
    const selected = this.#valueControlled
      ? (values.value as ID | null)
      : selectedValue(this.#snapshot.state);
    const state = tryCreateCalendarState(this.#grid, {
      selected: selected === null ? [] : [selected],
      anchor: this.#valueControlled ? selected : this.#snapshot.state.selection.anchor,
      current: this.#highlightControlled
        ? (values.highlightedValue as ID | null)
        : this.#snapshot.state.cursor.current,
    });
    const snapshot = synchronizeControllerState(this.#snapshot, state);
    if (!snapshot.ok) return snapshot;
    this.#snapshot = snapshot.value;
    return snapshot;
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<CalendarState<ID>, CalendarEffect<ID>> {
    const event = toCalendarEvent<ID>(input);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-key',
        message: 'DOM keyboard input does not map to a calendar semantic event.',
        details: { key: input.key },
      });
    }
    return this.handleEvent(event, expectedRevision);
  }

  public handleEvent(
    event: CalendarEvent<ID>,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<CalendarState<ID>, CalendarEffect<ID>> {
    const permitted = requireInteraction(this.#interaction, 'navigate');
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyCalendarEvent(
        this.#grid,
        state,
        semanticEvent,
        this.#policies,
      ),
      (previous, proposed) => controlledState(
        this.#grid,
        previous,
        proposed,
        this.#valueControlled,
        this.#highlightControlled,
      ),
      (previous, proposed) => this.#notify(previous, proposed),
      toCalendarEffect,
    );
    if (result.ok) this.#snapshot = result.snapshot;
    return result;
  }

  #notify(previous: CalendarState<ID>, proposed: CalendarState<ID>): void {
    const previousValue = selectedValue(previous);
    const value = selectedValue(proposed);
    if (previousValue !== value) {
      this.#onValueChange?.(Object.freeze({ value, previousValue }));
    }
    if (previous.cursor.current !== proposed.cursor.current) {
      this.#onHighlightedValueChange?.(Object.freeze({
        value: proposed.cursor.current,
        previousValue: previous.cursor.current,
      }));
    }
  }
}


function controlledState<ID extends StableID>(
  grid: Grid<ID>,
  previous: CalendarState<ID>,
  proposed: CalendarState<ID>,
  valueControlled: boolean,
  highlightControlled: boolean,
): Result<CalendarState<ID>> {
  return tryCreateCalendarState(grid, {
    selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
    anchor: valueControlled ? previous.selection.anchor : proposed.selection.anchor,
    current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
  });
}

function selectedValue<ID extends StableID>(state: CalendarState<ID>): ID | null {
  return state.selection.selected[0] ?? null;
}

function controlledInputError<ID extends StableID>(
  valueControlled: boolean,
  highlightControlled: boolean,
  values: CalendarControlledValues<ID>,
): SectileError | null {
  if (valueControlled !== (values.value !== undefined)) {
    return {
      class: 'construction',
      code: valueControlled ? 'controlled-value-required' : 'uncontrolled-value-update',
      message: valueControlled
        ? 'Controlled calendar selection sync requires value.'
        : 'Uncontrolled calendar selection cannot be synchronized externally.',
    };
  }
  if (highlightControlled !== (values.highlightedValue !== undefined)) {
    return {
      class: 'construction',
      code: highlightControlled
        ? 'controlled-highlighted-value-required'
        : 'uncontrolled-highlighted-value-update',
      message: highlightControlled
        ? 'Controlled calendar highlight sync requires highlightedValue.'
        : 'Uncontrolled calendar highlight cannot be synchronized externally.',
    };
  }
  return null;
}
