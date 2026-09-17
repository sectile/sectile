import { armMotionWait, motionWait, type MotionWait } from './overlay/presence/motion.js';

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

export type ExitPresenceCancel = () => void;

export function retainExitPresence(
  element: HTMLElement,
  onComplete: () => void,
): ExitPresenceCancel | null {
  const animations = element.getAnimations?.().filter(
    (animation) => animation.playState === 'running'
      && animation.effect?.getComputedTiming().endTime !== Infinity,
  ) ?? [];
  if (!animations.length) {
    onComplete();
    return null;
  }
  let active = true;
  void Promise.allSettled(animations.map((animation) => animation.finished))
    .then(() => active && onComplete());
  return () => { active = false; };
}

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
    const finish = (): void => {
      if (!this.#active || generation !== this.#generation || this.#open || this.#element !== element) return;
      const cleanup = this.#cleanup;
      this.#cleanup = undefined;
      this.#generation += 1;
      cleanup?.();
      this.#publish(false);
    };
    this.#cleanup = armMotionWait(element, motion, finish);
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
