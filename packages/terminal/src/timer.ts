import type { Result } from '@sectile/core';
import { applyTimerEvent, tryCreateTimerState, getTimerParts, getTimerProgress, type TimerCommand, type TimerEvent, type TimerParts, type TimerPolicies, type TimerState } from '@sectile/core/timer';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export interface TimerOptions extends TimerPolicies { readonly autoStart?: boolean; readonly onTick?: (valueMs: number, parts: TimerParts) => void; readonly onComplete?: (valueMs: number) => void; readonly onUpdate?: () => void }
export interface TimerConnection { getSnapshot(): RevisionSnapshot<TimerState>; handleEvent(event: TimerEvent): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean; start(): boolean; pause(): boolean; resume(): boolean; reset(): boolean; restart(): boolean; tick(elapsedMs: number): boolean; getParts(): TimerParts; getProgress(): number | null }
export function createTimer(options: TimerOptions = {}): FacadeConnection<TimerConnection> { return unwrap(tryCreateTimer(options)); }
export function tryCreateTimer(options: TimerOptions = {}): Result<FacadeConnection<TimerConnection>> { return createFacadeConnection(options, (normalized) => tryCreateTimerConnection(normalized)); }
function tryCreateTimerConnection(options: TimerOptions): Result<TimerConnection> { const policies: TimerPolicies = { ...(options.countdown === undefined ? {} : { countdown: options.countdown }), ...(options.startMs === undefined ? {} : { startMs: options.startMs }), ...(options.targetMs === undefined ? {} : { targetMs: options.targetMs }) }; const runtime = createSemanticController<TimerState, TimerEvent, TimerCommand, TimerCommand>({ initial: tryCreateTimerState(policies, policies.startMs ?? 0, options.autoStart ?? false), reducer: (state, event) => applyTimerEvent(state, event, policies), toEffect: (command) => command }); return runtime.ok ? { ok: true, value: new TerminalTimer(options, policies, runtime.value) } : runtime; }
class TerminalTimer implements TimerConnection {
  readonly #options: TimerOptions; readonly #policies: TimerPolicies; readonly #runtime: SemanticController<TimerState, TimerEvent, TimerCommand>;
  public constructor(options: TimerOptions, policies: TimerPolicies, runtime: SemanticController<TimerState, TimerEvent, TimerCommand>) { this.#options = options; this.#policies = policies; this.#runtime = runtime; }
  public getSnapshot(): RevisionSnapshot<TimerState> { return this.#runtime.getSnapshot(); }
  public handleEvent(event: TimerEvent): boolean { const result = this.#runtime.handle(event); if (!result.ok) return false; if (typeof event === 'object') this.#options.onTick?.(result.snapshot.state.valueMs, this.getParts()); for (const command of result.commands) this.#options.onComplete?.(command.valueMs); this.#options.onUpdate?.(); return true; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { if (input.key === 'space') return this.handleEvent('toggle'); if (input.key === 'r') return this.restart(); if (input.key === 'escape') return this.reset(); return false; }
  public start(): boolean { return this.handleEvent('start'); } public pause(): boolean { return this.handleEvent('pause'); } public resume(): boolean { return this.handleEvent('resume'); } public reset(): boolean { return this.handleEvent('reset'); } public restart(): boolean { return this.handleEvent('restart'); } public tick(elapsedMs: number): boolean { return this.handleEvent({ type: 'tick', elapsedMs }); }
  public getParts(): TimerParts { return unwrap(getTimerParts(this.getSnapshot().state.valueMs)); } public getProgress(): number | null { return unwrap(getTimerProgress(this.getSnapshot().state, this.#policies)); }
}
