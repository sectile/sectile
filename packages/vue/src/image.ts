import { getCurrentInstance, isRef, shallowReadonly, shallowRef, type Ref, type ShallowRef } from 'vue';
import { connectImage, type ImageConnection, type ImageErrorCode, type ImageSnapshot } from '@sectile/dom/image';
import { useConnectionLifetime } from './internal/connection-lifetime.js';

export type { ImageErrorCode, ImageSnapshot, ImageStatus } from '@sectile/dom/image';
/** Request attributes rendered by the caller; observation never writes them. */
export interface ImageSource {
  readonly src?: string | undefined;
  readonly srcset?: string | undefined;
  readonly sizes?: string | undefined;
  readonly crossOrigin?: string | null | undefined;
  readonly referrerPolicy?: string | undefined;
}
export interface UseImageOptions {
  readonly element: Readonly<Ref<HTMLImageElement | null>>;
  readonly source: () => ImageSource;
  readonly active?: Readonly<Ref<boolean>>;
}
export interface UseImageReturn {
  /** Undefined before mount, while inactive, and after the owning scope retires. */
  readonly snapshot: Readonly<ShallowRef<ImageSnapshot | undefined>>;
  /** Native connection admission failure; not an automatic retry or image status. */
  readonly error: Readonly<ShallowRef<ImageErrorCode | undefined>>;
}
type ImageInput = readonly [HTMLImageElement | null, boolean, string | undefined, string | undefined,
  string | undefined, string | null | undefined, string | undefined];
const sameInput = (a: ImageInput | undefined, b: ImageInput | undefined): boolean => a !== undefined && b !== undefined
  && a.every((value, index) => Object.is(value, b[index]));

/** Component-scoped shallow publication over the canonical DOM image owner. */
export function useImage(options: UseImageOptions): UseImageReturn {
  if (!getCurrentInstance()) throw Object.assign(new TypeError('useImage requires component setup'), { code: 'vue.image-scope-required' });
  if (!isRef(options.element) || typeof options.source !== 'function'
    || options.active !== undefined && (!isRef(options.active) || typeof options.active.value !== 'boolean')) {
    throw Object.assign(new TypeError('useImage requires an element ref, source getter and optional active ref'), { code: 'vue.image-invalid' });
  }
  let element: UseImageOptions['element'] | undefined = options.element;
  let source: UseImageOptions['source'] | undefined = options.source;
  let active: UseImageOptions['active'] = options.active;
  let alive = true, native: ImageConnection | undefined, epoch: object | undefined;
  const snapshot = shallowRef<ImageSnapshot>(), error = shallowRef<ImageErrorCode>();
  const read = (): ImageInput => {
    const image = element?.value ?? null, enabled = alive && active?.value !== false;
    const value = enabled && image ? source?.() : undefined;
    return [image, enabled, value?.src, value?.srcset,
      value?.sizes, value?.crossOrigin, value?.referrerPolicy];
  };
  const release = (): void => {
    epoch = undefined;
    const held = native; native = undefined;
    try { held?.disconnect(); }
    finally { snapshot.value = undefined; error.value = undefined; }
  };
  const attach = ([image, enabled]: ImageInput): void => {
    if (!enabled || !image) return;
    const token = {}; epoch = token;
    const result = connectImage({ element: image, onChange(value) {
      if (alive && epoch === token) snapshot.value = value;
    } });
    if (result.ok) {
      if (alive && epoch === token) native = result.value;
      else result.value.disconnect();
    } else if (epoch === token) { epoch = undefined; error.value = result.error.code; }
  };
  useConnectionLifetime<ImageInput>({ read, equal: sameInput, connect: attach, disconnect: release, dispose() {
    alive = false; element = undefined; source = undefined; active = undefined;
  } });
  return Object.freeze({ snapshot: shallowReadonly(snapshot), error: shallowReadonly(error) });
}
