import type { Result, SectileError, StableID } from '@sectile/primitives';
import {
  applyCalendarEvent,
  createCalendarState,
  type CalendarCommand,
  type CalendarEvent,
  type CalendarPolicies,
  type CalendarState,
} from '@sectile/primitives/calendar';
import type { Grid } from '@sectile/primitives/grid';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/primitives/revision';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';

export interface KeyboardInput {
  readonly key: string;
}

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
  getSnapshot(): RevisionSnapshot<CalendarState<ID>>;
  syncControlledValues(
    values: CalendarControlledValues<ID>,
  ): Result<RevisionSnapshot<CalendarState<ID>>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<CalendarState<ID>, CalendarEffect<ID>>;
}

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
  return { ok: true, value: new TerminalCalendarController(options, snapshot.value) };
}

export function toCalendarEvent(input: KeyboardInput): CalendarEvent | null {
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

class TerminalCalendarController<ID extends StableID> implements CalendarController<ID> {
  readonly #grid: Grid<ID>;
  readonly #policies: CalendarPolicies<ID>;
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #onValueChange: ((change: CalendarValueChangeDetails<ID>) => void) | undefined;
  readonly #onHighlightedValueChange:
    | ((change: CalendarHighlightChangeDetails<ID>) => void)
    | undefined;
  #snapshot: RevisionSnapshot<CalendarState<ID>>;

  public constructor(
    options: CalendarControllerOptions<ID>,
    snapshot: RevisionSnapshot<CalendarState<ID>>,
  ) {
    this.#grid = options.grid;
    this.#policies = options.policies ?? {};
    this.#valueControlled = options.value !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
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
    const event = toCalendarEvent(input);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-terminal-key',
        message: 'Terminal keyboard input does not map to a calendar semantic event.',
        details: { key: input.key },
      });
    }
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
