import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateBoundedRange, type BoundedRangeInput, type QuantizedRange } from '@sectile/core/range';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applyMultiThumbSliderEvent, tryCreateMultiThumbSliderState, type MultiThumbSliderCommand, type MultiThumbSliderEvent, type MultiThumbSliderPolicies, type MultiThumbSliderState } from '@sectile/core/multi-thumb-slider';
export type { MultiThumbSliderPolicies } from '@sectile/core/multi-thumb-slider';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './internal/interaction.js';

export interface MultiThumbSliderOptions<ID extends StableID = StableID> extends BoundedRangeInput {
  readonly root: HTMLElement;
  readonly track?: HTMLElement;
  readonly thumbs: readonly ID[];
  readonly values?: readonly number[];
  readonly defaultValues?: readonly number[];
  readonly defaultHighlightedValue?: ID | null;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly policies?: MultiThumbSliderPolicies;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly label?: string;
  readonly getThumbLabel?: (id: ID) => string;
  readonly formatValue?: (value: string, id: ID) => string;
  readonly onValuesChange?: (ticks: readonly number[]) => void;
  readonly onUpdate?: () => void;
}

export type MultiThumbSliderThumbLabelResolver<ID extends StableID = StableID> = NonNullable<MultiThumbSliderOptions<ID>['getThumbLabel']>;
export type MultiThumbSliderValueFormatter<ID extends StableID = StableID> = NonNullable<MultiThumbSliderOptions<ID>['formatValue']>;
export type MultiThumbSliderValuesChangeHandler<ID extends StableID = StableID> = NonNullable<MultiThumbSliderOptions<ID>['onValuesChange']>;
export type MultiThumbSliderUpdateHandler<ID extends StableID = StableID> = NonNullable<MultiThumbSliderOptions<ID>['onUpdate']>;
export interface MultiThumbSliderControlledValues<ID extends StableID = StableID> { readonly values: readonly number[]; readonly highlightedValue?: ID | null }
export interface MultiThumbSliderConnection<ID extends StableID = StableID> {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<MultiThumbSliderState<ID>>;
  getValues(): readonly string[];
  syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>>;
  setThumbAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: MultiThumbSliderEvent<ID>): boolean;
  disconnect(): void;
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
    notify: (previous, proposed) => {
      if (previous.ticks.some((tick, index) => tick !== proposed.ticks[index])) options.onValuesChange?.(proposed.ticks);
    },
    toEffect: (command) => command,
    interaction: options,
    interactionIntent: multiThumbIntent,
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
  readonly #handlePointerUp: (event: PointerEvent) => void;
  readonly #handleFocus: (event: FocusEvent) => void;
  #draggingThumb: ID | null = null;

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
      const rect = (options.track ?? options.root).getBoundingClientRect();
      const orientation = options.orientation ?? 'horizontal';
      const extent = orientation === 'horizontal' ? rect.width : rect.height;
      if (extent <= 0) return;
      const rawRatio = orientation === 'horizontal'
        ? (event.clientX - rect.left) / rect.width
        : (rect.bottom - event.clientY) / rect.height;
      const ratio = Math.max(0, Math.min(1, rawRatio));
      const tick = Math.round(ratio * range.count);
      if (event.type === 'pointerdown') {
        const id = this.#thumbForTarget(event.target) ?? this.#nearestThumb(tick);
        if (id === null) return;
        this.#draggingThumb = id;
        (options.track ?? options.root).setPointerCapture?.(event.pointerId);
        this.#elements.get(id)?.focus();
      } else if (this.#draggingThumb === null) {
        return;
      }
      if (this.#draggingThumb !== null && this.handleEvent({ type: 'set-tick', id: this.#draggingThumb, tick })) event.preventDefault();
    };
    this.#handlePointerUp = (event): void => {
      if (this.#draggingThumb === null) return;
      this.#draggingThumb = null;
      (options.track ?? options.root).releasePointerCapture?.(event.pointerId);
    };
    this.#handleFocus = (event): void => {
      for (const [id, element] of this.#elements) if (event.target === element) { this.handleEvent({ type: 'focus', id }); return; }
    };
    options.root.addEventListener('keydown', this.#handleKeydown);
    options.root.addEventListener('focusin', this.#handleFocus);
    (options.track ?? options.root).addEventListener('pointerdown', this.#handlePointer);
    (options.track ?? options.root).addEventListener('pointermove', this.#handlePointer);
    (options.track ?? options.root).addEventListener('pointerup', this.#handlePointerUp);
    (options.track ?? options.root).addEventListener('pointercancel', this.#handlePointerUp);
    options.root.setAttribute('role', 'group');
    setInteractionAttributes(options.root, options);
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
  }
  public getSnapshot(): RevisionSnapshot<MultiThumbSliderState<ID>> { return this.#runtime.getSnapshot(); }
  public getValues(): readonly string[] { return Object.freeze(this.getSnapshot().state.ticks.map((tick) => this.range.valueAt(tick) as string)); }
  public syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>> {
    if (this.#options.values === undefined) return { ok: false, error: { class: 'construction', code: 'not-controlled', message: 'Only a controlled multi-thumb slider can be synchronized.' } };
    const result = this.#runtime.replace(tryCreateMultiThumbSliderState(this.#thumbs, this.range, values.values, values.highlightedValue ?? this.getSnapshot().state.cursor.current, this.#options.policies));
    if (result.ok) this.#refreshAttributes();
    return result;
  }
  public setThumbAttributes(element: HTMLElement, id: ID): void { if (this.#thumbs.indexOf(id) !== null) { this.#elements.set(id, element); this.#refreshAttributes(); } }
  public handleEvent(event: MultiThumbSliderEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { this.#refreshAttributes(); this.#options.onUpdate?.(); } return result.ok; }
  public disconnect(): void { this.#options.root.removeEventListener('keydown', this.#handleKeydown); this.#options.root.removeEventListener('focusin', this.#handleFocus); (this.#options.track ?? this.#options.root).removeEventListener('pointerdown', this.#handlePointer); (this.#options.track ?? this.#options.root).removeEventListener('pointermove', this.#handlePointer); (this.#options.track ?? this.#options.root).removeEventListener('pointerup', this.#handlePointerUp); (this.#options.track ?? this.#options.root).removeEventListener('pointercancel', this.#handlePointerUp); this.#elements.clear(); }
  #thumbForTarget(target: EventTarget | null): ID | null {
    for (const [id, element] of this.#elements) if (element === target) return id;
    return null;
  }
  #nearestThumb(tick: number): ID | null {
    const state = this.getSnapshot().state;
    let nearest = state.cursor.current;
    let distance = nearest === null ? Number.POSITIVE_INFINITY : Math.abs((state.ticks[this.#thumbs.indexOf(nearest) as number] as number) - tick);
    for (let index = 0; index < state.ticks.length; index += 1) {
      const candidateDistance = Math.abs((state.ticks[index] as number) - tick);
      if (candidateDistance >= distance) continue;
      nearest = this.#thumbs.at(index);
      distance = candidateDistance;
    }
    return nearest;
  }
  #refreshAttributes(): void {
    const state = this.getSnapshot().state;
    for (const [id, element] of this.#elements) {
      const index = this.#thumbs.indexOf(id);
      if (index === null) continue;
      const tick = state.ticks[index] as number;
      const gap = this.#options.policies?.minGap ?? 0;
      const lowerTick = this.#options.policies?.allowCross || index === 0
        ? 0
        : (state.ticks[index - 1] as number) + gap;
      const upperTick = this.#options.policies?.allowCross || index === state.ticks.length - 1
        ? this.range.count
        : (state.ticks[index + 1] as number) - gap;
      const value = this.range.valueAt(tick) as string;
      element.setAttribute('role', 'slider');
      setInteractionAttributes(element, this.#options, { readOnly: true });
      element.setAttribute('aria-valuemin', this.range.valueAt(lowerTick) as string);
      element.setAttribute('aria-valuemax', this.range.valueAt(upperTick) as string);
      element.setAttribute('aria-valuenow', value);
      element.setAttribute('aria-valuetext', this.#options.formatValue?.(value, id) ?? value);
      element.setAttribute('aria-orientation', this.#options.orientation ?? 'horizontal');
      const label = this.#options.getThumbLabel?.(id);
      if (label !== undefined) element.setAttribute('aria-label', label);
      element.tabIndex = 0;
    }
  }
}

function multiThumbIntent<ID extends StableID>(event: MultiThumbSliderEvent<ID>): 'navigate' | 'mutate' { if (typeof event === 'object') return event.type === 'focus' ? 'navigate' : 'mutate'; return event === 'next-thumb' || event === 'previous-thumb' ? 'navigate' : 'mutate'; }

function toMultiThumbSliderEvent(event: KeyboardEvent): Extract<MultiThumbSliderEvent, string> | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') return 'increment';
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') return 'decrement';
  if (event.key === 'Home') return 'home'; if (event.key === 'End') return 'end';
  return null;
}
