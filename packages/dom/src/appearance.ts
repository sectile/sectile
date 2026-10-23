import { failResult, okResult, type Result } from '@sectile/core/result';

export type SystemAppearance = 'light' | 'dark';
export type SystemAppearanceErrorCode = 'dom.appearance-invalid' | 'dom.appearance-unavailable';
export interface SystemAppearanceOptions {
  readonly document: Document;
  /** Changed native fact, or undefined when this connection revokes its observation. */
  readonly onChange: (appearance: SystemAppearance | undefined) => void;
}
export interface SystemAppearanceConnection {
  /** Initial/current native fact; undefined after disconnect. No ambient SSR assumption. */
  readonly appearance: SystemAppearance | undefined;
  disconnect(): void;
}

/** One explicit document media subscription; does not choose requested appearance or paint styles. */
export function connectSystemAppearance(options: SystemAppearanceOptions): Result<SystemAppearanceConnection, SystemAppearanceErrorCode> {
  if (options.document?.nodeType !== 9 || typeof options.onChange !== 'function') {
    return failResult('construction', 'dom.appearance-invalid', 'Appearance observation requires a document and subscriber');
  }
  let query: MediaQueryList | undefined, subscriber: SystemAppearanceOptions['onChange'] | undefined = options.onChange;
  let appearance: SystemAppearance | undefined, ready = false;
  const stop = (notify: boolean): void => {
    const held = query, callback = subscriber, previous = appearance;
    query = undefined; subscriber = undefined; appearance = undefined; ready = false;
    try { held?.removeEventListener('change', changed); }
    finally { if (notify && previous !== undefined) callback?.(undefined); }
  };
  const read = (): SystemAppearance => {
    const matches = query!.matches;
    if (typeof matches !== 'boolean') throw Error('Native appearance is unavailable');
    return matches ? 'dark' : 'light';
  };
  const changed = (): void => {
    if (!ready || !query || !subscriber) return;
    let next: SystemAppearance;
    try { next = read(); }
    catch { stop(true); return; }
    if (next === appearance) return;
    appearance = next;
    try { subscriber(next); }
    catch (error) {
      try { stop(false); } catch { /* Preserve the subscriber failure after releasing the owner. */ }
      throw error;
    }
  };
  try {
    const view = options.document.defaultView;
    if (!view || typeof view.matchMedia !== 'function') throw Error('Native media queries are unavailable');
    query = view.matchMedia('(prefers-color-scheme: dark)');
    if (typeof query.addEventListener !== 'function' || typeof query.removeEventListener !== 'function') {
      throw Error('Native media query subscription is unavailable');
    }
    query.addEventListener('change', changed);
    appearance = read(); ready = true;
  } catch {
    try { stop(false); } catch { /* The retired callback has no native or subscriber capability. */ }
    return failResult('construction', 'dom.appearance-unavailable', 'System appearance could not be observed');
  }
  return okResult(Object.freeze({ get appearance() { return appearance; }, disconnect() { stop(true); } }));
}
