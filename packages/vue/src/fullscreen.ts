import { getCurrentInstance, isRef, shallowReadonly, shallowRef, type Ref, type ShallowRef } from 'vue';
import { failResult, type Result } from '@sectile/core/result';
import { connectFullscreen, type FullscreenConnection, type FullscreenErrorCode, type FullscreenSnapshot } from '@sectile/dom/fullscreen';
import { createComponentHandle } from './component-handle.js';
import { useHostActive } from './host-provider.js';
import { useConnectionLifetime } from './internal/connection-lifetime.js';

export type { FullscreenErrorCode, FullscreenOperation, FullscreenSnapshot } from '@sectile/dom/fullscreen';
export interface UseFullscreenOptions {
  readonly element: Readonly<Ref<HTMLElement | null>>;
  readonly active?: Readonly<Ref<boolean>>;
}
type FullscreenMethods = Pick<FullscreenConnection, 'enter' | 'exit' | 'refresh'>;
export interface UseFullscreenReturn extends FullscreenMethods {
  /** Undefined before mount, while inactive, and after the owning scope retires. */
  readonly snapshot: Readonly<ShallowRef<FullscreenSnapshot | undefined>>;
  /** Connection admission failure, not the result of enter/exit/refresh. */
  readonly error: Readonly<ShallowRef<FullscreenErrorCode | undefined>>;
}
type FullscreenInput = readonly [HTMLElement | null, boolean];
const disposed = (): Result<never, FullscreenErrorCode> => failResult('resource-rejection', 'dom.fullscreen-disposed', 'No active fullscreen connection');
// Saved public methods retain only the revocable port, not setup refs or options.
function projectMethods(current: () => FullscreenConnection | null): FullscreenMethods {
  return Object.freeze({
    enter: () => current()?.enter() ?? Promise.resolve(disposed()),
    exit: () => current()?.exit() ?? Promise.resolve(disposed()),
    refresh: () => current()?.refresh() ?? disposed(),
  });
}

/** Component-scoped publication and lifetime over the canonical native owner. */
export function useFullscreen(options: UseFullscreenOptions): UseFullscreenReturn {
  if (!getCurrentInstance()) throw Object.assign(new TypeError('useFullscreen requires component setup'), { code: 'vue.fullscreen-scope-required' });
  if (!isRef(options.element) || options.active !== undefined && (!isRef(options.active) || typeof options.active.value !== 'boolean')) {
    throw Object.assign(new TypeError('useFullscreen requires an element ref and optional active ref'), { code: 'vue.fullscreen-invalid' });
  }
  let element: UseFullscreenOptions['element'] | undefined = options.element;
  let active: UseFullscreenOptions['active'] = options.active;
  let host: ReturnType<typeof useHostActive> | undefined = useHostActive();
  let alive = true, native: FullscreenConnection | undefined, epoch: object | undefined;
  const snapshot = shallowRef<FullscreenSnapshot>(), error = shallowRef<FullscreenErrorCode>();
  const handle = createComponentHandle<FullscreenConnection, FullscreenMethods>(projectMethods);
  const read = (): FullscreenInput => {
    const enabled = alive && host?.value !== false && active?.value !== false;
    return [enabled ? element?.value ?? null : null, enabled];
  };
  const release = (): void => {
    epoch = undefined; handle.release();
    const held = native; native = undefined;
    try { held?.disconnect(); }
    finally { snapshot.value = undefined; error.value = undefined; }
  };
  const attach = ([target, enabled]: FullscreenInput): void => {
    if (!enabled || !target) return;
    const token = {}; epoch = token;
    const result = connectFullscreen({ element: target, onChange(value) {
      if (alive && epoch === token) snapshot.value = value;
    } });
    if (result.ok) {
      if (alive && epoch === token) { native = result.value; handle.set(native); }
      else result.value.disconnect();
    } else if (epoch === token) { epoch = undefined; error.value = result.error.code; }
  };
  useConnectionLifetime<FullscreenInput>({ read, equal: (next, previous) => next[0] === previous[0] && next[1] === previous[1], connect: attach, disconnect: release, dispose() {
    alive = false; element = undefined; active = undefined; host = undefined;
  } });
  return Object.freeze({ ...handle.view, snapshot: shallowReadonly(snapshot), error: shallowReadonly(error) });
}
