import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue';
import type { Result } from '@sectile/core/result';
import { unwrap } from '@sectile/core/result';
import type { DOMLayerPresentationListener, DOMLayerPresentationSnapshot, DOMLayerPresentationSubscription, DOMLayerReparentErrorCode } from '@sectile/dom/dialog';
import { provideHostActive, useHostActive, useHostLayer, useHostLayerParent } from '../host-provider.js';

interface PopupPresentationConnection {
  getActive(): boolean;
  getLayerOrder?(): number | null;
  subscribeLayerPresentation?(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  syncLayerParent?(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  suspend(): void;
  resume(): void;
}

/** Coordinate borrowed native presentation without owning the component's model. */
export function usePopupPresentation<Connection extends PopupPresentationConnection>(options: {
  readonly connection: ShallowRef<Connection | undefined>;
  readonly open: ComputedRef<boolean>;
  readonly connect: () => void;
  readonly refresh: () => void;
  readonly trackLayerHost?: boolean;
}) {
  const hostAvailability = useHostActive();
  const layerHost = useHostLayer();
  const parent = useHostLayerParent();
  const mayOpen = (): boolean => hostAvailability.value && (parent?.available.value ?? true);
  const availability = computed(() => hostAvailability.value && (!options.open.value || (parent?.available.value ?? true)));
  const active = shallowRef(availability.value);
  const presentation = shallowRef<DOMLayerPresentationSnapshot>();
  const contentPresence = shallowRef<ShallowRef<boolean>>();
  let stopPresentation: (() => void) | undefined;
  let dirty = false, reconnectPending = false, mounted = false, disposed = false;
  provideHostActive(active);

  const update = (): void => {
    const current = options.connection.value;
    if (!current) return;
    if (!current.getActive()) active.value = false;
    else if (current.getLayerOrder?.() != null && current.subscribeLayerPresentation && presentation.value?.phase !== 'active') {
      stopPresentation?.();
      stopPresentation = unwrap(current.subscribeLayerPresentation(next => { presentation.value = next; }));
    }
  };
  const release = (): void => {
    stopPresentation?.(); stopPresentation = undefined; presentation.value = undefined;
  };
  const suspend = (): void => {
    const current = options.connection.value;
    try { current?.suspend(); }
    finally { if (!current || !current.getActive()) active.value = false; }
  };
  const reconnect = (): void => {
    if (disposed) return;
    if (!availability.value) { dirty = true; return; }
    if (options.connection.value?.getActive() && !options.open.value && contentPresence.value?.value) {
      reconnectPending = true; return;
    }
    if (options.connection.value) suspend();
    dirty = false; reconnectPending = false;
    try {
      options.connect();
      active.value = options.connection.value?.getActive() ?? availability.value;
      update();
    } catch (error) {
      dirty = true;
      try { suspend(); } catch { /* Preserve the initiating construction/projection failure. */ }
      throw error;
    }
  };

  onMounted(() => { mounted = true; });
  onBeforeUnmount(() => { disposed = true; mounted = false; release(); });
  if (options.trackLayerHost) watch(layerHost, () => { if (mounted && !disposed) reconnect(); else dirty = true; }, { flush: 'post' });
  watch(hostAvailability, next => { if (!next && !disposed) suspend(); }, { flush: 'sync' });
  watch(availability, next => {
    if (!mounted || disposed) return;
    if (!next) { suspend(); return; }
    if (dirty || !options.connection.value) reconnect();
    else {
      try {
        options.connection.value.resume(); active.value = options.connection.value.getActive();
        options.refresh(); update();
      } catch (error) {
        dirty = true;
        try { suspend(); } catch { /* Preserve the initiating resumption/projection failure. */ }
        throw error;
      }
    }
  }, { flush: 'post' });
  watch([() => contentPresence.value?.value, options.open], () => {
    if (mounted && reconnectPending && (options.open.value || !contentPresence.value?.value)) reconnect();
  }, { flush: 'post' });
  if (parent) watch([
    options.connection, () => presentation.value?.generation, () => presentation.value?.phase,
    parent.element, () => parent.presentation.value?.generation, () => parent.presentation.value?.phase,
  ], () => {
    const element = parent.element.value;
    if (!disposed && element && presentation.value?.phase === 'active' && parent.presentation.value?.phase === 'active') {
      const result = options.connection.value?.syncLayerParent?.(element);
      if (result) unwrap(result);
    }
  }, { flush: 'post' });

  return {
    active, presentation, availability, layerHost, mayOpen, update, release, reconnect,
    invalidate: (): void => { dirty = true; },
    prepareModelUpdate: (): void => { if (options.open.value && !mayOpen()) suspend(); },
    registerPresence: (present: ShallowRef<boolean>): (() => void) => {
      contentPresence.value = present;
      return () => { if (contentPresence.value === present) contentPresence.value = undefined; };
    },
  };
}
