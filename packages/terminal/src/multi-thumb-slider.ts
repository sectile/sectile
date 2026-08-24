import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateBoundedRange, type BoundedRangeInput, type QuantizedRange } from '@sectile/core/range';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applyMultiThumbSliderEvent, tryCreateMultiThumbSliderState, type MultiThumbSliderCommand, type MultiThumbSliderEvent, type MultiThumbSliderPolicies, type MultiThumbSliderState } from '@sectile/core/multi-thumb-slider';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface MultiThumbSliderOptions<ID extends StableID = StableID> extends BoundedRangeInput {
  readonly thumbs: readonly ID[];
  readonly values?: readonly number[];
  readonly defaultValues?: readonly number[];
  readonly defaultHighlightedValue?: ID | null;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly policies?: MultiThumbSliderPolicies;
  readonly onValuesChange?: (ticks: readonly number[]) => void;
  readonly onUpdate?: () => void;
}
export interface MultiThumbSliderControlledValues<ID extends StableID = StableID> { readonly values: readonly number[]; readonly highlightedValue?: ID | null }
export interface MultiThumbSliderConnection<ID extends StableID = StableID> {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<MultiThumbSliderState<ID>>;
  getValues(): readonly string[];
  syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>>;
  handleEvent(event: MultiThumbSliderEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createMultiThumbSlider<ID extends StableID>(options: MultiThumbSliderOptions<ID>): FacadeConnection<MultiThumbSliderConnection<ID>> {
  return unwrap(tryCreateMultiThumbSlider(options));
}

export function tryCreateMultiThumbSlider<ID extends StableID>(options: MultiThumbSliderOptions<ID>): Result<FacadeConnection<MultiThumbSliderConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateMultiThumbSliderConnection(options));
}

function tryCreateMultiThumbSliderConnection<ID extends StableID>(options: MultiThumbSliderOptions<ID>): Result<MultiThumbSliderConnection<ID>> {
  const thumbs = tryCreateSequence(options.thumbs);
  if (!thumbs.ok) return thumbs;
  const range = tryCreateBoundedRange(options);
  if (!range.ok) return range;
  const controlled = options.values !== undefined;
  const runtime = createSemanticController<MultiThumbSliderState<ID>, MultiThumbSliderEvent<ID>, MultiThumbSliderCommand<ID>, MultiThumbSliderCommand<ID>>({
    initial: tryCreateMultiThumbSliderState(thumbs.value, range.value, options.values ?? options.defaultValues ?? options.thumbs.map(() => 0), options.defaultHighlightedValue ?? options.thumbs[0] ?? null, options.policies),
    reducer: (state, event) => applyMultiThumbSliderEvent(thumbs.value, range.value, state, event, options.policies),
    reconcile: (previous, proposed) => tryCreateMultiThumbSliderState(thumbs.value, range.value, controlled ? previous.ticks : proposed.ticks, proposed.cursor.current, options.policies),
    notify: (previous, proposed) => { if (previous.ticks.some((tick, index) => tick !== proposed.ticks[index])) options.onValuesChange?.(proposed.ticks); },
    toEffect: (command) => command,
    interaction: options,
    interactionIntent: multiThumbIntent,
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
  public getValues(): readonly string[] { return Object.freeze(this.getSnapshot().state.ticks.map((tick) => this.range.valueAt(tick) as string)); }
  public syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>> {
    if (this.#options.values === undefined) return { ok: false, error: { class: 'construction', code: 'not-controlled', message: 'Only a controlled multi-thumb slider can be synchronized.' } };
    return this.#runtime.replace(tryCreateMultiThumbSliderState(this.#thumbs, this.range, values.values, values.highlightedValue ?? this.getSnapshot().state.cursor.current, this.#options.policies));
  }
  public handleEvent(event: MultiThumbSliderEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { const event = toMultiThumbSliderEvent(input); return event === null ? false : this.handleEvent(event); }
}

function multiThumbIntent<ID extends StableID>(event: MultiThumbSliderEvent<ID>): 'navigate' | 'mutate' { if (typeof event === 'object') return event.type === 'focus' ? 'navigate' : 'mutate'; return event === 'next-thumb' || event === 'previous-thumb' ? 'navigate' : 'mutate'; }

function toMultiThumbSliderEvent(input: TerminalKeyboardInput): Extract<MultiThumbSliderEvent, string> | null {
  if (input.key === 'right' || input.key === 'up') return 'increment';
  if (input.key === 'left' || input.key === 'down') return 'decrement';
  if (input.key === 'home') return 'home'; if (input.key === 'end') return 'end';
  if (input.key === 'tab') return input.shiftKey ? 'previous-thumb' : 'next-thumb';
  return null;
}
