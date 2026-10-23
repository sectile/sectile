import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateBoundedRange, type BoundedRangeInput, type QuantizedRange } from '@sectile/core/range';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applyMultiThumbSliderEvent, getMultiThumbSliderThumbBounds, tryCreateMultiThumbSliderState, type MultiThumbSliderCommand, type MultiThumbSliderEvent, type MultiThumbSliderPolicies, type MultiThumbSliderState } from '@sectile/core/multi-thumb-slider';
export type { MultiThumbSliderPolicies } from '@sectile/core/multi-thumb-slider';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './interaction/attributes.js';

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
  readonly domain: Sequence<ID>;
  getSnapshot(): RevisionSnapshot<MultiThumbSliderState<ID>>;
  getValues(): readonly string[];
  syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>>;
  setThumbAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: MultiThumbSliderEvent<ID>): boolean;
  disconnect(): void;
}

export interface MultiThumbSliderThumbAttributeOptions<ID extends StableID = StableID> {
  readonly domain: Sequence<ID>; readonly range: QuantizedRange; readonly state: MultiThumbSliderState<NoInfer<ID>>; readonly id: NoInfer<ID>;
  readonly policies?: MultiThumbSliderPolicies; readonly orientation?: 'horizontal' | 'vertical'; readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly label?: string; readonly formatValue?: (value: string, id: NoInfer<ID>) => string;
}

/** Shared native and SSR projection; bounds belong to the portable Core owner. */
export function getMultiThumbSliderThumbAttributes<ID extends StableID>(options: MultiThumbSliderThumbAttributeOptions<ID>): Readonly<Record<string, string | number | undefined>> {
  const bounds = unwrap(getMultiThumbSliderThumbBounds(options.domain, options.range, options.state, options.id, options.policies));
  const value = options.range.valueAt(bounds.tick) as string;
  return Object.freeze({ role: 'slider', tabindex: options.disabled ? -1 : 0, 'aria-valuemin': options.range.valueAt(bounds.lowerTick) as string,
    'aria-valuemax': options.range.valueAt(bounds.upperTick) as string, 'aria-valuenow': value,
    'aria-valuetext': options.formatValue?.(value, options.id) ?? value, 'aria-orientation': options.orientation ?? 'horizontal',
    ...(options.label === undefined ? {} : { 'aria-label': options.label }),
    'aria-disabled': options.disabled ? 'true' : undefined, 'aria-readonly': options.readOnly ? 'true' : undefined });
}

export function createMultiThumbSlider<ID extends StableID>(options: MultiThumbSliderOptions<ID>): FacadeConnection<MultiThumbSliderConnection<ID>> {
  return unwrap(tryCreateMultiThumbSlider(options));
}

