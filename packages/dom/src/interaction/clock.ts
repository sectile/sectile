/** Native timer input, independent of any widget duration policy. */
export function isNativeIntervalDelay(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 2147483647;
}
export interface NativeIntervalClock { sync(active: boolean): void; resetElapsed(): void; disconnect(): void }

/** One owner-local native schedule. Retirement invalidates even already-queued callbacks. */
export function createIntervalClock(intervalMs: number, onTick: ((elapsedMs: number) => void) | undefined): NativeIntervalClock {
  return new IntervalClock(intervalMs, onTick);
}
class IntervalClock implements NativeIntervalClock {
  readonly #intervalMs: number;
  #tick: ((elapsedMs: number) => void) | undefined;
  #interval: ReturnType<typeof setInterval> | undefined;
  #generation = 0;
  #last = 0;
  constructor(intervalMs: number, onTick: ((elapsedMs: number) => void) | undefined) { this.#intervalMs = intervalMs; this.#tick = onTick; }
  sync(active: boolean): void {
    if (!active || this.#tick === undefined) { this.#stop(); return; }
    if (this.#interval !== undefined) return;
    this.#last = Date.now(); const admitted = ++this.#generation;
    this.#interval = setInterval(() => {
      if (admitted !== this.#generation || this.#tick === undefined) return;
      const now = Date.now(), elapsed = now - this.#last; this.#last = now; this.#tick(elapsed);
    }, this.#intervalMs);
  }
  resetElapsed(): void { this.#last = Date.now(); }
  disconnect(): void { this.#tick = undefined; this.#stop(); }
  #stop(): void { this.#generation++; if (this.#interval !== undefined) clearInterval(this.#interval); this.#interval = undefined; }
}
