import { createFacadeConnection, createSemanticController, type FacadeConnection, type SemanticController } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError } from '@sectile/core';
import {
  tryCreateBoundedRange,
  type BoundedRangeInput,
  type QuantizedRange,
} from '@sectile/core/range';
import {
  applySliderEvent,
  tryCreateSliderState,
  type SliderCommand,
  type SliderEvent,
  type SliderState,
} from '@sectile/core/slider';
import type { RevisionResult, RevisionSnapshot } from '@sectile/core/revision';
import type { TerminalKeyboardInput } from './keyboard.js';

export type KeyboardInput = TerminalKeyboardInput;

export interface SliderEffect {
  readonly type: 'render-range-value';
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
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onValueChange?: (change: SliderValueChangeDetails) => void;
}

export type SliderControllerValueChangeHandler = NonNullable<SliderControllerOptions['onValueChange']>;

export interface SliderControlledValues {
  readonly value: number;
}

export interface SliderController {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<SliderState>;
  syncControlledValues(values: SliderControlledValues): Result<RevisionSnapshot<SliderState>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<SliderState, SliderEffect>;
}

export interface SliderTransitionDetails {
  readonly event: SliderEvent;
  readonly result: RevisionResult<SliderState, SliderEffect>;
}

export interface SliderConnectionOptions {
  readonly controller: SliderController;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onTransition?: (details: SliderTransitionDetails) => void;
  readonly onUpdate?: () => void;
}

export type SliderConnectionTransitionHandler = NonNullable<SliderConnectionOptions['onTransition']>;
export type SliderConnectionUpdateHandler = NonNullable<SliderConnectionOptions['onUpdate']>;

export interface SliderConnection {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<SliderState>;
  getValue(): string;
  syncControlledValues(values: SliderControlledValues): Result<RevisionSnapshot<SliderState>>;
  handleKeyboardInput(input: KeyboardInput): boolean;
}

export type SliderOptions = Omit<SliderControllerOptions, 'range'>
  & Omit<SliderConnectionOptions, 'controller'>
  & BoundedRangeInput;

export function createSliderController(
  options: SliderControllerOptions,
): Result<SliderController> {
  const initial = tryCreateSliderState(options.range, options.value ?? options.defaultValue ?? 0);
  if (!initial.ok) return initial;
  const controlled = options.value !== undefined;
  const page = options.page ?? 2;
  const runtime = createSemanticController<SliderState, SliderEvent, SliderCommand, SliderEffect>({
    initial,
    reducer: (state, event) => applySliderEvent(options.range, state, event, page),
    reconcile: (previous, proposed) => tryCreateSliderState(options.range, controlled ? previous.tick : proposed.tick),
    notify: (previous, proposed) => {
      if (previous.tick !== proposed.tick) {
        options.onValueChange?.(Object.freeze({ value: proposed.tick, previousValue: previous.tick }));
      }
    },
    toEffect: toSliderEffect,
    interaction: options,
    interactionIntent: () => 'mutate',
  });
  return runtime.ok ? { ok: true, value: new TerminalSliderController(options, runtime.value) } : runtime;
}

export function createSlider(options: SliderOptions): FacadeConnection<SliderConnection> {
  return unwrap(tryCreateSlider(options));
}

export function tryCreateSlider(options: SliderOptions): Result<FacadeConnection<SliderConnection>> {
  return createFacadeConnection(options, (options) => tryCreateSliderConnection(options));
}

function tryCreateSliderConnection(options: SliderOptions): Result<SliderConnection> {
  const range = tryCreateBoundedRange(options);
  if (!range.ok) return range;
  const controller = createSliderController({ ...options, range: range.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectSlider({ ...options, controller: controller.value }) };
}

export function connectSlider(options: SliderConnectionOptions): SliderConnection {
  return new TerminalSliderConnection(options);
}

export function toSliderEvent(input: KeyboardInput): SliderEvent | null {
  if (input.key === 'right' || input.key === 'up') return 'increment';
  if (input.key === 'left' || input.key === 'down') return 'decrement';
  if (input.key === 'page-up') return 'page-up';
  if (input.key === 'page-down') return 'page-down';
  if (input.key === 'home') return 'home';
  if (input.key === 'end') return 'end';
  return null;
}

export function toSliderEffect(command: SliderCommand): SliderEffect {
  return Object.freeze({ type: 'render-range-value', tick: command.tick });
}

class TerminalSliderConnection implements SliderConnection {
  public readonly range: QuantizedRange;
  readonly #controller: SliderController;
  readonly #onTransition: ((details: SliderTransitionDetails) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;

  public constructor(options: SliderConnectionOptions) {
    this.#controller = options.controller;
    this.range = options.controller.range;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
  }

  public getSnapshot(): RevisionSnapshot<SliderState> {
    return this.#controller.getSnapshot();
  }

  public getValue(): string {
    return this.range.valueAt(this.#controller.getSnapshot().state.tick) as string;
  }

  public syncControlledValues(
    values: SliderControlledValues,
  ): Result<RevisionSnapshot<SliderState>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) this.#onUpdate?.();
    return result;
  }

  public handleKeyboardInput(input: KeyboardInput): boolean {
    const event = toSliderEvent(input);
    if (event === null) return false;
    const result = this.#controller.handleKeyboardInput(input);
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }
}

class TerminalSliderController implements SliderController {
  public readonly range: QuantizedRange;
  readonly #range: QuantizedRange;
  readonly #controlled: boolean;
  readonly #runtime: SemanticController<SliderState, SliderEvent, SliderEffect>;

  public constructor(
    options: SliderControllerOptions,
    runtime: SemanticController<SliderState, SliderEvent, SliderEffect>,
  ) {
    this.range = options.range;
    this.#range = options.range;
    this.#controlled = options.value !== undefined;
    this.#runtime = runtime;
  }

  public getSnapshot(): RevisionSnapshot<SliderState> {
    return this.#runtime.getSnapshot();
  }

  public syncControlledValues(
    values: SliderControlledValues,
  ): Result<RevisionSnapshot<SliderState>> {
    const error = controlledInputError(this.#controlled, values);
    if (error !== null) return { ok: false, error };
    return this.#runtime.replace(tryCreateSliderState(this.#range, values.value));
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#runtime.getSnapshot().revision,
  ): RevisionResult<SliderState, SliderEffect> {
    const event = toSliderEvent(input);
    if (event === null) {
      return this.#runtime.reject('unsupported-terminal-key', 'Terminal keyboard input does not map to a slider semantic event.', { key: input.key });
    }
    return this.#runtime.handle(event, expectedRevision);
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
