import { computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide, shallowRef, type ComputedRef, type PropType, type ShallowRef, type SlotsType, type VNodeChild } from 'vue';
import { createTimer, type TimerAction, type TimerConnection, type TimerItemType } from '@sectile/dom/timer';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface TimerRootProps { readonly countdown?: boolean; readonly startMs?: number; readonly targetMs?: number | null; readonly autoStart?: boolean; readonly intervalMs?: number; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TimerSlotProps { readonly valueMs: number; readonly running: boolean; readonly completed: boolean; readonly progress: number | null; readonly parts: Readonly<Record<TimerItemType, number>>; start(): void; pause(): void; resume(): void; reset(): void; restart(): void }
export interface TimerPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
interface TimerContext { readonly state: ComputedRef<TimerSlotProps>; readonly connection: ShallowRef<TimerConnection | undefined>; registerItem(element: HTMLElement, type: TimerItemType): void; registerAction(element: HTMLButtonElement, action: TimerAction): void }
const timerKey = Symbol('SectileTimerRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } };

export const TimerRoot = defineComponent({
  name: 'SectileTimerRoot', inheritAttrs: false,
  props: { countdown: { type: Boolean, default: false }, startMs: { type: Number, default: 0 }, targetMs: { type: Number as PropType<number | null>, default: undefined }, autoStart: { type: Boolean, default: false }, intervalMs: { type: Number, default: 100 }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  emits: { tick: (_valueMs: number): boolean => true, complete: (_valueMs: number): boolean => true },
  slots: Object as SlotsType<{ default: (props: TimerSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>(); const connection = shallowRef<TimerConnection>(); const items = new Map<TimerItemType, HTMLElement>(); const actions = new Map<TimerAction, HTMLButtonElement>();
    const valueMs = shallowRef(props.startMs); const running = shallowRef(props.autoStart); const completed = shallowRef(false); const revision = shallowRef(0);
    const parts = computed(() => splitTime(valueMs.value)); const progress = computed(() => getProgress(valueMs.value, props.startMs, props.targetMs, props.countdown));
    const refresh = (): void => { const snapshot = connection.value?.getSnapshot(); if (snapshot === undefined) return; revision.value = snapshot.revision; valueMs.value = snapshot.state.valueMs; running.value = snapshot.state.running; completed.value = snapshot.state.completed; };
    const send = (action: TimerAction): void => { connection.value?.handleEvent(action); refresh(); };
    const state = computed<TimerSlotProps>(() => ({ valueMs: valueMs.value, running: running.value, completed: completed.value, progress: progress.value, parts: parts.value, start: () => send('start'), pause: () => send('pause'), resume: () => send('resume'), reset: () => send('reset'), restart: () => send('restart') }));
    provide<TimerContext>(timerKey, { state, connection, registerItem: (element, type) => { items.set(type, element); connection.value?.setItemAttributes(element, type); }, registerAction: (element, action) => { actions.set(action, element); connection.value?.setActionAttributes(element, action); } });
    onMounted(() => { if (root.value === undefined) throw new TypeError('TimerRoot must render an HTMLElement.'); connection.value = createTimer({ root: root.value, countdown: props.countdown, startMs: props.startMs, ...(props.targetMs === undefined ? {} : { targetMs: props.targetMs }), autoStart: props.autoStart, intervalMs: props.intervalMs, onTick: (next) => emit('tick', next), onComplete: (next) => emit('complete', next), onUpdate: refresh }); for (const [type, element] of items) connection.value.setItemAttributes(element, type); for (const [action, element] of actions) connection.value.setActionAttributes(element, action); refresh(); });
    onBeforeUnmount(() => connection.value?.disconnect());
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { if (element instanceof HTMLElement) root.value = element; }, role: 'timer', 'aria-live': 'off', 'data-scope': 'timer', 'data-part': 'root', 'data-state': completed.value ? 'complete' : running.value ? 'running' : 'idle', 'data-countdown': String(props.countdown), 'data-revision': String(revision.value) }), { default: () => slots['default']?.(state.value) });
  },
});

export type TimerTickHandler = (valueMs: number) => void;
export type TimerCompleteHandler = (valueMs: number) => void;

export const TimerArea = timerPart('SectileTimerArea', 'area', 'div');
export const TimerSeparator = timerPart('SectileTimerSeparator', 'separator', 'span');
export const TimerControl = timerPart('SectileTimerControl', 'control', 'div');
export const TimerItem = defineComponent({ name: 'SectileTimerItem', inheritAttrs: false, props: { type: { type: String as PropType<TimerItemType>, required: true }, ...partProps }, setup(props, { attrs, slots }) { const root = useTimer('TimerItem'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { if (element instanceof HTMLElement) root.registerItem(element, props.type); }, 'data-scope': 'timer', 'data-part': 'item', 'data-type': props.type }), { default: () => slots['default']?.(root.state.value) ?? formatPart(props.type, root.state.value.parts[props.type]) }); } });
export const TimerActionTrigger = defineComponent({ name: 'SectileTimerActionTrigger', inheritAttrs: false, props: { action: { type: String as PropType<TimerAction>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } }, setup(props, { attrs, slots }) { const root = useTimer('TimerActionTrigger'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { if (element instanceof HTMLButtonElement) root.registerAction(element, props.action); }, type: props.as === 'button' ? 'button' : undefined, 'data-scope': 'timer', 'data-part': 'action-trigger', 'data-action': props.action }), slots); } });
function timerPart(name: string, part: string, as: PrimitiveAs) { return defineComponent({ name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: as }, asChild: { type: Boolean, default: false } }, setup(props, { attrs, slots }) { useTimer(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'timer', 'data-part': part }), slots); } }); }
function useTimer(part: string): TimerContext { const root = inject<TimerContext>(timerKey); if (root === undefined) throw new TypeError(`${part} must be used inside TimerRoot.`); return root; }
function splitTime(valueMs: number): Readonly<Record<TimerItemType, number>> { const whole = Math.floor(valueMs); return Object.freeze({ days: Math.floor(whole / 86_400_000), hours: Math.floor(whole / 3_600_000) % 24, minutes: Math.floor(whole / 60_000) % 60, seconds: Math.floor(whole / 1_000) % 60, milliseconds: whole % 1_000 }); }
function formatPart(type: TimerItemType, value: number): string { return String(value).padStart(type === 'milliseconds' ? 3 : type === 'days' ? 1 : 2, '0'); }
function getProgress(value: number, start: number, target: number | null | undefined, countdown: boolean): number | null { const resolved = target === undefined ? countdown ? 0 : null : target; if (resolved === null) return null; if (resolved === start) return 100; return Math.max(0, Math.min(100, (countdown ? (start - value) / (start - resolved) : (value - start) / (resolved - start)) * 100)); }
