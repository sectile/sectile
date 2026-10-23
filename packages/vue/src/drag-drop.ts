import { getCurrentInstance, isRef, shallowReadonly, shallowRef, toRaw, toValue, type MaybeRefOrGetter, type Ref, type ShallowRef } from 'vue';
import { connectDragSource, connectDropTarget, type DataTransferConnection, type DataTransferErrorCode, type DataTransferFormat, type DataTransferOperation, type DataTransferSnapshot, type DragSourceOptions, type DropTargetOptions } from '@sectile/dom/drag-drop';
import { createComponentHandle } from './component-handle.js';
import { useHostActive } from './host-provider.js';
import { useConnectionLifetime } from './internal/connection-lifetime.js';
import type { Result } from '@sectile/core/result';

export { createDataTransferFormat, tryCreateDataTransferFormat } from '@sectile/dom/drag-drop';
export type { DataTransferCommit, DataTransferErrorCode, DataTransferFormat, DataTransferFormatOptions, DataTransferOperation, DataTransferPayload, DataTransferRequest, DataTransferSnapshot } from '@sectile/dom/drag-drop';

interface ReactiveTransferOptions<Value> {
  readonly element: Readonly<Ref<HTMLElement | null>>;
  readonly active?: Readonly<Ref<boolean>>;
  readonly format: MaybeRefOrGetter<DataTransferFormat<Value>>;
  readonly operations: MaybeRefOrGetter<readonly DataTransferOperation[]>;
}
export interface UseDragSourceOptions<Value> extends ReactiveTransferOptions<Value>, Omit<DragSourceOptions<Value>, 'element' | 'format' | 'operations' | 'onChange'> {}
export interface UseDropTargetOptions<Value> extends ReactiveTransferOptions<Value>, Omit<DropTargetOptions<Value>, 'element' | 'format' | 'operations' | 'maxTypes' | 'onChange'> {
  readonly maxTypes: MaybeRefOrGetter<number>;
}
export interface UseDataTransferReturn {
  readonly snapshot: Readonly<ShallowRef<DataTransferSnapshot | undefined>>;
  /** Connection admission failure; event rejection is delivered through onReject. */
  readonly error: Readonly<ShallowRef<DataTransferErrorCode | undefined>>;
  cancel(): void;
}
type Methods = Pick<UseDataTransferReturn, 'cancel'>;
type Input<Value> = readonly [HTMLElement | null, DataTransferFormat<Value> | undefined, readonly DataTransferOperation[] | undefined,
  number | undefined, DataTransferOperation | undefined, DataTransferOperation | undefined, number | undefined, boolean];
