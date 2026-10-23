import { getCurrentInstance, shallowReadonly, shallowRef, toValue, unref, watch,
  type MaybeRefOrGetter, type Ref, type ShallowRef } from 'vue';
import { tryCreateFileUpload, type FileUploadAdapter, type FileUploadConnection, type FileUploadHostErrorCode, type FileUploadSnapshot } from '@sectile/dom/form/file-upload';
import type { FileMetadata } from '@sectile/form/files';
import { failResult, type Result, type SectileError } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import { createComponentHandle, type ComponentHandle } from '../component-handle.js';
import { useHostActive } from '../host-provider.js';
import { useConnectionLifetime } from '../internal/connection-lifetime.js';

export * from './file-upload/group.js';

export type { FileUploadAdapter, FileUploadConnection, FileUploadHostErrorCode, FileUploadProgressInput, FileUploadRequest, FileUploadSnapshot, FileUploadTask } from '@sectile/dom/form/file-upload';
export interface UseFileUploadOptions<T extends FileMetadata, Receipt = unknown> {
  readonly file: MaybeRefOrGetter<T>;
  /** Functions are adapters, never getters; use a ref for reactive replacement. */
  readonly adapter: FileUploadAdapter<NoInfer<T>, Receipt> | Readonly<Ref<FileUploadAdapter<NoInfer<T>, Receipt>>>;
  readonly active?: MaybeRefOrGetter<boolean>;
  readonly onCleanupError?: (error: unknown) => void;
}
interface UploadActions<T extends FileMetadata, Receipt> {
  start(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode>;
  cancel(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode>;
  reset(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode>;
}
export interface UseFileUploadReturn<T extends FileMetadata, Receipt = unknown> extends UploadActions<T, Receipt> {
  readonly snapshot: Readonly<ShallowRef<FileUploadSnapshot<T, Receipt> | undefined>>;
  /** Connection admission failure, not transport failure (which belongs to snapshot state). */
  readonly error: Readonly<ShallowRef<SectileError<FileUploadHostErrorCode> | undefined>>;
  readonly ready: Readonly<ShallowRef<boolean>>;
}
interface UploadControl<T extends FileMetadata, Receipt> {
  native: FacadeConnection<FileUploadConnection<T, Receipt>> | undefined;
  available: boolean;
}
function inactive(): Result<never, FileUploadHostErrorCode> {
  return failResult('transition-rejection', 'dom.file-upload-inactive', 'The upload scope is not available.');
}
function actionHandle<T extends FileMetadata, Receipt>(): ComponentHandle<UploadControl<T, Receipt>, UploadActions<T, Receipt>> {
  return createComponentHandle(current => ({
    start: () => { const control = current(); return control?.available ? control.native?.start() ?? inactive() : inactive(); },
    cancel: () => { const control = current(); return control?.available ? control.native?.cancel() ?? inactive() : inactive(); },
    reset: () => { const control = current(); return control?.available ? control.native?.reset() ?? inactive() : inactive(); },
  }));
}
/** Component-scoped shallow publication; native/Form owners retain all attempt semantics. */
export function useFileUpload<T extends FileMetadata, Receipt = unknown>(options: UseFileUploadOptions<T, Receipt>): UseFileUploadReturn<T, Receipt> {
  if (!getCurrentInstance()) throw Object.assign(new TypeError('useFileUpload requires component setup'), { code: 'vue.file-upload-scope-required' });
  let fileSource: UseFileUploadOptions<T, Receipt>['file'] | undefined = options.file;
  let adapterSource: UseFileUploadOptions<T, Receipt>['adapter'] | undefined = options.adapter;
  let activeSource = options.active, cleanupError = options.onCleanupError;
  let alive = true, epoch: object | undefined;
  const hostActive = useHostActive(), control: UploadControl<T, Receipt> = { native: undefined, available: false };
  const snapshot = shallowRef<FileUploadSnapshot<T, Receipt>>(), error = shallowRef<SectileError<FileUploadHostErrorCode>>(), ready = shallowRef(false);
  const actions = actionHandle<T, Receipt>(); actions.set(control);
  const availability = (enabled: unknown): void => {
    // Vue may deliver undefined after reporting a watcher getter failure.
    const available = enabled === true;
    control.available = available; ready.value = available && control.native !== undefined;
    if (!available && control.native?.getSnapshot().state?.status === 'uploading') control.native.cancel();
  };
  watch(() => {
    try { return hostActive.value && (activeSource === undefined || toValue(activeSource)); }
    catch (failure) { availability(false); throw failure; }
  }, availability, { flush: 'sync', immediate: true });
  const release = (): void => {
    epoch = undefined; const held = control.native; control.native = undefined;
    snapshot.value = undefined; error.value = undefined; ready.value = false;
    held?.destroy();
  };
  type Input = readonly [T | undefined, FileUploadAdapter<T, Receipt> | undefined];
  useConnectionLifetime<Input>({
    read: () => [fileSource === undefined ? undefined : toValue(fileSource), unref(adapterSource)] as const,
    equal: (a, b) => a[0] === b[0] && a[1] === b[1],
    disconnect: release,
    connect([file, adapter]) {
      if (!alive) return;
      const token = {}; epoch = token;
      const result = tryCreateFileUpload<T, Receipt>({ file: file!, adapter: adapter!,
        ...(cleanupError === undefined ? {} : { onCleanupError: cleanupError }),
        onUpdate() { if (alive && epoch === token && control.native) snapshot.value = control.native.getSnapshot(); },
      });
      if (!alive || epoch !== token) { if (result.ok) result.value.destroy(); return; }
      if (!result.ok) { error.value = result.error; return; }
      control.native = result.value; snapshot.value = result.value.getSnapshot(); ready.value = control.available;
    },
    dispose() {
      alive = false; control.available = false; actions.release();
      fileSource = undefined; adapterSource = undefined; activeSource = undefined; cleanupError = undefined;
    },
  });
  return Object.freeze({ ...actions.view, snapshot: shallowReadonly(snapshot), error: shallowReadonly(error), ready: shallowReadonly(ready) });
}
