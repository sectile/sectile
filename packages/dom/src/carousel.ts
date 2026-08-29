import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import {
  applyCarouselEvent,
  tryCreateCarouselState,
  getCarouselPosition,
  isCarouselRotationPaused,
  type CarouselCommand,
  type CarouselEvent,
  type CarouselPolicies,
  type CarouselPosition,
  type CarouselState,
} from '@sectile/core/carousel';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './internal/interaction.js';
import { horizontalArrow, type ReadingDirection } from './internal/direction.js';

export type { CarouselPolicies, CarouselPosition } from '@sectile/core/carousel';

export type CarouselScheduleHandler = () => void;

export interface CarouselScheduler {
  schedule(callback: CarouselScheduleHandler, delayMs: number): unknown;
  cancel(token: unknown): void;
}

export interface CarouselAutoplayOptions {
  readonly delayMs?: number;
  readonly pauseOnHover?: boolean;
  readonly pauseOnFocus?: boolean;
  readonly stopOnInteraction?: boolean;
  readonly scheduler?: CarouselScheduler;
}

export interface CarouselOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly slides: readonly ID[];
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly paused?: boolean;
  readonly defaultPaused?: boolean;
  readonly disabled?: boolean;
  readonly policies?: CarouselPolicies;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly direction?: ReadingDirection;
  readonly autoplay?: boolean | CarouselAutoplayOptions;
  readonly label?: string;
  readonly previousButton?: HTMLElement;
  readonly nextButton?: HTMLElement;
  readonly pauseButton?: HTMLElement;
  readonly indicatorGroup?: HTMLElement;
  readonly getSlideLabel?: (id: ID, index: number, count: number) => string;
  readonly getIndicatorLabel?: (id: ID, index: number, count: number) => string;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onPausedChange?: (paused: boolean) => void;
  readonly onAnnounce?: (id: ID) => void;
  readonly onUpdate?: () => void;
}

export type CarouselSlideLabelResolver<ID extends StableID = StableID> = NonNullable<CarouselOptions<ID>['getSlideLabel']>;
export type CarouselIndicatorLabelResolver<ID extends StableID = StableID> = NonNullable<CarouselOptions<ID>['getIndicatorLabel']>;
export type CarouselValueChangeHandler<ID extends StableID = StableID> = NonNullable<CarouselOptions<ID>['onValueChange']>;
export type CarouselPausedChangeHandler<ID extends StableID = StableID> = NonNullable<CarouselOptions<ID>['onPausedChange']>;
export type CarouselAnnounceHandler<ID extends StableID = StableID> = NonNullable<CarouselOptions<ID>['onAnnounce']>;
export type CarouselUpdateHandler<ID extends StableID = StableID> = NonNullable<CarouselOptions<ID>['onUpdate']>;

export interface CarouselControlledValues<ID extends StableID = StableID> {
  readonly value?: ID | null;
  readonly paused?: boolean;
}

export interface CarouselConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<CarouselState<ID>>;
  getPosition(): CarouselPosition;
  syncControlledValues(values: CarouselControlledValues<ID>): Result<RevisionSnapshot<CarouselState<ID>>>;
  setSlideAttributes(element: HTMLElement, id: ID): void;
  setIndicatorAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: CarouselEvent<ID>): boolean;
  disconnect(): void;
}

interface NormalizedAutoplay {
  readonly delayMs: number;
  readonly pauseOnHover: boolean;
  readonly pauseOnFocus: boolean;
  readonly stopOnInteraction: boolean;
  readonly scheduler: CarouselScheduler;
}

export function createCarousel<ID extends StableID>(options: CarouselOptions<ID>): FacadeConnection<CarouselConnection<ID>> {
  return unwrap(tryCreateCarousel(options));
}

export function tryCreateCarousel<ID extends StableID>(options: CarouselOptions<ID>): Result<FacadeConnection<CarouselConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateCarouselConnection(options));
}

