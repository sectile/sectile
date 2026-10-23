import { getCurrentInstance, getCurrentScope, onScopeDispose, shallowReadonly, shallowRef, toValue, unref, watch,
  type MaybeRefOrGetter, type Ref, type ShallowRef, type WatchStopHandle } from 'vue';
import { tryCreateFileUploadGroup, type FileUploadAdapter, type FileUploadGroupConnection, type FileUploadGroupErrorCode,
  type FileUploadGroupSnapshot, type FileUploadItem, type FileUploadItemSnapshot } from '@sectile/dom/form/file-upload';
import type { FileMetadata } from '@sectile/form/files';
import type { StableID } from '@sectile/core/identity';
import { failResult, type Result, type SectileError } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import { createComponentHandle } from '../../component-handle.js';
import { useHostActive } from '../../host-provider.js';
import { useConnectionLifetime } from '../../internal/connection-lifetime.js';

export type { FileUploadItem, FileUploadItemSnapshot, FileUploadGroupCounts, FileUploadGroupSnapshot, FileUploadGroupState, FileUploadGroupErrorCode } from '@sectile/dom/form/file-upload';
export interface UseFileUploadGroupOptions<ID extends StableID, T extends FileMetadata, Receipt = unknown> {
  readonly items: MaybeRefOrGetter<readonly FileUploadItem<ID, T>[]>;
  readonly adapter: FileUploadAdapter<NoInfer<T>, Receipt> | Readonly<Ref<FileUploadAdapter<NoInfer<T>, Receipt>>>;
  readonly concurrency?: MaybeRefOrGetter<number>;
  readonly maxFiles?: number;
  readonly active?: MaybeRefOrGetter<boolean>;
  readonly onCleanupError?: (error: unknown) => void;
}
export interface UseFileUploadGroupReturn<ID extends StableID, T extends FileMetadata, Receipt = unknown> {
  readonly snapshot: Readonly<ShallowRef<FileUploadGroupSnapshot<ID> | undefined>>;
  readonly error: Readonly<ShallowRef<SectileError<FileUploadGroupErrorCode> | undefined>>;
  readonly ready: Readonly<ShallowRef<boolean>>;
  /** Read an admitted item without registering a scoped subscription. */
  getItem(id: ID): FileUploadItemSnapshot<T, Receipt> | undefined;
  start(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode>;
  cancel(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode>;
  reset(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode>;
  /** Register in the current Vue scope; only this key's changes publish to the ref. */
  useItem(id: MaybeRefOrGetter<ID>): Readonly<ShallowRef<FileUploadItemSnapshot<T, Receipt> | undefined>>;
}
interface Row<ID extends StableID, T extends FileMetadata, Receipt> {
  id: ID | undefined;
  source: MaybeRefOrGetter<ID> | undefined;
  readonly value: ShallowRef<FileUploadItemSnapshot<T, Receipt> | undefined>;
  stop: WatchStopHandle | undefined;
}
interface Control<ID extends StableID, T extends FileMetadata, Receipt> {
  native: FacadeConnection<FileUploadGroupConnection<ID, T, Receipt>> | undefined;
  available: boolean;
  readonly rows: Set<Row<ID, T, Receipt>>;
  readonly observed: Map<ID, Set<Row<ID, T, Receipt>>>;
}
function inactive(): Result<never, FileUploadGroupErrorCode> {
  return failResult('transition-rejection', 'dom.file-upload-group-inactive', 'The upload group scope is not available.');
}
function detach<ID extends StableID, T extends FileMetadata, Receipt>(row: Row<ID, T, Receipt>, control: Control<ID, T, Receipt> | null): void {
  if (row.id !== undefined && control) {
    const bucket = control.observed.get(row.id); bucket?.delete(row);
    if (bucket?.size === 0) control.observed.delete(row.id);
  }
  row.id = undefined; row.value.value = undefined;
}
function observe<ID extends StableID, T extends FileMetadata, Receipt>(source: MaybeRefOrGetter<ID>, current: () => Control<ID, T, Receipt> | null): Readonly<ShallowRef<FileUploadItemSnapshot<T, Receipt> | undefined>> {
  if (!getCurrentScope()) throw Object.assign(new TypeError('useItem requires a Vue scope'), { code: 'vue.file-upload-item-scope-required' });
  const row: Row<ID, T, Receipt> = { id: undefined, source, value: shallowRef(), stop: undefined };
  let alive = true;
  onScopeDispose(() => {
    alive = false; const control = current(); detach(row, control); control?.rows.delete(row);
    row.source = undefined; row.stop?.(); row.stop = undefined;
  });
  const control = current();
  if (control) {
    control.rows.add(row);
    const stop = watch(() => {
      try { return row.source === undefined ? undefined : toValue(row.source); }
      catch (failure) { detach(row, current()); throw failure; }
    }, id => {
      const held = current(); detach(row, held);
      if (!alive || !held || id === undefined) return;
      row.id = id;
      let bucket = held.observed.get(id); if (!bucket) { bucket = new Set(); held.observed.set(id, bucket); }
      bucket.add(row); row.value.value = held.native?.getItemSnapshot(id);
    }, { flush: 'sync', immediate: true });
    if (alive && current()) row.stop = stop; else stop();
  } else row.source = undefined;
  return shallowReadonly(row.value);
}
/** Vue owns keyed shallow publication; the native group owns all execution and membership semantics. */
export function useFileUploadGroup<const ID extends StableID, T extends FileMetadata, Receipt = unknown>(options: UseFileUploadGroupOptions<ID, T, Receipt>): UseFileUploadGroupReturn<ID, T, Receipt> {
  if (!getCurrentInstance()) throw Object.assign(new TypeError('useFileUploadGroup requires component setup'), { code: 'vue.file-upload-scope-required' });
  let itemsSource: UseFileUploadGroupOptions<ID, T, Receipt>['items'] | undefined = options.items;
  let adapterSource: UseFileUploadGroupOptions<ID, T, Receipt>['adapter'] | undefined = options.adapter;
  let concurrencySource = options.concurrency, activeSource = options.active, maxFiles = options.maxFiles, cleanupError = options.onCleanupError;
  let alive = true, epoch: object | undefined;
  const control: Control<ID, T, Receipt> = { native: undefined, available: false, rows: new Set(), observed: new Map() };
  const snapshot = shallowRef<FileUploadGroupSnapshot<ID>>(), error = shallowRef<SectileError<FileUploadGroupErrorCode>>(), ready = shallowRef(false);
  const handle = createComponentHandle<Control<ID, T, Receipt>, Pick<UseFileUploadGroupReturn<ID, T, Receipt>, 'getItem' | 'start' | 'cancel' | 'reset' | 'useItem'>>(current => {
    const command = (kind: 'start' | 'cancel' | 'reset', ids: readonly ID[] | undefined): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode> => {
      const held = current(); return held?.available ? held.native?.[kind](ids) ?? inactive() : inactive();
    };
    return { getItem: id => current()?.native?.getItemSnapshot(id), start: ids => command('start', ids), cancel: ids => command('cancel', ids), reset: ids => command('reset', ids), useItem: id => observe(id, current) };
  });
  handle.set(control);
  const hostActive = useHostActive();
  const availability = (enabled: unknown): void => {
    control.available = enabled === true; ready.value = control.available && control.native !== undefined;
    if (!control.available) control.native?.cancel();
  };
  watch(() => {
    try { return hostActive.value && (activeSource === undefined || toValue(activeSource)); }
    catch (failure) { availability(false); throw failure; }
  }, availability, { flush: 'sync', immediate: true });
  // A row's synchronous watcher may deactivate during a native transaction.
  // The paired post-flush attempt retires work after that transaction releases.
  watch(ready, available => { if (!available && !control.available) control.native?.cancel(); }, { flush: 'post' });
  const release = (): void => {
    epoch = undefined; const held = control.native; control.native = undefined;
    snapshot.value = undefined; error.value = undefined; ready.value = false;
    for (const row of control.rows) row.value.value = undefined;
    held?.destroy();
  };
  type Input = readonly [readonly FileUploadItem<ID, T>[] | undefined, FileUploadAdapter<T, Receipt> | undefined, number];
  const read = (): Input => [itemsSource === undefined ? undefined : toValue(itemsSource), unref(adapterSource), concurrencySource === undefined ? 3 : toValue(concurrencySource)];
  useConnectionLifetime<Input>({
    read,
    equal: (a, b) => control.native !== undefined && a[1] === b[1],
    disconnect: release,
    connect([items, adapter, concurrency]) {
      if (!alive) return;
      const token = {}; epoch = token;
      const result = tryCreateFileUploadGroup<ID, T, Receipt>({ items: items!, adapter: adapter!, concurrency,
        ...(maxFiles === undefined ? {} : { maxFiles }), ...(cleanupError === undefined ? {} : { onCleanupError: cleanupError }),
        onItemUpdate(id, item) {
          if (!alive || epoch !== token) return;
          const bucket = control.observed.get(id);
          if (bucket) for (const row of [...bucket]) if (alive && epoch === token && row.id === id) row.value.value = item;
        },
        onUpdate() { if (alive && epoch === token && control.native) snapshot.value = control.native.getSnapshot(); },
      });
      if (!alive || epoch !== token) { if (result.ok) result.value.destroy(); return; }
      if (!result.ok) { error.value = result.error; return; }
      control.native = result.value; snapshot.value = result.value.getSnapshot();
      if (!alive || epoch !== token) return;
      ready.value = control.available;
      for (const row of [...control.rows]) if (alive && epoch === token && row.id !== undefined) row.value.value = result.value.getItemSnapshot(row.id);
    },
    dispose() {
      alive = false; control.available = false; handle.release();
      itemsSource = undefined; adapterSource = undefined; concurrencySource = undefined; activeSource = undefined; maxFiles = undefined; cleanupError = undefined;
      for (const row of control.rows) { row.source = undefined; row.stop?.(); row.stop = undefined; row.id = undefined; row.value.value = undefined; }
      control.rows.clear(); control.observed.clear();
    },
  });
  watch(() => { try { return read(); } catch { return undefined; } }, (input, previous) => {
    const native = control.native;
    if (!alive || !native || !input) return;
    let failure: SectileError<FileUploadGroupErrorCode> | undefined;
    if (!previous || input[0] !== previous[0]) { const result = native.syncItems(input[0]!); if (result && !result.ok) failure = result.error; }
    if (!previous || input[2] !== previous[2]) { const result = native.setConcurrency(input[2]); if (result && !result.ok) failure ??= result.error; }
    error.value = failure;
  }, { flush: 'post' });
  return Object.freeze({ ...handle.view, snapshot: shallowReadonly(snapshot), error: shallowReadonly(error), ready: shallowReadonly(ready) });
}
