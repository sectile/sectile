import type { RevisionSnapshot } from '@sectile/core/revision';
import { permitsInteraction } from '@sectile/core/interaction';
import type { TextEditingState, TextEvent } from '@sectile/core/text';
import { setFieldValidity, setInteractionAttributes } from '../../interaction/attributes.js';
import { DOMTextElementBinding } from '../../text/element-binding.js';
import { nativeFieldSelectionEvent, synchronizeControlledFieldInput, synchronizeFieldInputSelection } from '../../text/controlled-input.js';
import { toTextEvent, type TextInput } from '../../text.js';
import { createDOMTemporalController, type DOMTemporalController, type DOMTemporalResult } from './result.js';
import { optionalInputState, rangeFormats } from './range-field-options.js';

type Endpoint = 'start' | 'end';
interface RangeValue<Value> { readonly start: Value; readonly end: Value }
interface EndpointState<Value, Format> {
  readonly value: Value | null;
  readonly inputState: TextEditingState;
  readonly format?: Format;
}
interface RangeState<Value, Range, Format> {
  readonly value: Range | null;
  readonly start: EndpointState<Value, Format>;
  readonly end: EndpointState<Value, Format>;
  readonly active: Endpoint;
}
type FieldEvent<Value> = 'increment-segment' | 'decrement-segment' | 'commit' | 'cancel'
  | { readonly type: 'text'; readonly event: TextEvent }
  | { readonly type: 'set-value'; readonly value: Value | null };
type RangeEvent<Value> = 'cancel'
  | { readonly type: 'focus'; readonly endpoint: Endpoint }
  | { readonly type: 'field'; readonly endpoint: Endpoint; readonly event: FieldEvent<Value> };
type RangeCommand<Range> = { readonly type: 'range-committed'; readonly value: Range | null }
  | { readonly type: 'input-state-changed'; readonly endpoint: Endpoint; readonly value: TextEditingState }
  | { readonly type: 'focus-endpoint'; readonly endpoint: Endpoint };
interface StateInput<Value, Range, Format> {
  readonly value?: Range | null;
  readonly startValue?: Value | null;
  readonly endValue?: Value | null;
  readonly startInputState?: TextEditingState;
  readonly endInputState?: TextEditingState;
  readonly startFormat?: Format;
  readonly endFormat?: Format;
  readonly active?: Endpoint;
}
interface ControlledValues<Range> {
  readonly value?: Range | null;
  readonly startInputState?: TextEditingState;
  readonly endInputState?: TextEditingState;
}
interface FieldOptions<Range, State, Format, Policies> extends ControlledValues<Range> {
  readonly startInput: HTMLInputElement;
  readonly endInput: HTMLInputElement;
  readonly defaultValue?: Range | null;
  readonly defaultState?: State;
  readonly format?: Format;
  readonly defaultStartInputState?: TextEditingState;
  readonly defaultEndInputState?: TextEditingState;
  readonly policies?: Policies;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly onValueChange?: (value: Range | null) => void;
  readonly onStartInputStateChange?: (value: TextEditingState) => void;
  readonly onEndInputStateChange?: (value: TextEditingState) => void;
  readonly onUpdate?: () => void;
}
export interface RangeFieldAdapter<Value, Range extends RangeValue<Value>, State extends RangeState<Value, Range, Format>, Format, Policies extends { readonly required?: boolean }> {
  readonly initial: (input: StateInput<Value, Range, Format>) => DOMTemporalResult<State>;
  readonly reduce: (state: State, event: RangeEvent<Value>, options: FieldOptions<Range, State, Format, Policies>) => DOMTemporalResult<{ readonly state: State; readonly commands: readonly RangeCommand<Range>[] }>;
  readonly format: (value: Value, format?: Format) => string;
  readonly placeholder: (format?: Format) => string;
  readonly inputMode: (format?: Format) => 'numeric' | 'text';
  readonly controlledShapeMessage: string;
}
interface Connection<Value, Range, State> {
  getSnapshot(): RevisionSnapshot<State>;
  getValue(): Range | null;
  syncControlledValues(values: ControlledValues<Range>): DOMTemporalResult<RevisionSnapshot<State>>;
  handleEvent(event: RangeEvent<Value>): boolean;
  refresh(): void;
  disconnect(): void;
}
interface ControlledShape { readonly value: boolean; readonly start: boolean; readonly end: boolean }