type NativeConfiguration<Value> = Pick<DragSourceOptions<Value>, 'element' | 'format' | 'operations' | 'onChange' | 'onReject'>;
interface Hooks<Value> {
  readonly getValue: DragSourceOptions<Value>['getValue'] | undefined;
  readonly onEnd: DragSourceOptions<Value>['onEnd'];
  readonly onDrop: DropTargetOptions<Value>['onDrop'] | undefined;
}
type Connector<Value> = (config: NativeConfiguration<Value>, hooks: Hooks<Value>, maxTypes: number | undefined) => Result<DataTransferConnection, DataTransferErrorCode>;
function connectSource<Value>(config: NativeConfiguration<Value>, hooks: Hooks<Value>): Result<DataTransferConnection, DataTransferErrorCode> {
  return connectDragSource({ ...config, getValue: hooks.getValue!, ...(hooks.onEnd === undefined ? {} : { onEnd: hooks.onEnd }) });
}
function connectTarget<Value>(config: NativeConfiguration<Value>, hooks: Hooks<Value>, maxTypes: number | undefined): Result<DataTransferConnection, DataTransferErrorCode> {
  return connectDropTarget({ ...config, maxTypes: maxTypes!, onDrop: hooks.onDrop! });
}
function projectMethods(current: () => DataTransferConnection | null): Methods {
  return Object.freeze({ cancel: () => current()?.cancel() });
}
function sameInput<Value>(next: Input<Value>, previous: Input<Value>): boolean {
  // Compare the complete admitted operation domain, not a freshly created array identity.
  return next[0] === previous[0] && next[1] === previous[1] && next[3] === previous[3] && next[4] === previous[4]
    && next[5] === previous[5] && next[6] === previous[6] && next[7] === previous[7];
}
function useNativeTransfer<Value>(kind: 'source' | 'target', options: UseDragSourceOptions<Value> | UseDropTargetOptions<Value>, connect: Connector<Value>): UseDataTransferReturn {
  if (!getCurrentInstance()) throw Object.assign(new TypeError('Native transfer observation requires component setup'), { code: 'vue.data-transfer-scope-required' });
  if (!isRef(options.element) || options.active !== undefined && (!isRef(options.active) || typeof options.active.value !== 'boolean'))
    throw Object.assign(new TypeError('Native transfer observation requires element and activity refs'), { code: 'vue.data-transfer-invalid' });
  let element: ReactiveTransferOptions<Value>['element'] | undefined = options.element, active = options.active;
  let format: ReactiveTransferOptions<Value>['format'] | undefined = options.format, operations = options.operations;
  let maxTypes = kind === 'target' ? (options as UseDropTargetOptions<Value>).maxTypes : undefined;
  let getValue = kind === 'source' ? (options as UseDragSourceOptions<Value>).getValue : undefined;
  let onEnd = kind === 'source' ? (options as UseDragSourceOptions<Value>).onEnd : undefined;
  let onDrop = kind === 'target' ? (options as UseDropTargetOptions<Value>).onDrop : undefined;
  let onReject = options.onReject, host: ReturnType<typeof useHostActive> | undefined = useHostActive();
  let alive = true, native: DataTransferConnection | undefined, epoch: object | undefined;
  const snapshot = shallowRef<DataTransferSnapshot>(), error = shallowRef<DataTransferErrorCode>();
  const handle = createComponentHandle<DataTransferConnection, Methods>(projectMethods);
  const read = (): Input<Value> => {
    const target = alive && host?.value !== false && active?.value !== false ? element?.value ?? null : null;
    if (!target) return [null, undefined, undefined, undefined, undefined, undefined, undefined, false];
    const choices = toValue(operations);
    return [target, toRaw(toValue(format)), choices, choices?.length, choices?.[0], choices?.[1], toValue(maxTypes), Array.isArray(choices)];
  };
  const release = (): void => {
    epoch = undefined; handle.release(); const held = native; native = undefined;
    try { held?.disconnect(); } finally { snapshot.value = undefined; error.value = undefined; }
  };
  const attach = ([target, currentFormat, choices, , , , limit]: Input<Value>): void => {
    if (!target) return;
    const token = {}; epoch = token;
    const common = { element: target, format: currentFormat!, operations: choices!,
      onChange(value: DataTransferSnapshot) { if (alive && epoch === token) snapshot.value = value; },
      ...(onReject === undefined ? {} : { onReject }) };
    const result = connect(common, { getValue, onEnd, onDrop }, limit);
    if (result.ok) {
      if (alive && epoch === token) { native = result.value; handle.set(native); snapshot.value = native.getSnapshot(); }
      else result.value.disconnect();
    } else if (epoch === token) { epoch = undefined; snapshot.value = undefined; error.value = result.error.code; }
  };
  useConnectionLifetime<Input<Value>>({ read, equal: sameInput, connect: attach, disconnect: release, dispose() {
    alive = false; element = undefined; active = undefined; format = undefined; operations = [];
    maxTypes = undefined; getValue = undefined; onEnd = undefined; onDrop = undefined; onReject = undefined; host = undefined;
  } });
  return Object.freeze({ ...handle.view, snapshot: shallowReadonly(snapshot), error: shallowReadonly(error) });
}

export function useDragSource<Value>(options: UseDragSourceOptions<Value>): UseDataTransferReturn {
  return useNativeTransfer('source', options, connectSource);
}
export function useDropTarget<Value>(options: UseDropTargetOptions<Value>): UseDataTransferReturn {
  return useNativeTransfer('target', options, connectTarget);
}
