export interface PresenceOptions {
  readonly open: boolean;
  readonly element?: HTMLElement;
  readonly onPresentChange?: (present: boolean) => void;
}

export interface PresenceConnection {
  getPresent(): boolean;
  update(open: boolean, element: HTMLElement | undefined): boolean;
  disconnect(): void;
}

const MAX_WAIT_MS = 60_000;
const FALLBACK_SLACK_MS = 50;

export function createPresence(options: PresenceOptions): PresenceConnection {
  return new DOMPresence(options);
}

class DOMPresence implements PresenceConnection {
  #open: boolean;
  #present: boolean;
  #element: HTMLElement | undefined;
  #onPresentChange: ((present: boolean) => void) | undefined;
  #cleanup: (() => void) | undefined;
  #generation = 0;
  #active = true;

  public constructor(options: PresenceOptions) {
    this.#open = options.open;
    this.#present = options.open;
    this.#element = options.element;
    this.#onPresentChange = options.onPresentChange;
  }

  public getPresent(): boolean { return this.#present; }

  public update(open: boolean, element: HTMLElement | undefined): boolean {
    if (!this.#active) return this.#present;
    const previousOpen = this.#open;
    const elementChanged = element !== this.#element;
    if (elementChanged) {
      this.#cancelPending();
      this.#element = element;
    }
    this.#open = open;
    if (open) {
      if (!elementChanged) this.#cancelPending();
      this.#publish(true);
      return this.#present;
    }
    if (!previousOpen && !(elementChanged && this.#present)) return this.#present;
    if (!elementChanged) this.#cancelPending();
    if (!this.#present || element === undefined) {
      this.#publish(false);
      return this.#present;
    }
    const motion = motionWait(element);
    if (motion.waitMs <= 0) {
      this.#publish(false);
      return this.#present;
    }
    this.#arm(element, motion);
    return this.#present;
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#cancelPending();
    this.#element = undefined;
    this.#onPresentChange = undefined;
  }

  #arm(element: HTMLElement, motion: MotionWait): void {
    const generation = ++this.#generation;
    const deadline = motion.now() + motion.waitMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (): void => {
      if (!this.#active || generation !== this.#generation || this.#open || this.#element !== element) return;
      const cleanup = this.#cleanup;
      this.#cleanup = undefined;
      this.#generation += 1;
      cleanup?.();
      this.#publish(false);
    };
    const onEnd = (event: Event): void => {
      if (event.target !== element || motion.now() < deadline) return;
      finish();
    };
    element.addEventListener('animationend', onEnd);
    element.addEventListener('transitionend', onEnd);
    const fallbackDelay = Math.min(MAX_WAIT_MS, motion.waitMs + FALLBACK_SLACK_MS);
    timer = setTimeout(finish, fallbackDelay);
    this.#cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      element.removeEventListener('animationend', onEnd);
      element.removeEventListener('transitionend', onEnd);
    };
  }

  #cancelPending(): void {
    this.#generation += 1;
    const cleanup = this.#cleanup;
    this.#cleanup = undefined;
    cleanup?.();
  }

  #publish(present: boolean): void {
    if (present === this.#present) return;
    this.#present = present;
    this.#onPresentChange?.(present);
  }
}

interface MotionWait {
  readonly waitMs: number;
  readonly now: () => number;
}

function motionWait(element: HTMLElement): MotionWait {
  const view = element.ownerDocument?.defaultView;
  if (view === null || view === undefined) return { waitMs: 0, now: Date.now };
  let style: CSSStyleDeclaration;
  try { style = view.getComputedStyle(element); }
  catch { return { waitMs: 0, now: clock(view) }; }
  const waitMs = Math.min(MAX_WAIT_MS, Math.max(transitionWait(style), animationWait(style)));
  return { waitMs, now: clock(view) };
}

function transitionWait(style: CSSStyleDeclaration): number {
  const properties = cssList(style.transitionProperty);
  if (properties.length === 0) return 0;
  const durations = timeList(style.transitionDuration);
  const delays = timeList(style.transitionDelay);
  let maximum = 0;
  for (let index = 0; index < properties.length; index += 1) {
    if (properties[index]?.trim().toLowerCase() === 'none') continue;
    const duration = Math.max(0, cycle(durations, index, 0));
    const delay = cycle(delays, index, 0);
    maximum = Math.max(maximum, Math.max(0, duration + delay));
  }
  return maximum;
}

function animationWait(style: CSSStyleDeclaration): number {
  const names = cssList(style.animationName);
  if (names.length === 0) return 0;
  const durations = timeList(style.animationDuration);
  const delays = timeList(style.animationDelay);
  const iterations = iterationList(style.animationIterationCount);
  let maximum = 0;
  for (let index = 0; index < names.length; index += 1) {
    if (names[index]?.trim().toLowerCase() === 'none') continue;
    const iteration = cycle(iterations, index, Number.NaN);
    if (!Number.isFinite(iteration) || iteration < 0) continue;
    const duration = Math.max(0, cycle(durations, index, 0));
    const delay = cycle(delays, index, 0);
    maximum = Math.max(maximum, Math.max(0, duration * iteration + delay));
  }
  return maximum;
}

function cssList(value: string): string[] {
  return value.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
}

function timeList(value: string): number[] {
  return cssList(value).map(timeMs);
}

function iterationList(value: string): number[] {
  return cssList(value).map((part) => {
    if (part.toLowerCase() === 'infinite') return Number.POSITIVE_INFINITY;
    const parsed = Number.parseFloat(part);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  });
}

function timeMs(value: string): number {
  const text = value.trim().toLowerCase();
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed)) return Number.NaN;
  if (text.endsWith('ms')) return parsed;
  if (text.endsWith('s')) return parsed * 1_000;
  return parsed === 0 ? 0 : Number.NaN;
}

function cycle(values: readonly number[], index: number, fallback: number): number {
  if (values.length === 0) return fallback;
  const value = values[index % values.length];
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function clock(view: Window): () => number {
  const performance = view.performance;
  return typeof performance?.now === 'function' ? () => performance.now() : Date.now;
}
