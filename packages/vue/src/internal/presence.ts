import { onBeforeUnmount, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue';
import { createPresence } from '@sectile/dom/presence';

export function usePresence(open: ComputedRef<boolean>, element: ShallowRef<HTMLElement | undefined>): ShallowRef<boolean> {
  const present = shallowRef(open.value);
  const initialElement = element.value;
  const connection = createPresence({
    open: open.value,
    ...(initialElement === undefined ? {} : { element: initialElement }),
    onPresentChange: (next) => { present.value = next; },
  });

  watch(open, (next) => {
    if (next) connection.update(true, element.value);
  }, { flush: 'sync' });
  watch([open, element], ([next, node]) => {
    connection.update(next, node);
  }, { flush: 'post' });
  onBeforeUnmount(() => { connection.disconnect(); });
  return present;
}
