import type { Result, SectileError } from '@sectile/primitives';
import type { QuantizedRange } from '@sectile/primitives/range';
import {
  applySliderEvent,
  createSliderState,
  type SliderCommand,
  type SliderEvent,
  type SliderState,
} from '@sectile/primitives/slider';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/primitives/revision';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

export interface SliderEffect {
  readonly type: 'set-range-value';
  readonly tick: number;
}

export interface SliderValueChangeDetails {
  readonly value: number;
  readonly previousValue: number;
}

export interface SliderControllerOptions {
  readonly range: QuantizedRange;
  readonly page?: number;
  readonly value?: number;
  readonly defaultValue?: number;
  readonly onValueChange?: (change: SliderValueChangeDetails) => void;
}

export interface SliderControlledValues {
  readonly value: number;
}

export interface SliderController {
  getSnapshot(): RevisionSnapshot<SliderState>;
  syncControlledValues(values: SliderControlledValues): Result<RevisionSnapshot<SliderState>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<SliderState, SliderEffect>;
}

export function createSliderController(
  options: SliderControllerOptions,
): Result<SliderController> {
  const initial = createSliderState(options.range, options.value ?? options.defaultValue ?? 0);
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new DOMSliderController(options, snapshot.value) };
}

export function toSliderEvent(input: KeyboardInput): SliderEvent | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  if (input.key === 'ArrowRight' || input.key === 'ArrowUp') return 'increment';
  if (input.key === 'ArrowLeft' || input.key === 'ArrowDown') return 'decrement';
  if (input.key === 'PageUp') return 'page-up';
  if (input.key === 'PageDown') return 'page-down';
  if (input.key === 'Home') return 'home';
  if (input.key === 'End') return 'end';
  return null;
}

export function toSliderEffect(command: SliderCommand): SliderEffect {
  return Object.freeze({ type: 'set-range-value', tick: command.tick });
}

class DOMSliderController implements SliderController {
  readonly #range: QuantizedRange;
  readonly #page: number;
  readonly #controlled: boolean;
  readonly #onValueChange: ((change: SliderValueChangeDetails) => void) | undefined;
  #snapshot: RevisionSnapshot<SliderState>;

  public constructor(
    options: SliderControllerOptions,
    snapshot: RevisionSnapshot<SliderState>,
  ) {
    this.#range = options.range;
    this.#page = options.page ?? 2;
    this.#controlled = options.value !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<SliderState> {
    return this.#snapshot;
  }

  public syncControlledValues(
    values: SliderControlledValues,
  ): Result<RevisionSnapshot<SliderState>> {
    const error = controlledInputError(this.#controlled, values);
    if (error !== null) return { ok: false, error };
    const snapshot = synchronizeControllerState(
      this.#snapshot,
      createSliderState(this.#range, values.value),
    );
    if (!snapshot.ok) return snapshot;
    this.#snapshot = snapshot.value;
    return snapshot;
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<SliderState, SliderEffect> {
    const event = toSliderEvent(input);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-key',
        message: 'DOM keyboard input does not map to a slider semantic event.',
        details: { key: input.key },
      });
    }
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applySliderEvent(
        this.#range,
        state,
        semanticEvent,
        this.#page,
      ),
      (previous, proposed) => createSliderState(
        this.#range,
        this.#controlled ? previous.tick : proposed.tick,
      ),
      (previous, proposed) => {
        if (previous.tick !== proposed.tick) {
          this.#onValueChange?.(Object.freeze({
            value: proposed.tick,
            previousValue: previous.tick,
          }));
        }
      },
      toSliderEffect,
    );
    if (result.ok) this.#snapshot = result.snapshot;
    return result;
  }
}

function controlledInputError(
  controlled: boolean,
  values: SliderControlledValues,
): SectileError | null {
  if (controlled) return null;
  return {
    class: 'construction',
    code: 'uncontrolled-value-update',
    message: 'Uncontrolled slider value cannot be synchronized externally.',
    details: { value: values.value },
  };
}