function tryCreateCarouselConnection<ID extends StableID>(options: CarouselOptions<ID>): Result<CarouselConnection<ID>> {
  const slides = tryCreateSequence(options.slides);
  if (!slides.ok) return slides;
  const autoplay = normalizeAutoplay(options);
  if (!autoplay.ok) return autoplay;

  const valueControlled = options.value !== undefined;
  const pausedControlled = options.paused !== undefined;
  const runtime = createSemanticController<CarouselState<ID>, CarouselEvent<ID>, CarouselCommand<ID>, CarouselCommand<ID>>({
    initial: tryCreateCarouselState(
      slides.value,
      options.value !== undefined ? options.value : options.defaultValue ?? options.slides[0] ?? null,
      options.paused ?? options.defaultPaused ?? false,
    ),
    reducer: (state, event) => applyCarouselEvent(slides.value, state, event, options.policies),
    reconcile: (previous, proposed) => tryCreateCarouselState(
      slides.value,
      valueControlled ? previous.cursor.current : proposed.cursor.current,
      pausedControlled ? previous.paused : proposed.paused,
      proposed.pauseReasons,
    ),
    notify: (previous, proposed) => {
      if (previous.cursor.current !== proposed.cursor.current) options.onValueChange?.(proposed.cursor.current);
      if (previous.paused !== proposed.paused) options.onPausedChange?.(proposed.paused);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMCarousel(options, slides.value, runtime.value, autoplay.value, valueControlled, pausedControlled) }
    : runtime;
}

class DOMCarousel<ID extends StableID> implements CarouselConnection<ID> {
  readonly #options: CarouselOptions<ID>;
  readonly #slides: Sequence<ID>;
  readonly #runtime: SemanticController<CarouselState<ID>, CarouselEvent<ID>, CarouselCommand<ID>>;
  readonly #autoplay: NormalizedAutoplay | null;
  readonly #valueControlled: boolean;
  readonly #pausedControlled: boolean;
  readonly #slideElements = new Map<ID, HTMLElement>();
  readonly #indicatorElements = new Map<ID, { readonly element: HTMLElement; readonly listener: () => void }>();
  readonly #baseID: string;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #previous: () => void;
  readonly #next: () => void;
  readonly #pause: () => void;
  readonly #mouseenter: () => void;
  readonly #mouseleave: () => void;
  readonly #focusin: () => void;
  readonly #focusout: (event: FocusEvent) => void;
  #timer: unknown = noCarouselTimer;
  #active = true;

  public constructor(
    options: CarouselOptions<ID>,
    slides: Sequence<ID>,
    runtime: SemanticController<CarouselState<ID>, CarouselEvent<ID>, CarouselCommand<ID>>,
    autoplay: NormalizedAutoplay | null,
    valueControlled: boolean,
    pausedControlled: boolean,
  ) {
    this.#options = options;
    this.#slides = slides;
    this.#runtime = runtime;
    this.#autoplay = autoplay;
    this.#valueControlled = valueControlled;
    this.#pausedControlled = pausedControlled;
    this.#baseID = options.root.id || `sectile-carousel-${nextCarouselID++}`;
    if (!options.root.id) options.root.id = this.#baseID;

    this.#keydown = (event) => {
      if (event.key === ' ' && event.target !== options.root) return;
      const vertical = options.orientation === 'vertical';
      const horizontal = vertical ? null : horizontalArrow(event.key, options.direction);
      const verticalNext = vertical && event.key === 'ArrowDown';
      const verticalPrevious = vertical && event.key === 'ArrowUp';
      const semantic = verticalNext || horizontal === 'next' ? 'next'
        : verticalPrevious || horizontal === 'previous' ? 'previous'
          : event.key === 'Home' ? 'first'
            : event.key === 'End' ? 'last'
              : event.key === ' ' ? 'toggle-pause'
                : null;
      if (semantic !== null) {
        this.#handleInteraction(semantic);
        event.preventDefault();
      }
    };
    this.#previous = () => { this.#handleInteraction('previous'); };
    this.#next = () => { this.#handleInteraction('next'); };
    this.#pause = () => {
      this.handleEvent('toggle-pause');
      const state = this.getSnapshot().state;
      if (!state.paused && state.pauseReasons.includes('focus')) this.handleEvent({ type: 'resume-for', reason: 'focus' });
    };
    this.#mouseenter = () => { if (this.#autoplay?.pauseOnHover) this.handleEvent({ type: 'pause-for', reason: 'hover' }); };
    this.#mouseleave = () => { if (this.#autoplay?.pauseOnHover) this.handleEvent({ type: 'resume-for', reason: 'hover' }); };
    this.#focusin = () => { if (this.#autoplay?.pauseOnFocus) this.handleEvent({ type: 'pause-for', reason: 'focus' }); };
    this.#focusout = (event) => {
      if (this.#autoplay?.pauseOnFocus && !options.root.contains(event.relatedTarget as Node | null)) {
        this.handleEvent({ type: 'resume-for', reason: 'focus' });
      }
    };

    options.root.addEventListener('keydown', this.#keydown);
    setInteractionAttributes(options.root, options);
    if (options.previousButton !== undefined) setInteractionAttributes(options.previousButton, options, { native: true });
    if (options.nextButton !== undefined) setInteractionAttributes(options.nextButton, options, { native: true });
    if (options.pauseButton !== undefined) setInteractionAttributes(options.pauseButton, options, { native: true });
    options.previousButton?.addEventListener('click', this.#previous);
    options.nextButton?.addEventListener('click', this.#next);
    options.pauseButton?.addEventListener('click', this.#pause);
    if (autoplay?.pauseOnHover) {
      options.root.addEventListener('mouseenter', this.#mouseenter);
      options.root.addEventListener('mouseleave', this.#mouseleave);
    }
    if (autoplay?.pauseOnFocus) {
      options.root.addEventListener('focusin', this.#focusin);
      options.root.addEventListener('focusout', this.#focusout);
    }

    options.root.setAttribute('role', 'region');
    options.root.setAttribute('aria-roledescription', 'carousel');
    options.root.setAttribute('dir', options.direction ?? 'ltr');
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    if (options.indicatorGroup !== undefined) {
      options.indicatorGroup.setAttribute('role', 'tablist');
      options.indicatorGroup.setAttribute('aria-label', 'Choose slide');
      options.indicatorGroup.setAttribute('aria-orientation', options.orientation ?? 'horizontal');
    }
    this.#refresh();
    this.#resetTimer();
  }

  public getSnapshot(): RevisionSnapshot<CarouselState<ID>> { return this.#runtime.getSnapshot(); }
  public getPosition(): CarouselPosition { return getCarouselPosition(this.#slides, this.getSnapshot().state); }

  public syncControlledValues(values: CarouselControlledValues<ID>): Result<RevisionSnapshot<CarouselState<ID>>> {
    if (this.#valueControlled !== (values.value !== undefined) || this.#pausedControlled !== (values.paused !== undefined)) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled carousel values must preserve their construction-time shape.' } };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateCarouselState(
      this.#slides,
      this.#valueControlled ? values.value as ID | null : state.cursor.current,
      this.#pausedControlled ? values.paused as boolean : state.paused,
      state.pauseReasons,
    ));
    if (result.ok) {
      this.#refresh();
      this.#resetTimer();
      this.#options.onUpdate?.();
    }
    return result;
  }

  public setSlideAttributes(element: HTMLElement, id: ID): void {
    if (!this.#slides.contains(id)) return;
    this.#slideElements.set(id, element);
    this.#refresh();
  }

  public setIndicatorAttributes(element: HTMLElement, id: ID): void {
    if (!this.#slides.contains(id)) return;
    const previous = this.#indicatorElements.get(id);
    if (previous !== undefined) previous.element.removeEventListener('click', previous.listener);
    const listener = (): void => { this.#handleInteraction({ type: 'focus', id }); };
    this.#indicatorElements.set(id, { element, listener });
    element.addEventListener('click', listener);
    this.#refresh();
  }

  public handleEvent(event: CarouselEvent<ID>): boolean {
    const before = this.getSnapshot().state.cursor.current;
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const command of result.commands) this.#options.onAnnounce?.(command.id);
      this.#refresh();
      this.#resetTimer();
      if (this.#autoplay !== null && this.#options.policies?.wrap === false && event === 'next' && before === this.getSnapshot().state.cursor.current) this.#clearTimer();
    }
    this.#options.onUpdate?.();
    return result.ok;
  }

  public disconnect(): void {
    this.#active = false;
    this.#clearTimer();
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.previousButton?.removeEventListener('click', this.#previous);
    this.#options.nextButton?.removeEventListener('click', this.#next);
    this.#options.pauseButton?.removeEventListener('click', this.#pause);
    this.#options.root.removeEventListener('mouseenter', this.#mouseenter);
    this.#options.root.removeEventListener('mouseleave', this.#mouseleave);
    this.#options.root.removeEventListener('focusin', this.#focusin);
    this.#options.root.removeEventListener('focusout', this.#focusout);
    for (const { element, listener } of this.#indicatorElements.values()) element.removeEventListener('click', listener);
    this.#slideElements.clear();
    this.#indicatorElements.clear();
  }

  #handleInteraction(event: CarouselEvent<ID>): void {
    this.handleEvent(event);
    if (this.#autoplay?.stopOnInteraction && isMovementEvent(event)) this.handleEvent('pause');
  }

  #refresh(): void {
    const state = this.getSnapshot().state;
    const position = this.getPosition();
    for (const [id, element] of this.#slideElements) {
      const index = this.#slides.indexOf(id);
      element.id = this.#slideID(id);
      element.setAttribute('role', 'group');
      element.setAttribute('aria-roledescription', 'slide');
      if (index !== null) element.setAttribute('aria-label', this.#options.getSlideLabel?.(id, index, this.#slides.size) ?? `${index + 1} of ${this.#slides.size}`);
      element.hidden = id !== state.cursor.current;
    }
    for (const [id, binding] of this.#indicatorElements) {
      const index = this.#slides.indexOf(id);
      const selected = id === state.cursor.current;
      binding.element.setAttribute('role', 'tab');
      binding.element.setAttribute('aria-controls', this.#slideID(id));
      binding.element.setAttribute('aria-selected', String(selected));
      if (index !== null) binding.element.setAttribute('aria-label', this.#options.getIndicatorLabel?.(id, index, this.#slides.size) ?? `Go to slide ${index + 1}`);
      binding.element.tabIndex = selected ? 0 : -1;
    }
    const bounded = this.#options.policies?.wrap === false;
    setDisabled(this.#options.previousButton, position.count < 2 || bounded && position.index === 0);
    setDisabled(this.#options.nextButton, position.count < 2 || bounded && position.index === position.count - 1);
    if (this.#options.pauseButton !== undefined) {
      this.#options.pauseButton.setAttribute('aria-pressed', String(state.paused));
      this.#options.pauseButton.setAttribute('aria-label', state.paused ? 'Resume automatic rotation' : 'Pause automatic rotation');
    }
  }

  #slideID(id: ID): string {
    const index = this.#slides.indexOf(id);
    return `${this.#baseID}-slide-${index === null ? 'unknown' : index + 1}`;
  }

  #resetTimer(): void {
    this.#clearTimer();
    if (!this.#active || this.#autoplay === null || this.#slides.size < 2 || isCarouselRotationPaused(this.getSnapshot().state)) return;
    this.#timer = this.#autoplay.scheduler.schedule(() => {
      this.#timer = noCarouselTimer;
      if (!this.#active) return;
      this.handleEvent('next');
    }, this.#autoplay.delayMs);
  }

  #clearTimer(): void {
    if (this.#timer === noCarouselTimer || this.#autoplay === null) return;
    this.#autoplay.scheduler.cancel(this.#timer);
    this.#timer = noCarouselTimer;
  }
}

let nextCarouselID = 1;
const noCarouselTimer = Symbol('no-carousel-timer');

function normalizeAutoplay<ID extends StableID>(options: CarouselOptions<ID>): Result<NormalizedAutoplay | null> {
  if (options.autoplay === undefined || options.autoplay === false) return { ok: true, value: null };
  const config = options.autoplay === true ? {} : options.autoplay;
  const delayMs = config.delayMs ?? 5000;
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return { ok: false, error: { class: 'construction', code: 'carousel-autoplay-delay-invalid', message: 'Carousel autoplay delay must be a positive finite number.' } };
  }
  const timerHost = options.root.ownerDocument?.defaultView ?? globalThis;
  const scheduler = config.scheduler ?? {
    schedule: (callback: () => void, delay: number): unknown => timerHost.setTimeout(callback, delay),
    cancel: (token: unknown): void => { timerHost.clearTimeout(token as number); },
  };
  return {
    ok: true,
    value: {
      delayMs,
      pauseOnHover: config.pauseOnHover ?? true,
      pauseOnFocus: config.pauseOnFocus ?? true,
      stopOnInteraction: config.stopOnInteraction ?? true,
      scheduler,
    },
  };
}

function isMovementEvent<ID extends StableID>(event: CarouselEvent<ID>): boolean {
  return event === 'next' || event === 'previous' || event === 'first' || event === 'last' || typeof event === 'object' && event.type === 'focus';
}

function setDisabled(element: HTMLElement | undefined, disabled: boolean): void {
  if (element === undefined) return;
  element.setAttribute('aria-disabled', String(disabled));
  if ('disabled' in element) (element as HTMLButtonElement).disabled = disabled;
}