/** Shared native effects only. Each adapter supplies its canonical Temporal reducer. */
export function constructRangeField<Value, Range extends RangeValue<Value>, State extends RangeState<Value, Range, Format>, Format, Policies extends { readonly required?: boolean }>(
  adapter: RangeFieldAdapter<Value, Range, State, Format, Policies>,
  options: FieldOptions<Range, State, Format, Policies>,
): DOMTemporalResult<Connection<Value, Range, State>> {
  const controlled = { value: options.value !== undefined, start: options.startInputState !== undefined, end: options.endInputState !== undefined };
  const restored = options.defaultState;
  const runtime = createDOMTemporalController<State, RangeEvent<Value>, RangeCommand<Range>, RangeCommand<Range>>({
    initial: adapter.initial({
      value: options.value !== undefined ? options.value : options.defaultValue ?? null,
      ...(restored === undefined || controlled.value ? {} : { startValue: restored.start.value, endValue: restored.end.value }),
      ...optionalInputState('startInputState', options.startInputState ?? options.defaultStartInputState ?? restored?.start.inputState),
      ...optionalInputState('endInputState', options.endInputState ?? options.defaultEndInputState ?? restored?.end.inputState),
      ...(restored === undefined ? {} : { active: restored.active }),
      ...rangeFormats(options.format, restored),
    }),
    reducer: (state, event) => adapter.reduce(state, event, options),
    reconcile: (previous, proposed) => adapter.initial({
      startValue: controlled.value ? previous.start.value : proposed.start.value,
      endValue: controlled.value ? previous.end.value : proposed.end.value,
      startInputState: controlled.start ? previous.start.inputState : proposed.start.inputState,
      endInputState: controlled.end ? previous.end.inputState : proposed.end.inputState,
      active: proposed.active, ...rangeFormats(options.format, previous),
    }),
    notify: [
      (previous, proposed) => { if (previous.start.inputState !== proposed.start.inputState) options.onStartInputStateChange?.(proposed.start.inputState); },
      (previous, proposed) => { if (previous.end.inputState !== proposed.end.inputState) options.onEndInputStateChange?.(proposed.end.inputState); },
    ],
    toEffect: command => command, interaction: options,
    interactionIntent: event => typeof event === 'object' && event.type === 'focus' ? 'navigate' : 'mutate',
  });
  return runtime.ok ? { ok: true, value: new DOMRangeField(adapter, options, runtime.value, controlled) } : runtime;
}

class DOMRangeField<Value, Range extends RangeValue<Value>, State extends RangeState<Value, Range, Format>, Format, Policies extends { readonly required?: boolean }> implements Connection<Value, Range, State> {
  readonly #adapter: RangeFieldAdapter<Value, Range, State, Format, Policies>;
  readonly #options: FieldOptions<Range, State, Format, Policies>;
  readonly #runtime: DOMTemporalController<State, RangeEvent<Value>, RangeCommand<Range>>;
  readonly #controlled: ControlledShape;
  readonly #editable: boolean;
  readonly #bindings: Partial<Record<Endpoint, DOMTextElementBinding>> = {};
  readonly #keydown: Record<Endpoint, (event: Event) => void>;
  readonly #blur: Record<Endpoint, () => void>;
  readonly #focus: Record<Endpoint, () => void>;
  #active = true;

