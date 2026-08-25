import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
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
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export type CarouselScheduleHandler = () => void;

export interface CarouselScheduler {
  schedule(callback: CarouselScheduleHandler, delayMs: number): unknown;
  cancel(token: unknown): void;
}

export interface CarouselAutoplayOptions {
  readonly delayMs?: number;
  readonly stopOnInteraction?: boolean;
  readonly scheduler?: CarouselScheduler;
}

export interface CarouselOptions<ID extends StableID = StableID> {
  readonly slides: readonly ID[];
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly paused?: boolean;
  readonly defaultPaused?: boolean;
  readonly disabled?: boolean;
  readonly policies?: CarouselPolicies;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly autoplay?: boolean | CarouselAutoplayOptions;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onPausedChange?: (paused: boolean) => void;
  readonly onAnnounce?: (id: ID) => void;
  readonly onUpdate?: () => void;
}

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
  handleEvent(event: CarouselEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
  disconnect(): void;
}

interface NormalizedAutoplay {
  readonly delayMs: number;
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
  const autoplay = normalizeAutoplay(options.autoplay);
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
    ? { ok: true, value: new TerminalCarousel(options, slides.value, runtime.value, autoplay.value, valueControlled, pausedControlled) }
    : runtime;
}

class TerminalCarousel<ID extends StableID> implements CarouselConnection<ID> {
  readonly #options: CarouselOptions<ID>;
  readonly #slides: Sequence<ID>;
  readonly #runtime: SemanticController<CarouselState<ID>, CarouselEvent<ID>, CarouselCommand<ID>>;
  readonly #autoplay: NormalizedAutoplay | null;
  readonly #valueControlled: boolean;
  readonly #pausedControlled: boolean;
  #timer: unknown = noCarouselTimer;

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
      this.#resetTimer();
      this.#options.onUpdate?.();
    }
    return result;
  }

  public handleEvent(event: CarouselEvent<ID>): boolean {
    const before = this.getSnapshot().state.cursor.current;
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const command of result.commands) this.#options.onAnnounce?.(command.id);
      this.#resetTimer();
      if (this.#autoplay !== null && this.#options.policies?.wrap === false && event === 'next' && before === this.getSnapshot().state.cursor.current) this.#clearTimer();
    }
    this.#options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const vertical = this.#options.orientation === 'vertical';
    const event = input.key === (vertical ? 'down' : 'right') ? 'next'
      : input.key === (vertical ? 'up' : 'left') ? 'previous'
        : input.key === 'home' ? 'first'
          : input.key === 'end' ? 'last'
            : input.key === 'space' ? 'toggle-pause'
              : null;
    if (event === null) return false;
    this.handleEvent(event);
    if (this.#autoplay?.stopOnInteraction && event !== 'toggle-pause') this.handleEvent('pause');
    return true;
  }

  public disconnect(): void { this.#clearTimer(); }

  #resetTimer(): void {
    this.#clearTimer();
    if (this.#autoplay === null || this.#slides.size < 2 || isCarouselRotationPaused(this.getSnapshot().state)) return;
    this.#timer = this.#autoplay.scheduler.schedule(() => {
      this.#timer = noCarouselTimer;
      this.handleEvent('next');
    }, this.#autoplay.delayMs);
  }

  #clearTimer(): void {
    if (this.#timer === noCarouselTimer || this.#autoplay === null) return;
    this.#autoplay.scheduler.cancel(this.#timer);
    this.#timer = noCarouselTimer;
  }
}

const noCarouselTimer = Symbol('no-carousel-timer');

function normalizeAutoplay(autoplay: CarouselOptions['autoplay']): Result<NormalizedAutoplay | null> {
  if (autoplay === undefined || autoplay === false) return { ok: true, value: null };
  const config = autoplay === true ? {} : autoplay;
  const delayMs = config.delayMs ?? 5000;
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return { ok: false, error: { class: 'construction', code: 'carousel-autoplay-delay-invalid', message: 'Carousel autoplay delay must be a positive finite number.' } };
  }
  const scheduler = config.scheduler ?? {
    schedule: (callback: () => void, delay: number): unknown => globalThis.setTimeout(callback, delay),
    cancel: (token: unknown): void => { globalThis.clearTimeout(token as ReturnType<typeof setTimeout>); },
  };
  return { ok: true, value: { delayMs, stopOnInteraction: config.stopOnInteraction ?? true, scheduler } };
}
