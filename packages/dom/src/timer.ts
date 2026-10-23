import type { CoreErrorCode, Result } from '@sectile/core';
import { applyTimerEvent, tryCreateTimerState, getTimerParts, type TimerCommand, type TimerEvent, type TimerParts, type TimerPolicies, type TimerState } from '@sectile/core/timer';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { failResult, unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { createIntervalClock, isNativeIntervalDelay, type NativeIntervalClock } from './interaction/clock.js';

export type TimerItemType = keyof TimerParts;
export type TimerAction = 'start' | 'pause' | 'resume' | 'reset' | 'restart' | 'toggle';
export type TimerErrorCode = CoreErrorCode | 'dom.timer-interval-invalid';
export interface TimerRootAttributesOptions { readonly label?: string; readonly labelledBy?: string; readonly describedBy?: string; readonly scope?: string; readonly part?: string }
export type TimerAttributeRecord = Readonly<Record<string, string | undefined>>;
export interface TimerOptions extends TimerPolicies, TimerRootAttributesOptions { readonly root: HTMLElement; readonly autoStart?: boolean; readonly intervalMs?: number; readonly onTick?: (valueMs: number, parts: TimerParts) => void; readonly onComplete?: (valueMs: number) => void; readonly onUpdate?: () => void }

export type TimerTickHandler = NonNullable<TimerOptions['onTick']>;
export type TimerCompleteHandler = NonNullable<TimerOptions['onComplete']>;
export type TimerUpdateHandler = NonNullable<TimerOptions['onUpdate']>;
export interface TimerConnection { getSnapshot(): RevisionSnapshot<TimerState>; handleEvent(event: TimerEvent): boolean; start(): boolean; pause(): boolean; resume(): boolean; reset(): boolean; restart(): boolean; registerItem(element: HTMLElement, type: TimerItemType): () => void; registerAction(element: HTMLButtonElement, action: TimerAction): () => void; setItemAttributes(element: HTMLElement, type: TimerItemType): void; setActionAttributes(element: HTMLButtonElement, action: TimerAction): void; disconnect(): void }
export function getTimerRootAttributes(state: TimerState, policies: TimerPolicies = {}, options: TimerRootAttributesOptions = {}): TimerAttributeRecord {
  return Object.freeze({ role: 'timer', 'aria-live': 'off', 'aria-valuenow': undefined,
    ...(options.label === undefined ? {} : { 'aria-label': options.label }),
    ...(options.labelledBy === undefined ? {} : { 'aria-labelledby': options.labelledBy }),
    ...(options.describedBy === undefined ? {} : { 'aria-describedby': options.describedBy }),
    'data-scope': options.scope ?? 'timer', 'data-part': options.part ?? 'root',
    'data-state': state.completed ? 'complete' : state.running ? 'running' : 'idle', 'data-countdown': String(policies.countdown === true) });
}
export function tryResolveTimerInterval(intervalMs = 100): Result<number, TimerErrorCode> {
  return !isNativeIntervalDelay(intervalMs)
    ? failResult('construction', 'dom.timer-interval-invalid', 'Timer interval must be finite and between 1 and 2147483647 milliseconds.')
    : { ok: true, value: intervalMs };
}
interface ItemRegistration { element: HTMLElement | undefined }
interface ActionRegistration { element: HTMLButtonElement | undefined; readonly click: () => void }
export function createTimer(options: TimerOptions): FacadeConnection<TimerConnection> { return unwrap(tryCreateTimer(options)); }
export function tryCreateTimer(options: TimerOptions): Result<FacadeConnection<TimerConnection>, TimerErrorCode> { return createFacadeConnection(options, tryCreateTimerConnection); }
function tryCreateTimerConnection(options: TimerOptions): Result<TimerConnection, TimerErrorCode> {
  const interval = tryResolveTimerInterval(options.intervalMs); if (!interval.ok) return interval;
  const policies: TimerPolicies = { ...(options.countdown === undefined ? {} : { countdown: options.countdown }), ...(options.startMs === undefined ? {} : { startMs: options.startMs }), ...(options.targetMs === undefined ? {} : { targetMs: options.targetMs }) };
  const runtime = createSemanticController<TimerState, TimerEvent, TimerCommand, TimerCommand>({ initial: tryCreateTimerState(policies, policies.startMs ?? 0, options.autoStart ?? false), reducer: (state, event) => applyTimerEvent(state, event, policies), toEffect: (command) => command });
  return runtime.ok ? { ok: true, value: new DOMTimer(options, policies, runtime.value) } : runtime;
}

class DOMTimer implements TimerConnection {
  #options: TimerOptions | undefined; readonly #policies: TimerPolicies; readonly #runtime: SemanticController<TimerState, TimerEvent, TimerCommand>;
  readonly #items = new Map<TimerItemType, ItemRegistration>(); readonly #actions = new Map<TimerAction, ActionRegistration>();
  readonly #clock: NativeIntervalClock;
  public constructor(options: TimerOptions, policies: TimerPolicies, runtime: SemanticController<TimerState, TimerEvent, TimerCommand>) {
    this.#options = options; this.#policies = policies; this.#runtime = runtime;
    this.#clock = createIntervalClock(options.intervalMs ?? 100, elapsedMs => { this.handleEvent({ type: 'tick', elapsedMs }); });
    options.root.setAttribute('role', 'timer'); options.root.setAttribute('aria-live', 'off');
    this.#refresh(); this.#syncSchedule();
  }
  public getSnapshot(): RevisionSnapshot<TimerState> { return this.#runtime.getSnapshot(); }
  public handleEvent(event: TimerEvent): boolean {
    const options = this.#options;
    if (!options) return false;
    const result = this.#runtime.handle(event); if (!result.ok) return false;
    if (event === 'restart') this.#clock.resetElapsed();
    // Resource state precedes application callbacks, including exceptions and reentrant disposal.
    this.#syncSchedule(); this.#refresh();
    if (typeof event === 'object') options.onTick?.(result.snapshot.state.valueMs, unwrap(getTimerParts(result.snapshot.state.valueMs)));
    if (this.#options !== options) return true;
    for (const command of result.commands) {
      options.onComplete?.(command.valueMs);
      if (this.#options !== options) return true;
    }
    if (this.getSnapshot().revision === result.snapshot.revision) options.onUpdate?.();
    return true;
  }
  public start(): boolean { return this.handleEvent('start'); } public pause(): boolean { return this.handleEvent('pause'); } public resume(): boolean { return this.handleEvent('resume'); } public reset(): boolean { return this.handleEvent('reset'); } public restart(): boolean { return this.handleEvent('restart'); }
  public setItemAttributes(element: HTMLElement, type: TimerItemType): void { this.registerItem(element, type); }
  public setActionAttributes(element: HTMLButtonElement, action: TimerAction): void { this.registerAction(element, action); }
  public registerItem(element: HTMLElement, type: TimerItemType): () => void {
    if (!this.#options) return () => {};
    const previous = this.#items.get(type); if (previous !== undefined) previous.element = undefined;
    let entry: ItemRegistration | undefined = { element };
    this.#items.set(type, entry); element.dataset['timerItem'] = type; this.#refresh();
    return (): void => {
      const owned = entry; entry = undefined;
      if (owned === undefined) return;
      owned.element = undefined;
      if (this.#items.get(type) === owned) this.#items.delete(type);
    };
  }
  public registerAction(element: HTMLButtonElement, action: TimerAction): () => void {
    if (!this.#options) return () => {};
    const previous = this.#actions.get(action);
    if (previous !== undefined) { previous.element?.removeEventListener('click', previous.click); previous.element = undefined; }
    let entry: ActionRegistration | undefined;
    const click = (): void => { if (entry?.element !== undefined && this.#actions.get(action) === entry) this.handleEvent(action); };
    entry = { element, click }; element.addEventListener('click', click); this.#actions.set(action, entry); this.#refresh();
    return (): void => {
      const owned = entry; entry = undefined;
      if (owned === undefined) return;
      owned.element?.removeEventListener('click', owned.click); owned.element = undefined;
      if (this.#actions.get(action) === owned) this.#actions.delete(action);
    };
  }
  public disconnect(): void {
    this.#options = undefined;
    this.#clock.disconnect();
    for (const item of this.#actions.values()) { item.element?.removeEventListener('click', item.click); item.element = undefined; }
    for (const item of this.#items.values()) item.element = undefined;
    this.#actions.clear(); this.#items.clear();
  }
  #syncSchedule(): void {
    this.#clock.sync(this.#options !== undefined && this.getSnapshot().state.running);
  }
  #refresh(): void {
    const options = this.#options; if (!options) return;
    const state = this.getSnapshot().state, parts = unwrap(getTimerParts(state.valueMs));
    for (const [name, value] of Object.entries(getTimerRootAttributes(state, this.#policies, options))) {
      if (value === undefined) options.root.removeAttribute(name); else options.root.setAttribute(name, value);
    }
    for (const [type, { element }] of this.#items) if (element !== undefined) element.textContent = formatPart(type, parts[type]);
    for (const [action, { element }] of this.#actions) if (element !== undefined) { element.type = 'button'; element.dataset['timerAction'] = action; element.disabled = (action === 'pause' && !state.running) || ((action === 'start' || action === 'resume') && (state.running || state.completed)); }
  }
}
function formatPart(type: TimerItemType, value: number): string { return String(value).padStart(type === 'milliseconds' ? 3 : type === 'days' ? 1 : 2, '0'); }