export function tryCreateMultiThumbSlider<ID extends StableID>(options: MultiThumbSliderOptions<ID>): Result<FacadeConnection<MultiThumbSliderConnection<ID>>> {
  return createFacadeConnection(options, tryCreateMultiThumbSliderConnection);
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
  public readonly domain: Sequence<ID>;
  readonly #options: MultiThumbSliderOptions<ID>;
  readonly #runtime: SemanticController<MultiThumbSliderState<ID>, MultiThumbSliderEvent<ID>, MultiThumbSliderCommand<ID>>;
  readonly #elements = new Map<ID, HTMLElement>();
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handlePointer: (event: PointerEvent) => void;
  readonly #handlePointerUp: (event: PointerEvent) => void;
  readonly #handleFocus: (event: FocusEvent) => void;
  #draggingThumb: ID | null = null;
  #pointerId: number | null = null;

  public constructor(options: MultiThumbSliderOptions<ID>, thumbs: Sequence<ID>, range: QuantizedRange, runtime: SemanticController<MultiThumbSliderState<ID>, MultiThumbSliderEvent<ID>, MultiThumbSliderCommand<ID>>) {
    this.#options = options;
    this.domain = thumbs;
    this.range = range;
    this.#runtime = runtime;
    this.#handleKeydown = (event): void => {
      const semantic = toMultiThumbSliderEvent(event);
      if (semantic !== null && this.handleEvent(semantic)) event.preventDefault();
    };
    this.#handlePointer = (event): void => {
      if (event.type === 'pointerdown') {
        if (event.button !== 0 || options.disabled || options.readOnly || this.#pointerId !== null) return;
      } else if (event.pointerId !== this.#pointerId) return;
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
        const id = this.#thumbForPointer(event, tick);
        if (id === null) return;
        this.#draggingThumb = id;
        this.#pointerId = event.pointerId;
        (options.track ?? options.root).setPointerCapture?.(event.pointerId);
        this.#elements.get(id)?.focus();
      } else if (this.#draggingThumb === null) {
        return;
      }
      if (this.#draggingThumb !== null && this.handleEvent({ type: 'set-tick', id: this.#draggingThumb, tick })) event.preventDefault();
    };
    this.#handlePointerUp = (event): void => {
      if (event.pointerId === this.#pointerId) this.#endDrag();
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
    (options.track ?? options.root).addEventListener('lostpointercapture', this.#handlePointerUp);
    options.root.setAttribute('role', 'group');
    setInteractionAttributes(options.root, options);
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
  }
  public getSnapshot(): RevisionSnapshot<MultiThumbSliderState<ID>> { return this.#runtime.getSnapshot(); }
  public getValues(): readonly string[] { return Object.freeze(this.getSnapshot().state.ticks.map((tick) => this.range.valueAt(tick) as string)); }
  public syncControlledValues(values: MultiThumbSliderControlledValues<ID>): Result<RevisionSnapshot<MultiThumbSliderState<ID>>> {
    if (this.#options.values === undefined) return { ok: false, error: { class: 'construction', code: 'not-controlled', message: 'Only a controlled multi-thumb slider can be synchronized.' } };
    const result = this.#runtime.replace(tryCreateMultiThumbSliderState(this.domain, this.range, values.values, values.highlightedValue ?? this.getSnapshot().state.cursor.current, this.#options.policies));
    if (result.ok) this.#refreshAttributes();
    return result;
  }
  public setThumbAttributes(element: HTMLElement, id: ID): void {
    if (this.domain.indexOf(id) === null) return;
    this.#elements.set(id, element); this.#applyThumbAttributes(element, id, this.getSnapshot().state);
    if (element.ownerDocument?.activeElement === element && this.getSnapshot().state.cursor.current !== id) this.handleEvent({ type: 'focus', id });
  }
  public handleEvent(event: MultiThumbSliderEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { this.#refreshAttributes(); this.#options.onUpdate?.(); } return result.ok; }
  public disconnect(): void {
    this.#options.root.removeEventListener('keydown', this.#handleKeydown);
    this.#options.root.removeEventListener('focusin', this.#handleFocus);
    const target = this.#options.track ?? this.#options.root;
    target.removeEventListener('pointerdown', this.#handlePointer);
    target.removeEventListener('pointermove', this.#handlePointer);
    target.removeEventListener('pointerup', this.#handlePointerUp);
    target.removeEventListener('pointercancel', this.#handlePointerUp);
    target.removeEventListener('lostpointercapture', this.#handlePointerUp);
    this.#endDrag(); this.#elements.clear();
  }
  #endDrag(): void {
    const pointerId = this.#pointerId;
    this.#pointerId = null; this.#draggingThumb = null;
    const target = this.#options.track ?? this.#options.root;
    if (pointerId !== null && target.hasPointerCapture?.(pointerId)) target.releasePointerCapture?.(pointerId);
  }
  #thumbForTarget(target: EventTarget | null): ID | null {
    for (const [id, element] of this.#elements) {
      if (element === target || (target !== null && typeof (target as Node).nodeType === 'number' && element.contains(target as Node))) return id;
    }
    return null;
  }
  #thumbForPointer(event: PointerEvent, tick: number): ID | null {
    const pressed = this.#thumbForTarget(event.target);
    const nearest = this.#nearestThumb(tick, pressed);
    if (pressed === null || nearest === pressed) return nearest;
    // Expanded targets can overlap: preserve direct presses outside the overlap,
    // but let the closer thumb receive a press inside both targets.
    const bounds = nearest === null ? undefined : this.#elements.get(nearest)?.getBoundingClientRect();
    return bounds !== undefined && event.clientX >= bounds.left && event.clientX < bounds.right
      && event.clientY >= bounds.top && event.clientY < bounds.bottom ? nearest : pressed;
  }
  #nearestThumb(tick: number, preferred: ID | null = null): ID | null {
    const state = this.getSnapshot().state;
    let nearest = preferred ?? state.cursor.current;
    let distance = nearest === null ? Number.POSITIVE_INFINITY : Math.abs((state.ticks[this.domain.indexOf(nearest) as number] as number) - tick);
    for (let index = 0; index < state.ticks.length; index += 1) {
      const candidateDistance = Math.abs((state.ticks[index] as number) - tick);
      if (candidateDistance >= distance) continue;
      nearest = this.domain.at(index);
      distance = candidateDistance;
    }
    return nearest;
  }
  #refreshAttributes(): void {
    const state = this.getSnapshot().state;
    for (const [id, element] of this.#elements) this.#applyThumbAttributes(element, id, state);
  }
  #applyThumbAttributes(element: HTMLElement, id: ID, state: MultiThumbSliderState<ID>): void {
    setInteractionAttributes(element, this.#options, false, true);
    const attributes = getMultiThumbSliderThumbAttributes({ domain: this.domain, range: this.range, state, id,
      ...(this.#options.policies === undefined ? {} : { policies: this.#options.policies }),
      ...(this.#options.orientation === undefined ? {} : { orientation: this.#options.orientation }),
      ...(this.#options.disabled === undefined ? {} : { disabled: this.#options.disabled }),
      ...(this.#options.readOnly === undefined ? {} : { readOnly: this.#options.readOnly }),
      ...(this.#options.getThumbLabel === undefined ? {} : { label: this.#options.getThumbLabel(id) }),
      ...(this.#options.formatValue === undefined ? {} : { formatValue: this.#options.formatValue }),
    });
    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'tabindex') element.tabIndex = Number(value);
      else if (value !== undefined) element.setAttribute(name, String(value));
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
