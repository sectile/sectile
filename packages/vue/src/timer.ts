import { computed, defineComponent, getCurrentScope, h, inject, mergeProps, onBeforeUnmount, onMounted, onScopeDispose, provide, shallowRef, type ComputedRef, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { createTimerState, getTimerParts, getTimerProgress, type TimerPolicies, type TimerState } from '@sectile/core/timer';
import { unwrap } from '@sectile/core/result';
import { createTimer, getTimerRootAttributes, tryResolveTimerInterval, type TimerAction, type TimerItemType } from '@sectile/dom/timer';
import { Primitive, type PrimitiveAs } from './primitive.js';

/** Time policies initialize the owner once; remount to replace them. Presentation props remain reactive. */
export interface TimerRootProps { readonly countdown?: boolean | undefined; readonly startMs?: number | undefined; readonly targetMs?: number | null | undefined; readonly autoStart?: boolean | undefined; readonly intervalMs?: number | undefined; readonly label?: string | undefined; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TimerSlotProps { readonly valueMs: number; readonly running: boolean; readonly completed: boolean; readonly progress: number | null; readonly parts: Readonly<Record<TimerItemType, number>>; start(): void; pause(): void; resume(): void; reset(): void; restart(): void }
export interface TimerPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
interface TimerContext { readonly state: ComputedRef<TimerSlotProps | undefined>; registerAction(element: HTMLButtonElement, action: TimerAction): () => void }
interface Registration<E> { element: E | undefined; release: (() => void) | undefined }
const timerKey = Symbol('SectileTimerRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const TimerRoot = defineComponent({
  name: 'SectileTimerRoot', inheritAttrs: false,
  props: { countdown: { type: Boolean, default: false }, startMs: { type: Number, default: 0 }, targetMs: { type: Number as PropType<number | null>, default: undefined }, autoStart: { type: Boolean, default: false }, intervalMs: { type: Number, default: 100 }, label: { type: String, default: undefined }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  emits: { tick: (_valueMs: number): boolean => true, complete: (_valueMs: number): boolean => true },
  slots: Object as SlotsType<{ default: (props: TimerSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>(); const connection = shallowRef<ReturnType<typeof createTimer>>(); const actions = new Map<TimerAction, Registration<HTMLButtonElement>>();
    const policies: TimerPolicies = Object.freeze({ countdown: props.countdown, startMs: props.startMs,
      ...(props.targetMs === undefined ? {} : { targetMs: props.targetMs }) });
    const autoStart = props.autoStart, intervalMs = unwrap(tryResolveTimerInterval(props.intervalMs));
    const current = shallowRef<TimerState | undefined>(createTimerState(policies, policies.startMs, autoStart));
    const active = shallowRef(true), revision = shallowRef(0);
    const refresh = (): void => { if (!active.value) return; const snapshot = connection.value?.getSnapshot(); if (snapshot === undefined) return; revision.value = snapshot.revision; current.value = snapshot.state; };
    const send = (action: TimerAction): void => { connection.value?.handleEvent(action); refresh(); };
    const controls = Object.freeze({ start: () => send('start'), pause: () => send('pause'), resume: () => send('resume'), reset: () => send('reset'), restart: () => send('restart') });
    const state = computed<TimerSlotProps | undefined>(() => {
      const owned = current.value;
      return !active.value || owned === undefined ? undefined : Object.freeze({ ...owned,
        progress: unwrap(getTimerProgress(owned, policies)), parts: unwrap(getTimerParts(owned.valueMs)), ...controls });
    });
    provide<TimerContext>(timerKey, { state,
      registerAction: (element, action) => active.value ? registerElement(actions, action, element, (owned, key) => connection.value?.registerAction(owned, key)) : () => {},
    });
    onMounted(() => {
      if (!active.value) return;
      if (root.value === undefined) throw new TypeError('TimerRoot must render an HTMLElement.');
      connection.value = createTimer({ root: root.value, ...policies, autoStart, intervalMs,
        onTick: next => emit('tick', next), onComplete: next => emit('complete', next), onUpdate: refresh });
      for (const [action, entry] of actions) if (entry.element !== undefined) entry.release = connection.value.registerAction(entry.element, action);
      refresh();
    });
    const dispose = (): void => {
      if (!active.value) return;
      active.value = false;
      const owned = connection.value; connection.value = undefined; root.value = undefined; current.value = undefined;
      for (const entry of actions.values()) { entry.element = undefined; entry.release = undefined; }
      actions.clear();
      try { owned?.destroy(); } finally { void state.value; }
    };
    onBeforeUnmount(dispose);
    if (getCurrentScope() !== undefined) onScopeDispose(dispose);
    const content = (): VNodeChild => { const owned = state.value; return owned === undefined ? undefined : slots['default']?.(owned); };
    const elementRef = (element: unknown): void => { root.value = active.value && element instanceof HTMLElement ? element : undefined; };
    return (): VNodeChild => {
      const owned = state.value; if (owned === undefined) return null;
      return h(Primitive, mergeProps(attrs, getTimerRootAttributes(owned, policies, props.label === undefined ? {} : { label: props.label }),
        { as: props.as, asChild: props.asChild, elementRef, 'data-revision': String(revision.value) }), { default: content });
    };
  },
});

export type TimerTickHandler = (valueMs: number) => void;
export type TimerCompleteHandler = (valueMs: number) => void;

export const TimerArea = timerPart('SectileTimerArea', 'area', 'div');
export const TimerSeparator = timerPart('SectileTimerSeparator', 'separator', 'span');
export const TimerControl = timerPart('SectileTimerControl', 'control', 'div');
export const TimerItem = defineComponent({ name: 'SectileTimerItem', inheritAttrs: false, props: { type: { type: String as PropType<TimerItemType>, required: true }, ...partProps }, setup(props, { attrs, slots }) {
  const root = useTimer('TimerItem');
  // Vue owns this subtree, including custom slots; the DOM controller must not write its text.
  return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'timer', 'data-part': 'item', 'data-type': props.type, 'data-timer-item': props.type }), { default: () => { const owned = root.state.value; return owned === undefined ? undefined : slots['default']?.(owned) ?? formatPart(props.type, owned.parts[props.type]); } });
} });
export const TimerActionTrigger = defineComponent({ name: 'SectileTimerActionTrigger', inheritAttrs: false, props: { action: { type: String as PropType<TimerAction>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } }, setup(props, { attrs, slots }) {
  const root = useTimer('TimerActionTrigger'); let release: (() => void) | undefined, registered: HTMLButtonElement | undefined, registeredAction: TimerAction | undefined;
  const cleanup = (): void => { release?.(); release = undefined; registered = undefined; registeredAction = undefined; }; onBeforeUnmount(cleanup);
  const elementRef = (element: unknown): void => {
    if (element === registered && props.action === registeredAction) return;
    cleanup(); if (element instanceof HTMLButtonElement) { registered = element; registeredAction = props.action; release = root.registerAction(element, props.action); }
  };
  return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef, type: props.as === 'button' ? 'button' : undefined, 'data-scope': 'timer', 'data-part': 'action-trigger', 'data-action': props.action }), slots);
} });
function registerElement<K, E>(entries: Map<K, Registration<E>>, key: K, element: E, attach: (element: E, key: K) => (() => void) | undefined): () => void {
  const previous = entries.get(key);
  if (previous !== undefined) { previous.release?.(); previous.release = undefined; previous.element = undefined; }
  let entry: Registration<E> | undefined = { element, release: attach(element, key) }; entries.set(key, entry);
  return (): void => {
    const owned = entry; entry = undefined; if (owned === undefined) return;
    owned.release?.(); owned.release = undefined; owned.element = undefined;
    if (entries.get(key) === owned) entries.delete(key);
  };
}
function timerPart(name: string, part: string, as: PrimitiveAs) { return defineComponent({ name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: as }, asChild: { type: Boolean, default: false } }, setup(props, { attrs, slots }) { useTimer(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'timer', 'data-part': part }), slots); } }); }
function useTimer(part: string): TimerContext { const root = inject<TimerContext>(timerKey); if (root === undefined) throw new TypeError(`${part} must be used inside TimerRoot.`); return root; }
function formatPart(type: TimerItemType, value: number): string { return String(value).padStart(type === 'milliseconds' ? 3 : type === 'days' ? 1 : 2, '0'); }
