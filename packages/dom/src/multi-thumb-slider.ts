import type { Result, StableID } from '@sectile/primitives';
import { createBoundedRange, type BoundedRangeInput, type QuantizedRange } from '@sectile/primitives/range';
import { createSequence, type Sequence } from '@sectile/primitives/sequence';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import { applyMultiThumbSliderEvent, createMultiThumbSliderState, type MultiThumbSliderCommand, type MultiThumbSliderEvent, type MultiThumbSliderPolicies, type MultiThumbSliderState } from '@sectile/primitives/multi-thumb-slider';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface MultiThumbSliderOptions<ID extends StableID = StableID> extends BoundedRangeInput {
  readonly root: HTMLElement;
  readonly track?: HTMLElement;
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
  setThumbAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: MultiThumbSliderEvent<ID>): boolean;
  disconnect(): void;
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
    notify: (previous, proposed) => {
      if (previous.ticks.some((tick, index) => tick !== proposed.ticks[index])) options.onValuesChange?.(proposed.ticks);
    },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMMultiThumbSlider(options, thumbs.value, range.value, runtime.value) };
}

class DOMMultiThumbSlider<ID extends StableID> implements MultiThumbSliderConnection<ID> {
  public readonly range: QuantizedRange;
  readonly #options: MultiThumbSliderOptions<ID>;
  readonly #thumbs: Sequence<ID>;
  readonly #runtime: SemanticController<MultiThumbSliderState<ID>, MultiThumbSliderEvent<ID>, MultiThumbSliderCommand<ID>>;
  readonly #elements = new Map<ID, HTMLElement>();
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handlePointer: (event: PointerEvent) => void;
  readonly #handleFocus: (event: FocusEvent) => void;

  public constructor(options: MultiThumbSliderOptions<ID>, thumbs: Sequence<ID>, range: QuantizedRange, runtime: SemanticController<MultiThumbSliderState<ID>, MultiThumbSliderEvent<ID>, MultiThumbSliderCommand<ID>>) {
    this.#options = options;
    this.#thumbs = thumbs;
    this.range = range;
    this.#runtime = runtime;
    this.#handleKeydown = (event): void => {
      const semantic = toMultiThumbSliderEvent(event);
      if (semantic !== null && this.handleEvent(semantic)) event.preventDefault();
    };
    this.#handlePointer = (event): void => {
      const id = this.getSnapshot().state.cursor.current;
      if (id === null) return;
      const rect = (options.track ?? options.root).getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      this.handleEvent({ type: 'set-tick', id, tick: Math.round(ratio * range.count) });
    };
    this.#handleFocus = (event): void => {
      for (const [id, element] of this.#elements) if (event.target === element) { this.handleEvent({ type: 'focus', id }); return; }
    };
    options.root.addEventListener('keydown', this.#handleKeydown);
    options.root.addEventListener('focusin', this.#handleFocus);
    (options.track ?? options.root).addEventListener('pointerdown', this.#handlePointer);
    options.root.setAttribute('role', 'group');
  }
  public getSnapshot(): RevisionSnapshot<MultiThumbSliderState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>> {
    if (this.#options.values === undefined) return { ok: false, error: { class: 'construction', code: 'not-controlled', message: 'Only a controlled multi-thumb slider can be synchronized.' } };
    const result = this.#runtime.replace(createMultiThumbSliderState(this.#thumbs, this.range, values.values, values.highlightedValue ?? this.getSnapshot().state.cursor.current, this.#options.policies));
    if (result.ok) this.#refreshAttributes();
    return result;
  }
  public setThumbAttributes(element: HTMLElement, id: ID): void { if (this.#thumbs.indexOf(id) !== null) { this.#elements.set(id, element); this.#refreshAttributes(); } }
  public handleEvent(event: MultiThumbSliderEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) this.#refreshAttributes(); this.#options.onUpdate?.(); return true; }
  public disconnect(): void { this.#options.root.removeEventListener('keydown', this.#handleKeydown); this.#options.root.removeEventListener('focusin', this.#handleFocus); (this.#options.track ?? this.#options.root).removeEventListener('pointerdown', this.#handlePointer); this.#elements.clear(); }
  #refreshAttributes(): void {
    const state = this.getSnapshot().state;
    for (const [id, element] of this.#elements) {
      const index = this.#thumbs.indexOf(id);
      if (index === null) continue;
      element.setAttribute('role', 'slider'); element.setAttribute('aria-valuemin', '0'); element.setAttribute('aria-valuemax', String(this.range.count)); element.setAttribute('aria-valuenow', String(state.ticks[index])); element.tabIndex = state.cursor.current === id ? 0 : -1;
    }
  }
}

function toMultiThumbSliderEvent(event: KeyboardEvent): Extract<MultiThumbSliderEvent, string> | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') return 'increment';
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') return 'decrement';
  if (event.key === 'Home') return 'home'; if (event.key === 'End') return 'end';
  if (event.key === 'Tab') return event.shiftKey ? 'previous-thumb' : 'next-thumb';
  return null;
}
