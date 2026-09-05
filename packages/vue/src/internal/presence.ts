import { onBeforeUnmount, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue';
import { createPresence } from '@sectile/dom/presence';

export function usePresence(
  open: ComputedRef<boolean>,
  element: ShallowRef<HTMLElement | undefined>,
  onRetainedReopen?: () => void,
): ShallowRef<boolean> {
  const present = shallowRef(open.value);
  const initialElement = element.value;
  const connection = createPresence({
    open: open.value,
    ...(initialElement === undefined ? {} : { element: initialElement }),
    onPresentChange: (next) => { present.value = next; },
  });

  watch(open, (next, previous) => {
    if (!next) return;
    const retainedReopen = previous === false && connection.getPresent();
    connection.update(true, element.value);
    if (retainedReopen) onRetainedReopen?.();
  }, { flush: 'sync' });
  watch([open, element], ([next, node]) => {
    connection.update(next, node);
  }, { flush: 'post' });
  onBeforeUnmount(() => { connection.disconnect(); });
  return present;
}
