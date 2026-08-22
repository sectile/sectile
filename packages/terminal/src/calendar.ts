import type { Result, SectileError, StableID } from '@sectile/core';
import {
  createInteractionState,
  requireInteraction,
  type InteractionState,
} from '@sectile/core/interaction';
import {
  applyCalendarEvent,
  createCalendarState,
  type CalendarCommand,
  type CalendarEvent,
  type CalendarPolicies,
  type CalendarState,
} from '@sectile/core/calendar';
import { createGrid, type Grid } from '@sectile/core/grid';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type KeyboardInput = TerminalKeyboardInput;

export type CalendarEffect<ID extends StableID = StableID> =
  | { readonly type: 'move-highlight'; readonly id: ID }
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
  readonly disabled?: boolean;
  readonly onPageRequest?: (details: CalendarPageRequestDetails<ID>) => void;
  readonly onTransition?: (details: CalendarTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
}

export interface CalendarConnection<ID extends StableID = StableID> {
  readonly grid: Grid<ID>;
  getSnapshot(): RevisionSnapshot<CalendarState<ID>>;
  syncControlledValues(
    values: CalendarControlledValues<ID>,
  ): Result<RevisionSnapshot<CalendarState<ID>>>;
  handleKeyboardInput(input: KeyboardInput): boolean;
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
  const initial = createCalendarState(options.grid, {
    selected: value === null ? [] : [value],
    anchor: value,
    current,
  });
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  const interaction = createInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new TerminalCalendarController(options, snapshot.value, interaction.value) };
}

export function createCalendar<ID extends StableID>(
  options: CalendarOptions<ID>,
): Result<CalendarConnection<ID>> {
  const grid = createGrid(options.rows);
  if (!grid.ok) return grid;
  const controller = createCalendarController({ ...options, grid: grid.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectCalendar({ ...options, controller: controller.value }) };
}

export function connectCalendar<ID extends StableID>(
  options: CalendarConnectionOptions<ID>,
): CalendarConnection<ID> {
  return new TerminalCalendarConnection(options);
}

export function toCalendarEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
): CalendarEvent<ID> | null {
  if (input.key === 'left') return 'left';
  if (input.key === 'right') return 'right';
  if (input.key === 'up') return 'up';
  if (input.key === 'down') return 'down';
  if (input.key === 'space' || input.key === 'enter') return 'select';
  if (input.key === 'page-up') return 'previous-page';
  if (input.key === 'page-down') return 'next-page';
  return null;
}

export function toCalendarEffect<ID extends StableID>(
  command: CalendarCommand<ID>,
): CalendarEffect<ID> {
  return Object.freeze(command.type === 'focus'
    ? { type: 'move-highlight', id: command.id }
    : { type: 'request-page', direction: command.direction, from: command.from });
}

class TerminalCalendarConnection<ID extends StableID> implements CalendarConnection<ID> {
  public readonly grid: Grid<ID>;
  readonly #controller: CalendarController<ID>;
  readonly #onPageRequest: ((details: CalendarPageRequestDetails<ID>) => void) | undefined;
  readonly #onTransition: ((details: CalendarTransitionDetails<ID>) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;

  public constructor(options: CalendarConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.grid = options.controller.grid;
    this.#onPageRequest = options.onPageRequest;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
  }

  public getSnapshot(): RevisionSnapshot<CalendarState<ID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: CalendarControlledValues<ID>,
  ): Result<RevisionSnapshot<CalendarState<ID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) this.#onUpdate?.();
    return result;
  }

  public handleKeyboardInput(input: KeyboardInput): boolean {
    const event = toCalendarEvent<ID>(input);
    if (event === null) return false;
    const result = this.#controller.handleKeyboardInput(input);
    if (result.ok) {
      for (const effect of result.commands) {
        if (effect.type !== 'request-page') continue;
        this.#onPageRequest?.(Object.freeze({ direction: effect.direction, from: effect.from }));
      }
    }
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }
}

class TerminalCalendarController<ID extends StableID> implements CalendarController<ID> {
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
    const state = createCalendarState(this.#grid, {
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
        code: 'unsupported-terminal-key',
        message: 'Terminal keyboard input does not map to a calendar semantic event.',
        details: { key: input.key },
      });
    }
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
  return createCalendarState(grid, {
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
