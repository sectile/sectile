import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError } from '@sectile/core';
import { createInteractionState, requireInteraction, type InteractionState } from '@sectile/core/interaction';
import {
  createBoundedRange,
  type BoundedRangeInput,
  type QuantizedRange,
} from '@sectile/core/range';
import {
  applySliderEvent,
  createSliderState,
  type SliderCommand,
  type SliderEvent,
  type SliderState,
} from '@sectile/core/slider';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';
import { setInteractionAttributes } from './internal/interaction.js';

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
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onValueChange?: (change: SliderValueChangeDetails) => void;
}

export interface SliderRangeValueChangeDetails {
  readonly value: string;
  readonly previousValue: string;
}

export type SliderRangeControllerOptions = Omit<SliderControllerOptions, 'range' | 'value' | 'defaultValue' | 'onValueChange'>
  & BoundedRangeInput
  & {
    readonly value?: string;
    readonly defaultValue?: string;
    readonly onValueChange?: (change: SliderRangeValueChangeDetails) => void;
  };

export interface SliderAttributeOptions {
  readonly label?: string;
  readonly role?: 'slider' | 'separator';
  readonly orientation?: 'horizontal' | 'vertical';
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly formatValue?: (value: string) => string;
}

export interface SliderInputOptions {
  readonly name?: string;
  readonly form?: string;
  readonly disabled?: boolean;
}

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
  handleEvent(
    event: SliderEvent,
    expectedRevision?: number,
  ): RevisionResult<SliderState, SliderEffect>;
}

export interface SliderTransitionDetails {
  readonly event: SliderEvent;
  readonly result: RevisionResult<SliderState, SliderEffect>;
}

export interface SliderConnectionOptions {
  readonly controller: SliderController;
  readonly root: HTMLElement;
  readonly track?: HTMLElement;
  readonly label?: string;
  readonly role?: 'slider' | 'separator';
  readonly orientation?: 'horizontal' | 'vertical';
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly formatValue?: (value: string) => string;
  readonly onTransition?: (details: SliderTransitionDetails) => void;
  readonly onUpdate?: () => void;
}

export interface SliderConnection {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<SliderState>;
  getValue(): string;
  syncControlledValues(values: SliderControlledValues): Result<RevisionSnapshot<SliderState>>;
  refreshAttributes(): void;
  handleEvent(event: SliderEvent): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  disconnect(): void;
}

export type SliderOptions = Omit<SliderControllerOptions, 'range'>
  & Omit<SliderConnectionOptions, 'controller'>
  & BoundedRangeInput;

export function createSliderController(
  options: SliderControllerOptions,
): Result<SliderController> {
  const initial = createSliderState(options.range, options.value ?? options.defaultValue ?? 0);
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  const interaction = createInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new DOMSliderController(options, interaction.value, snapshot.value) };
}

export function createSliderControllerFromRange(options: SliderRangeControllerOptions): Result<SliderController> {
  const range = createBoundedRange(options);
  if (!range.ok) return range;
  const current = options.value ?? options.defaultValue ?? range.value.lower;
  const tick = range.value.tickOf(current);
  if (tick === null) return { ok: false, error: {
    class: 'construction',
    code: 'slider-value-off-range',
    message: 'Slider value must be an exact value in the configured range.',
    details: { value: current },
  } };
  return createSliderController({
    range: range.value,
    ...(options.page === undefined ? {} : { page: options.page }),
    ...(options.value === undefined ? { defaultValue: tick } : { value: tick }),
    ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
    ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
    onValueChange: ({ value, previousValue }) => options.onValueChange?.({
      value: range.value.valueAt(value) as string,
      previousValue: range.value.valueAt(previousValue) as string,
    }),
  });
}

export function getSliderAttributes(
  controller: SliderController,
  options: SliderAttributeOptions = {},
): Readonly<Record<string, string | number | undefined>> {
  const value = controller.range.valueAt(controller.getSnapshot().state.tick) as string;
  return Object.freeze({
    role: options.role ?? 'slider',
    tabindex: options.disabled === true ? -1 : 0,
    'aria-valuemin': controller.range.lower,
    'aria-valuemax': controller.range.upper,
    'aria-valuenow': value,
    'aria-valuetext': options.formatValue?.(value) ?? value,
    'aria-orientation': options.orientation ?? 'horizontal',
    'aria-label': options.label,
    'aria-disabled': options.disabled === true ? 'true' : undefined,
    'aria-readonly': options.readOnly === true ? 'true' : undefined,
    'data-scope': 'slider',
    'data-part': 'thumb',
    'data-disabled': options.disabled === true ? '' : undefined,
    'data-readonly': options.readOnly === true ? '' : undefined,
  });
}

export function getSliderInputAttributes(
  controller: SliderController,
  options: SliderInputOptions = {},
): Readonly<Record<string, string | number | boolean | undefined>> {
  const value = controller.range.valueAt(controller.getSnapshot().state.tick) as string;
  return Object.freeze({
    type: 'range',
    name: options.name,
    form: options.form,
    min: controller.range.lower,
    max: controller.range.upper,
    step: controller.range.step,
    value,
    disabled: options.disabled ?? false,
    tabindex: -1,
    'aria-hidden': 'true',
  });
}

export function createSlider(options: SliderOptions): FacadeConnection<SliderConnection> {
  return unwrap(tryCreateSlider(options));
}

export function tryCreateSlider(options: SliderOptions): Result<FacadeConnection<SliderConnection>> {
  return createFacadeConnection(options, (options) => tryCreateSliderConnection(options));
}

