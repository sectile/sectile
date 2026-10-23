import { getCurrentInstance, isRef, shallowReadonly, shallowRef, type Ref, type ShallowRef } from 'vue';
import { failResult, type Result } from '@sectile/core/result';
import type { Point } from '@sectile/core/geometry';
import { connectMediaGesture, readMediaViewport, type MediaGestureConnection, type MediaGestureErrorCode, type MediaGestureOptions, type MediaViewportMeasurement } from '@sectile/dom/media-gesture';
import { createComponentHandle } from './component-handle.js';
import { useHostActive } from './host-provider.js';
import { useConnectionLifetime } from './internal/connection-lifetime.js';

export type { MediaGestureInput, MediaGestureEnd, MediaGestureErrorCode, MediaWheelInput, MediaViewportMeasurement } from '@sectile/dom/media-gesture';
export interface UseMediaGestureOptions extends Omit<MediaGestureOptions, 'element'> {
  readonly element: Readonly<Ref<HTMLElement | null>>;
  readonly active?: Readonly<Ref<boolean>>;
}
interface MediaGestureMethods {
  cancel(): void;
  measure(): Result<MediaViewportMeasurement<readonly []>, MediaGestureErrorCode>;
  measure<const Points extends readonly Point[]>(points: Points): Result<MediaViewportMeasurement<Points>, MediaGestureErrorCode>;
}
export interface UseMediaGestureReturn extends MediaGestureMethods {
  /** Native connection admission failure; undefined before mount and while inactive. */
  readonly error: Readonly<ShallowRef<MediaGestureErrorCode | undefined>>;
}
interface Context { readonly connection: MediaGestureConnection; readonly element: HTMLElement }
type Input = readonly [HTMLElement | null, boolean];
function projectMethods(current: () => Context | null): MediaGestureMethods {
  function measure(): Result<MediaViewportMeasurement<readonly []>, MediaGestureErrorCode>;
  function measure<const Points extends readonly Point[]>(points: Points): Result<MediaViewportMeasurement<Points>, MediaGestureErrorCode>;
  function measure(points: readonly Point[] = []): Result<MediaViewportMeasurement, MediaGestureErrorCode> {
    const target = current()?.element;
    return target ? readMediaViewport(target, points) : failResult('resource-rejection', 'dom.media-gesture-unavailable', 'No active media gesture surface');
  }
  return Object.freeze({ cancel: () => current()?.connection.cancel(), measure });
}

/** Vue lifetime over native facts; media projection and state stay with their owners. */
export function useMediaGesture(options: UseMediaGestureOptions): UseMediaGestureReturn {
  if (!getCurrentInstance()) throw Object.assign(new TypeError('useMediaGesture requires component setup'), { code: 'vue.media-gesture-scope-required' });
  if (!isRef(options.element) || options.active !== undefined && (!isRef(options.active) || typeof options.active.value !== 'boolean')
    || typeof options.onStart !== 'function' || typeof options.onMove !== 'function'
    || options.onEnd !== undefined && typeof options.onEnd !== 'function' || options.onWheel !== undefined && typeof options.onWheel !== 'function') {
    throw Object.assign(new TypeError('useMediaGesture requires reactive participation and native input hooks'), { code: 'vue.media-gesture-invalid' });
  }
  let element: UseMediaGestureOptions['element'] | undefined = options.element, active = options.active;
  let start: MediaGestureOptions['onStart'] | undefined = options.onStart, move: MediaGestureOptions['onMove'] | undefined = options.onMove;
  let end = options.onEnd, wheel = options.onWheel, host: ReturnType<typeof useHostActive> | undefined = useHostActive();
  let alive = true, native: MediaGestureConnection | undefined, epoch: object | undefined, retiring: object | undefined;
  const error = shallowRef<MediaGestureErrorCode>(), handle = createComponentHandle<Context, MediaGestureMethods>(projectMethods);
  const release = (): void => {
    const held = native, token = epoch; native = undefined; epoch = undefined; handle.release(); retiring = token;
    try { held?.disconnect(); }
    finally { retiring = undefined; error.value = undefined; }
  };
  const failed = (failure: unknown): never => { try { release(); } catch { /* Preserve the caller's failure after retirement. */ } throw failure; };
  const read = (): Input => {
    const enabled = alive && host?.value !== false && active?.value !== false;
    return [enabled ? element?.value ?? null : null, enabled];
  };
  const attach = ([target, enabled]: Input): void => {
    if (!target || !enabled) return;
    const token = {}; epoch = token;
    const result = connectMediaGesture({ element: target,
      onStart(input) {
        if (!alive || epoch !== token) return false;
        try { const accepted = start?.(input) ?? false; return accepted && alive && epoch === token; } catch (failure) { return failed(failure); }
      },
      onMove(input) { if (alive && epoch === token) { try { move?.(input); } catch (failure) { failed(failure); } } },
      onEnd(reason) {
        if (alive && (epoch === token || reason === 'disconnect' && retiring === token)) {
          try { end?.(reason); } catch (failure) { failed(failure); }
        }
      },
      ...(wheel === undefined ? {} : { onWheel(input) {
        if (!alive || epoch !== token) return false;
        try { const accepted = wheel?.(input) ?? false; return accepted && alive && epoch === token; } catch (failure) { return failed(failure); }
      } } satisfies Pick<MediaGestureOptions, 'onWheel'>),
    });
    if (result.ok) {
      if (alive && epoch === token) { native = result.value; handle.set({ connection: native, element: target }); }
      else result.value.disconnect();
    } else if (epoch === token) { epoch = undefined; error.value = result.error.code; }
  };
  useConnectionLifetime<Input>({ read, equal: (next, previous) => next[0] === previous[0] && next[1] === previous[1], connect: attach, disconnect: release, dispose() {
    alive = false; element = undefined; active = undefined; host = undefined; start = undefined; move = undefined; end = undefined; wheel = undefined;
  } });
  return Object.freeze({ ...handle.view, error: shallowReadonly(error) });
}