  constructor(adapter: RangeFieldAdapter<Value, Range, State, Format, Policies>, options: FieldOptions<Range, State, Format, Policies>,
    runtime: DOMTemporalController<State, RangeEvent<Value>, RangeCommand<Range>>, controlled: ControlledShape) {
    this.#adapter = adapter; this.#options = options; this.#runtime = runtime; this.#controlled = controlled;
    this.#editable = permitsInteraction({ disabled: options.disabled ?? false, readOnly: options.readOnly ?? false }, 'mutate');
    this.#keydown = { start: event => this.#key('start', event), end: event => this.#key('end', event) };
    this.#blur = { start: () => this.#commitOrCancel('start'), end: () => this.#commitOrCancel('end') };
    this.#focus = { start: () => { this.handleEvent({ type: 'focus', endpoint: 'start' }); }, end: () => { this.handleEvent({ type: 'focus', endpoint: 'end' }); } };
    try {
      for (const endpoint of ['start', 'end'] as const) {
        const input = this.#input(endpoint);
        this.#bindings[endpoint] = new DOMTextElementBinding({
          element: input, getState: () => this.getSnapshot().state[endpoint].inputState,
          dispatch: native => this.#text(endpoint, native),
        });
        input.addEventListener('keydown', this.#keydown[endpoint]);
        input.addEventListener('blur', this.#blur[endpoint]);
        input.addEventListener('focus', this.#focus[endpoint]);
      }
      this.refresh();
    } catch (error) { this.disconnect(); throw error; }
  }
  getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  getValue(): Range | null { return this.getSnapshot().state.value; }
  syncControlledValues(values: ControlledValues<Range>): DOMTemporalResult<RevisionSnapshot<State>> {
    if (this.#controlled.value !== (values.value !== undefined) || this.#controlled.start !== (values.startInputState !== undefined) || this.#controlled.end !== (values.endInputState !== undefined)) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: this.#adapter.controlledShapeMessage } };
    }
    const current = this.getSnapshot().state;
    const value = this.#controlled.value ? values.value : current.value;
    const formats = rangeFormats(this.#options.format, current);
    // Admit endpoints before formatting; an incomplete uncontrolled range still owns its lone value.
    const admitted = this.#adapter.initial({
      startValue: this.#controlled.value ? value?.start ?? null : current.start.value,
      endValue: this.#controlled.value ? value?.end ?? null : current.end.value,
      ...optionalInputState('startInputState', this.#controlled.start ? values.startInputState : current.start.inputState),
      ...optionalInputState('endInputState', this.#controlled.end ? values.endInputState : current.end.inputState),
      active: current.active, ...formats,
    });
    if (!admitted.ok) return admitted;
    const startValue = admitted.value.start.value, endValue = admitted.value.end.value;
    const startInputState = this.#controlled.start ? values.startInputState : synchronizeControlledFieldInput(
      synchronizeFieldInputSelection(current.start.inputState, this.#options.startInput),
      current.start.value === null ? '' : this.#adapter.format(current.start.value, current.start.format),
      startValue === null ? '' : this.#adapter.format(startValue, formats.startFormat));
    const endInputState = this.#controlled.end ? values.endInputState : synchronizeControlledFieldInput(
      synchronizeFieldInputSelection(current.end.inputState, this.#options.endInput),
      current.end.value === null ? '' : this.#adapter.format(current.end.value, current.end.format),
      endValue === null ? '' : this.#adapter.format(endValue, formats.endFormat));
    const result = this.#runtime.replace(this.#adapter.initial({
      startValue, endValue, ...optionalInputState('startInputState', startInputState), ...optionalInputState('endInputState', endInputState),
      active: current.active, ...formats,
    }));
    if (result.ok) { this.refresh(); this.#options.onUpdate?.(); }
    return result;
  }
  handleEvent(event: RangeEvent<Value>): boolean {
    if (!this.#active) return false;
    const result = this.#runtime.handle(event);
    if (typeof event === 'object' && event.type === 'field') setFieldValidity(this.#input(event.endpoint), result);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'range-committed') this.#options.onValueChange?.(command.value);
        if (command.type === 'focus-endpoint') this.#input(command.endpoint).focus();
      }
      this.refresh(); this.#options.onUpdate?.();
    }
    return result.ok;
  }
  refresh(): void {
    if (!this.#active) return;
    const state = this.getSnapshot().state;
    for (const endpoint of ['start', 'end'] as const) {
      const input = this.#input(endpoint), format = state[endpoint].format;
      input.type = 'text'; input.inputMode = this.#adapter.inputMode(format);
      input.placeholder = this.#adapter.placeholder(format);
      input.required = this.#options.required ?? this.#options.policies?.required ?? false;
      setInteractionAttributes(input, this.#options, true, true);
      const label = endpoint === 'start' ? this.#options.startLabel : this.#options.endLabel;
      if (label !== undefined) input.setAttribute('aria-label', label);
      this.#bindings[endpoint]?.render();
    }
  }
  disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    for (const endpoint of ['start', 'end'] as const) {
      const input = this.#input(endpoint);
      this.#bindings[endpoint]?.disconnect();
      input.removeEventListener('keydown', this.#keydown[endpoint]);
      input.removeEventListener('blur', this.#blur[endpoint]);
      input.removeEventListener('focus', this.#focus[endpoint]);
    }
  }
  #input(endpoint: Endpoint): HTMLInputElement { return endpoint === 'start' ? this.#options.startInput : this.#options.endInput; }
  #text(endpoint: Endpoint, input: TextInput): boolean {
    const event = toTextEvent(input);
    return event !== null && this.handleEvent({ type: 'field', endpoint, event: { type: 'text', event } });
  }
  #key(endpoint: Endpoint, native: Event): void {
    const event = native as KeyboardEvent;
    if (!this.#active || !this.#editable || this.#bindings[endpoint]?.isComposing || event.isComposing) return;
    const semantic = event.key === 'ArrowUp' ? 'increment-segment' : event.key === 'ArrowDown' ? 'decrement-segment' : event.key === 'Enter' ? 'commit' : event.key === 'Escape' ? 'cancel' : null;
    if (semantic === null) return;
    event.preventDefault();
    if (semantic === 'increment-segment' || semantic === 'decrement-segment') {
      this.handleEvent({ type: 'field', endpoint, event: { type: 'text', event: nativeFieldSelectionEvent(this.#input(endpoint)) } });
    }
    this.handleEvent(semantic === 'cancel' ? 'cancel' : { type: 'field', endpoint, event: semantic });
  }
  #commitOrCancel(endpoint: Endpoint): void {
    if (this.#active && this.#editable && !this.#bindings[endpoint]?.isComposing && !this.handleEvent({ type: 'field', endpoint, event: 'commit' })) {
      this.handleEvent({ type: 'field', endpoint, event: 'cancel' });
    }
  }
}
