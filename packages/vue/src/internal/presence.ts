import { onBeforeUnmount, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue';

export function usePresence(open: ComputedRef<boolean>, element: ShallowRef<HTMLElement | undefined>): ShallowRef<boolean> {
  const present = shallowRef(open.value);
  let cleanup: (() => void) | undefined;
  const cancel = (): void => { cleanup?.(); cleanup = undefined; };
  watch(open, (next) => {
    cancel();
    if (next) { present.value = true; return; }
    const node = element.value; if (node === undefined) { present.value = false; return; }
    const duration = motionDuration(node); if (duration === 0) { present.value = false; return; }
    const done = (event: Event): void => { if (event.target === node) { cancel(); present.value = false; } };
    node.addEventListener('animationend', done); node.addEventListener('transitionend', done);
    const fallback = setTimeout(() => { cancel(); present.value = false; }, duration + 50);
    cleanup = () => { clearTimeout(fallback); node.removeEventListener('animationend', done); node.removeEventListener('transitionend', done); };
  }, { flush: 'post' });
  onBeforeUnmount(cancel);
  return present;
}

function motionDuration(element: HTMLElement): number {
  const view = element.ownerDocument?.defaultView; if (view === null || view === undefined) return 0;
  const style = view.getComputedStyle(element);
  return Math.max(total(style.animationDuration, style.animationDelay), total(style.transitionDuration, style.transitionDelay));
}
function total(durations: string, delays: string): number { const d = durations.split(',').map(time); const wait = delays.split(',').map(time); return d.reduce((max, value, index) => Math.max(max, value + (wait[index % Math.max(1, wait.length)] ?? 0)), 0); }
function time(value: string): number { const text = value.trim(); return text.endsWith('ms') ? Number.parseFloat(text) || 0 : (Number.parseFloat(text) || 0) * 1_000; }
