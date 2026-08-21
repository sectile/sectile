import type { Result, StableID } from '@sectile/primitives';
import { createBoundedRange, type BoundedRangeInput, type QuantizedRange } from '@sectile/primitives/range';
import { createSequence, type Sequence } from '@sectile/primitives/sequence';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import { applyMultiThumbSliderEvent, createMultiThumbSliderState, type MultiThumbSliderCommand, type MultiThumbSliderEvent, type MultiThumbSliderPolicies, type MultiThumbSliderState } from '@sectile/primitives/multi-thumb-slider';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface MultiThumbSliderOptions<ID extends StableID = StableID> extends BoundedRangeInput {
  readonly thumbs: readonly ID[];
  readonly values?: readonly number[];
  readonly defaultValues?: readonly number[];
  readonly defaultHighlightedValue?: ID | null;
  readonly policies?: MultiThumbSliderPolicies;
  readonly onValuesChange?: (ticks: readonly number[]) => void;
  readonly onUpdate?: () => void;
}
export interface MultiThumbSliderControlledValues<ID extends StableID = StableID> { readonly values: readonly number[]; readonly highlightedValue?: ID | null }
export interface MultiThumbSliderConnection<ID extends StableID = StableID> {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<MultiThumbSliderState<ID>>;
  syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>>;
  handleEvent(event: MultiThumbSliderEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createMultiThumbSlider<ID extends StableID>(options: MultiThumbSliderOptions<ID>): Result<MultiThumbSliderConnection<ID>> {
  const thumbs = createSequence(options.thumbs);
  if (!thumbs.ok) return thumbs;
  const range = createBoundedRange(options);
  if (!range.ok) return range;
  const controlled = options.values !== undefined;
  const runtime = createSemanticController<MultiThumbSliderState<ID>, MultiThumbSliderEvent<ID>, MultiThumbSliderCommand<ID>, MultiThumbSliderCommand<ID>>({
    initial: createMultiThumbSliderState(thumbs.value, range.value, options.values ?? options.defaultValues ?? options.thumbs.map(() => 0), options.defaultHighlightedValue ?? options.thumbs[0] ?? null, options.policies),
    reducer: (state, event) => applyMultiThumbSliderEvent(thumbs.value, range.value, state, event, options.policies),
    reconcile: (previous, proposed) => createMultiThumbSliderState(thumbs.value, range.value, controlled ? previous.ticks : proposed.ticks, proposed.cursor.current, options.policies),
    notify: (previous, proposed) => { if (previous.ticks.some((tick, index) => tick !== proposed.ticks[index])) options.onValuesChange?.(proposed.ticks); },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new TerminalMultiThumbSlider(options, thumbs.value, range.value, runtime.value) };
}

class TerminalMultiThumbSlider<ID extends StableID> implements MultiThumbSliderConnection<ID> {
  public readonly range: QuantizedRange;
  readonly #options: MultiThumbSliderOptions<ID>;
  readonly #thumbs: Sequence<ID>;
  readonly #runtime: SemanticController<MultiThumbSliderState<ID>, MultiThumbSliderEvent<ID>, MultiThumbSliderCommand<ID>>;
  public constructor(options: MultiThumbSliderOptions<ID>, thumbs: Sequence<ID>, range: QuantizedRange, runtime: SemanticController<MultiThumbSliderState<ID>, MultiThumbSliderEvent<ID>, MultiThumbSliderCommand<ID>>) { this.#options = options; this.#thumbs = thumbs; this.range = range; this.#runtime = runtime; }
  public getSnapshot(): RevisionSnapshot<MultiThumbSliderState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>> {
    if (this.#options.values === undefined) return { ok: false, error: { class: 'construction', code: 'not-controlled', message: 'Only a controlled multi-thumb slider can be synchronized.' } };
    return this.#runtime.replace(createMultiThumbSliderState(this.#thumbs, this.range, values.values, values.highlightedValue ?? this.getSnapshot().state.cursor.current, this.#options.policies));
  }
  public handleEvent(event: MultiThumbSliderEvent<ID>): boolean { this.#runtime.handle(event); this.#options.onUpdate?.(); return true; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { const event = toMultiThumbSliderEvent(input); return event === null ? false : this.handleEvent(event); }
}

function toMultiThumbSliderEvent(input: TerminalKeyboardInput): Extract<MultiThumbSliderEvent, string> | null {
  if (input.key === 'right' || input.key === 'up') return 'increment';
  if (input.key === 'left' || input.key === 'down') return 'decrement';
  if (input.key === 'home') return 'home'; if (input.key === 'end') return 'end';
  if (input.key === 'tab') return input.shiftKey ? 'previous-thumb' : 'next-thumb';
  return null;
}