function tryCreateSliderConnection(options: SliderOptions): Result<SliderConnection> {
  const range = createBoundedRange(options);
  if (!range.ok) return range;
  const controller = createSliderController({ ...options, range: range.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectSlider({ ...options, controller: controller.value }) };
}

export function connectSlider(options: SliderConnectionOptions): SliderConnection {
  return new DOMSliderConnection(options);
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

class DOMSliderConnection implements SliderConnection {
  public readonly range: QuantizedRange;
  readonly #controller: SliderController;
  readonly #root: HTMLElement;
  readonly #track: HTMLElement;
  readonly #label: string | undefined;
  readonly #role: 'slider' | 'separator';
  readonly #orientation: 'horizontal' | 'vertical';
  readonly #formatValue: (value: string) => string;
  readonly #disabled: boolean;
  readonly #readOnly: boolean;
  readonly #onTransition: ((details: SliderTransitionDetails) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handlePointer: (event: PointerEvent) => void;
  readonly #handlePointerUp: (event: PointerEvent) => void;
  #dragging = false;

  public constructor(options: SliderConnectionOptions) {
    this.#controller = options.controller;
    this.range = options.controller.range;
    this.#root = options.root;
    this.#track = options.track ?? options.root;
    this.#label = options.label;
    this.#role = options.role ?? 'slider';
    this.#orientation = options.orientation ?? 'horizontal';
    this.#formatValue = options.formatValue ?? ((value) => value);
    this.#disabled = options.disabled ?? false;
    this.#readOnly = options.readOnly ?? false;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event)) event.preventDefault();
    };
    this.#handlePointer = (event): void => {
      if (event.type === 'pointerdown') {
        this.#dragging = true;
        this.#track.setPointerCapture?.(event.pointerId);
      } else if (!this.#dragging) {
        return;
      }
      const rect = this.#track.getBoundingClientRect();
      const extent = this.#orientation === 'horizontal' ? rect.width : rect.height;
      if (extent <= 0) return;
      const rawRatio = this.#orientation === 'horizontal'
        ? (event.clientX - rect.left) / rect.width
        : this.#role === 'separator'
          ? (event.clientY - rect.top) / rect.height
          : (rect.bottom - event.clientY) / rect.height;
      const ratio = Math.min(1, Math.max(0, rawRatio));
      const tick = Math.round(ratio * this.range.count);
      const semanticEvent: SliderEvent = { type: 'set-tick', tick };
      if (this.handleEvent(semanticEvent)) event.preventDefault();
    };
    this.#handlePointerUp = (event): void => {
      if (!this.#dragging) return;
      this.#dragging = false;
      this.#track.releasePointerCapture?.(event.pointerId);
    };
    this.#root.addEventListener('keydown', this.#handleKeydown);
    this.#track.addEventListener('pointerdown', this.#handlePointer);
    this.#track.addEventListener('pointermove', this.#handlePointer);
    this.#track.addEventListener('pointerup', this.#handlePointerUp);
    this.#track.addEventListener('pointercancel', this.#handlePointerUp);
    setInteractionAttributes(this.#root, options, { readOnly: this.#role === 'slider' });
    this.refreshAttributes();
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
    if (result.ok) {
      this.refreshAttributes();
      this.#onUpdate?.();
    }
    return result;
  }

  public refreshAttributes(): void {
    applyAttributes(this.#root, getSliderAttributes(this.#controller, {
      role: this.#role,
      orientation: this.#orientation,
      ...(this.#label === undefined ? {} : { label: this.#label }),
      formatValue: this.#formatValue,
      disabled: this.#disabled,
      readOnly: this.#readOnly,
    }));
  }

  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const input: KeyboardInput = {
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };
    const semanticEvent = this.#role === 'separator' && this.#orientation === 'vertical'
      ? toVerticalSplitterEvent(input)
      : toSliderEvent(input);
    if (semanticEvent === null) return false;
    return this.handleEvent(semanticEvent);
  }

  public handleEvent(event: SliderEvent): boolean {
    const result = this.#controller.handleEvent(event);
    if (result.ok) this.refreshAttributes();
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }

  public disconnect(): void {
    this.#root.removeEventListener('keydown', this.#handleKeydown);
    this.#track.removeEventListener('pointerdown', this.#handlePointer);
    this.#track.removeEventListener('pointermove', this.#handlePointer);
    this.#track.removeEventListener('pointerup', this.#handlePointerUp);
    this.#track.removeEventListener('pointercancel', this.#handlePointerUp);
  }
}

function applyAttributes(element: HTMLElement, attributes: Readonly<Record<string, string | number | undefined>>): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'tabindex') { element.tabIndex = Number(value ?? -1); continue; }
    if (value === undefined) element.removeAttribute(name);
    else element.setAttribute(name, String(value));
  }
}

function toVerticalSplitterEvent(input: KeyboardInput): SliderEvent | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  if (input.key === 'ArrowUp') return 'decrement';
  if (input.key === 'ArrowDown') return 'increment';
  return toSliderEvent(input);
}

class DOMSliderController implements SliderController {
  public readonly range: QuantizedRange;
  readonly #range: QuantizedRange;
  readonly #page: number;
  readonly #controlled: boolean;
  readonly #interaction: InteractionState;
  readonly #onValueChange: ((change: SliderValueChangeDetails) => void) | undefined;
  #snapshot: RevisionSnapshot<SliderState>;

  public constructor(
    options: SliderControllerOptions,
    interaction: InteractionState,
    snapshot: RevisionSnapshot<SliderState>,
  ) {
    this.range = options.range;
    this.#range = options.range;
    this.#page = options.page ?? 2;
    this.#controlled = options.value !== undefined;
    this.#interaction = interaction;
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
    return this.handleEvent(event, expectedRevision);
  }

  public handleEvent(
    event: SliderEvent,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<SliderState, SliderEffect> {
    const permitted = requireInteraction(this.#interaction, 'mutate');
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
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
