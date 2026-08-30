import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import {
  tryCreateChartViewState,
  type ChartAxisView,
  type ChartAxisViewUpdateMode,
  type ChartAxisViewWindow,
  type ChartCategory,
  type ChartViewState,
} from './contract.js';
import { chartFail, chartOK } from './internal/result.js';
import type { ResolvedChartAxis } from './layout.js';
import type { ChartResult } from './result.js';

export interface ChartAxisViewCapability<ID extends StableID = StableID> {
  readonly axisID: ID;
  readonly initial?: ChartAxisViewWindow;
  readonly minimumSpan?: number;
  readonly maximumSpan?: number;
  readonly update?: ChartAxisViewUpdateMode;
}

export type ChartViewPhase = 'start' | 'update' | 'end' | 'settled';

export type ChartViewAction<ID extends StableID = StableID> =
  | { readonly type: 'set-axis-view'; readonly axisID: ID; readonly visible: ChartAxisViewWindow; readonly phase?: ChartViewPhase }
  | { readonly type: 'pan-axis-view'; readonly axisID: ID; readonly fraction: number; readonly phase?: ChartViewPhase }
  | { readonly type: 'zoom-axis-view'; readonly axisID: ID; readonly factor: number; readonly anchor?: number; readonly phase?: ChartViewPhase }
  | { readonly type: 'reset-axis-view'; readonly axisID: ID; readonly to?: 'initial' | 'latest'; readonly phase?: ChartViewPhase };

export interface ChartViewWork {
  readonly indexedAxes: number;
  readonly axisLookups: number;
  readonly mathOperations: number;
  readonly publishedAxes: number;
}

export interface ChartViewTransition<ID extends StableID = StableID> {
  readonly state: ChartViewState<ID>;
  readonly axis: ChartAxisView<ID>;
  readonly phase: ChartViewPhase;
  readonly changed: boolean;
  readonly work: ChartViewWork;
}

const stateIndexes = new WeakMap<object, ReadonlyMap<StableID, number>>();

export function createChartAxisViewState<ID extends StableID>(
  axes: readonly ResolvedChartAxis<ID>[],
  capabilities: readonly ChartAxisViewCapability<ID>[],
): ChartViewState<ID> {
  return unwrap(tryCreateChartAxisViewState(axes, capabilities));
}

export function tryCreateChartAxisViewState<ID extends StableID>(
  axes: readonly ResolvedChartAxis<ID>[],
  capabilities: readonly ChartAxisViewCapability<ID>[],
): ChartResult<ChartViewState<ID>> {
  if (!Array.isArray(axes) || !Array.isArray(capabilities)) return invalidView('Chart axis view creation requires axis and capability arrays.');
  const available = new Map(axes.map((axis) => [axis.id, axis]));
  const views: ChartAxisView<ID>[] = [];
  for (const capability of capabilities) {
    if (capability === null || typeof capability !== 'object') return invalidView('Chart axis view capability must be an object.');
    const axis = available.get(capability.axisID);
    if (axis === undefined) return chartFail('construction', 'chart-axis-missing', 'Chart axis view capability references a missing axis.', { id: capability.axisID });
    const base = baseWindow(axis);
    const initial = capability.initial ?? base;
    views.push({
      axisID: axis.id,
      orientation: axis.orientation,
      scale: axis.scale,
      base,
      initial,
      visible: initial,
      ...(capability.minimumSpan === undefined ? {} : { minimumSpan: capability.minimumSpan }),
      ...(capability.maximumSpan === undefined ? {} : { maximumSpan: capability.maximumSpan }),
      update: capability.update ?? 'preserve',
      followingEnd: (capability.update ?? 'preserve') === 'follow-end' && windowEnd(initial) === windowEnd(base),
      ...(axis.domain.kind === 'categorical' ? { categories: axis.domain.values } : {}),
      revision: 0,
    });
  }
  const state = tryCreateChartViewState(views);
  if (!state.ok) return state;
  bindIndex(state.value, createIndex(state.value.axes));
  return state;
}

export function chartAxisView<ID extends StableID>(state: ChartViewState<ID>, axisID: ID): ChartAxisView<ID> | null {
  const lookup = stateIndex(state);
  const index = lookup.index.get(axisID);
  return index === undefined ? null : state.axes[index] ?? null;
}

export function reduceChartViewAction<ID extends StableID>(
  state: ChartViewState<ID>,
  action: ChartViewAction<ID>,
): ChartResult<ChartViewTransition<ID>> {
  if (state === null || typeof state !== 'object' || !Array.isArray(state.axes)
    || action === null || typeof action !== 'object') return invalidView('Chart view action and state must be objects.');
  const lookup = stateIndex(state);
  const position = lookup.index.get(action.axisID);
  if (position === undefined) return chartFail('transition-rejection', 'chart-axis-missing', 'Chart view action references a disabled or missing axis.', { id: action.axisID });
  const axis = state.axes[position] as ChartAxisView<ID>;
  const phase = action.phase ?? 'settled';
  if (!validPhase(phase)) return invalidView('Chart view action phase is invalid.');
  let visible: ChartAxisViewWindow;
  let followingEnd = false;
  let mathOperations = 0;
  if (action.type === 'set-axis-view') {
    if (!compatibleWindow(axis, action.visible)) return invalidView('Set-axis-view window does not match the axis scale.');
    visible = constrainWindow(axis, action.visible, 0.5);
    mathOperations = 12;
  } else if (action.type === 'pan-axis-view') {
    if (!finite(action.fraction)) return invalidView('Chart pan fraction must be finite.');
    visible = panWindow(axis, action.fraction);
    mathOperations = axis.scale === 'logarithmic' ? 18 : 10;
  } else if (action.type === 'zoom-axis-view') {
    const anchor = action.anchor ?? 0.5;
    if (!finite(action.factor) || action.factor <= 0 || !finite(anchor) || anchor < 0 || anchor > 1) {
      return invalidView('Chart zoom factor must be positive and its normalized anchor must be between zero and one.');
    }
    visible = zoomWindow(axis, action.factor, anchor);
    mathOperations = axis.scale === 'logarithmic' ? 24 : 14;
  } else if (action.type === 'reset-axis-view') {
    if (action.to !== undefined && action.to !== 'initial' && action.to !== 'latest') return invalidView('Chart reset target is invalid.');
    if (action.to === 'latest') {
      visible = latestWindow(axis);
      followingEnd = axis.update === 'follow-end';
    } else visible = axis.initial ?? axis.base;
    mathOperations = 8;
  } else return invalidView('Chart view action type is invalid.');
  if (sameWindow(axis.visible, visible) && !(action.type === 'reset-axis-view' && action.to === 'latest')) {
    followingEnd = axis.followingEnd ?? false;
  }
  const changed = !sameWindow(axis.visible, visible) || axis.followingEnd !== followingEnd;
  if (!changed) return chartOK(Object.freeze({
    state,
    axis,
    phase,
    changed: false,
    work: Object.freeze({ indexedAxes: lookup.built, axisLookups: 1, mathOperations, publishedAxes: 0 }),
  }));
  if (state.revision === Number.MAX_SAFE_INTEGER || axis.revision === Number.MAX_SAFE_INTEGER) return revisionExhausted();
  const nextAxis = Object.freeze({ ...axis, visible, followingEnd, revision: axis.revision + 1 });
  const nextAxes = state.axes.slice();
  nextAxes[position] = nextAxis;
  const next = Object.freeze({ revision: state.revision + 1, axes: Object.freeze(nextAxes) });
  bindIndex(next, lookup.index);
  return chartOK(Object.freeze({
    state: next,
    axis: nextAxis,
    phase,
    changed: true,
    work: Object.freeze({ indexedAxes: lookup.built, axisLookups: 1, mathOperations, publishedAxes: nextAxes.length }),
  }));
}

export function reconcileChartAxisViewState<ID extends StableID>(
  previous: ChartViewState<ID>,
  axes: readonly ResolvedChartAxis<ID>[],
  capabilities: readonly ChartAxisViewCapability<ID>[],
): ChartResult<ChartViewState<ID>> {
  const created = tryCreateChartAxisViewState(axes, capabilities);
  if (!created.ok) return created;
  const previousIndex = stateIndex(previous).index;
  let changed = previous.axes.length !== created.value.axes.length;
  const reconciled: ChartAxisView<ID>[] = [];
  for (let nextPosition = 0; nextPosition < created.value.axes.length; nextPosition += 1) {
    const proposed = created.value.axes[nextPosition] as ChartAxisView<ID>;
    const priorPosition = previousIndex.get(proposed.axisID);
    const prior = priorPosition === undefined ? undefined : previous.axes[priorPosition];
    if (prior === undefined || prior.scale !== proposed.scale) {
      reconciled.push(proposed);
      changed = true;
      continue;
    }
    if (priorPosition !== nextPosition) changed = true;
    const visible = reconcileVisible(prior, proposed);
    const followingEnd = proposed.update === 'follow-end' && prior.followingEnd === true;
    if (prior.revision === Number.MAX_SAFE_INTEGER && (!sameAxisBase(prior, proposed) || !sameWindow(prior.visible, visible))) {
      return revisionExhausted();
    }
    const next = Object.freeze({
      ...proposed,
      visible,
      followingEnd,
      revision: sameAxisBase(prior, proposed) && sameWindow(prior.visible, visible)
        ? prior.revision
        : prior.revision + 1,
    });
    if (!sameAxisView(prior, next)) changed = true;
    reconciled.push(sameAxisView(prior, next) ? prior : next);
  }
  if (!changed) return chartOK(previous);
  if (previous.revision === Number.MAX_SAFE_INTEGER) return revisionExhausted();
  const state = Object.freeze({ revision: previous.revision + 1, axes: Object.freeze(reconciled) });
  bindIndex(state, createIndex(state.axes));
  return chartOK(state);
}

function reconcileVisible<ID extends StableID>(prior: ChartAxisView<ID>, next: ChartAxisView<ID>): ChartAxisViewWindow {
  if (next.update === 'reset') return next.initial ?? next.base;
  if (next.update === 'follow-end' && prior.followingEnd === true) return latestWindow({ ...next, visible: prior.visible });
  if (prior.visible.kind === 'categorical' && next.base.kind === 'categorical') {
    const preserved = preserveCategories(prior, next);
    return constrainWindow(next, preserved, 0.5);
  }
  return constrainWindow(next, prior.visible, 0.5);
}

function preserveCategories<ID extends StableID>(prior: ChartAxisView<ID>, next: ChartAxisView<ID>): ChartCategoricalWindow {
  if (prior.visible.kind !== 'categorical' || next.base.kind !== 'categorical'
    || prior.categories === undefined || next.categories === undefined) {
    return prior.visible as ChartCategoricalWindow;
  }
  const first = prior.categories[prior.visible.start - windowStart(prior.base)];
  const last = prior.categories[prior.visible.end - windowStart(prior.base) - 1];
  const firstIndex = first === undefined ? -1 : next.categories.indexOf(first as ChartCategory);
  const lastIndex = last === undefined ? -1 : next.categories.indexOf(last as ChartCategory);
  return firstIndex >= 0 && lastIndex >= firstIndex
    ? Object.freeze({ kind: 'categorical', start: windowStart(next.base) + firstIndex, end: windowStart(next.base) + lastIndex + 1 })
    : prior.visible;
}

type ChartCategoricalWindow = Extract<ChartAxisViewWindow, { readonly kind: 'categorical' }>;

function panWindow<ID extends StableID>(axis: ChartAxisView<ID>, fraction: number): ChartAxisViewWindow {
  const current = transformed(axis, axis.visible);
  const shift = (current.end - current.start) * fraction;
  return fromTransformed(axis, constrainTransformed(axis, current.start + shift, current.end + shift, 0.5));
}

function zoomWindow<ID extends StableID>(axis: ChartAxisView<ID>, factor: number, anchor: number): ChartAxisViewWindow {
  const current = transformed(axis, axis.visible);
  const anchorValue = current.start + (current.end - current.start) * anchor;
  const span = (current.end - current.start) / factor;
  const start = anchorValue - span * anchor;
  return fromTransformed(axis, constrainTransformed(axis, start, start + span, anchor));
}

function constrainWindow<ID extends StableID>(axis: ChartAxisView<ID>, window: ChartAxisViewWindow, anchor: number): ChartAxisViewWindow {
  const desired = transformed(axis, window);
  return fromTransformed(axis, constrainTransformed(axis, desired.start, desired.end, anchor));
}

function constrainTransformed<ID extends StableID>(
  axis: ChartAxisView<ID>,
  inputStart: number,
  inputEnd: number,
  anchor: number,
): { readonly start: number; readonly end: number } {
  const base = transformed(axis, axis.base);
  const baseSpan = base.end - base.start;
  const minimum = Math.min(baseSpan, axis.minimumSpan ?? (axis.scale === 'categorical' ? 1 : 0));
  const maximum = Math.min(baseSpan, axis.maximumSpan ?? baseSpan);
  const requested = Math.max(0, inputEnd - inputStart);
  const span = Math.max(minimum, Math.min(maximum, requested));
  const anchored = inputStart + requested * anchor;
  let start = anchored - span * anchor;
  let end = start + span;
  if (start < base.start) { start = base.start; end = start + span; }
  if (end > base.end) { end = base.end; start = end - span; }
  if (axis.scale === 'categorical') {
    start = Math.round(start);
    end = Math.round(end);
    if (end <= start) end = start + 1;
    if (end > base.end) { end = base.end; start = Math.max(base.start, end - Math.max(1, Math.round(span))); }
  }
  return { start, end };
}

function latestWindow<ID extends StableID>(axis: ChartAxisView<ID>): ChartAxisViewWindow {
  const base = transformed(axis, axis.base);
  const visible = transformed(axis, axis.visible);
  const span = Math.min(base.end - base.start, visible.end - visible.start);
  return fromTransformed(axis, constrainTransformed(axis, base.end - span, base.end, 1));
}

function transformed<ID extends StableID>(axis: ChartAxisView<ID>, window: ChartAxisViewWindow): { readonly start: number; readonly end: number } {
  const start = windowStart(window);
  const end = windowEnd(window);
  return axis.scale === 'logarithmic'
    ? { start: Math.log(start), end: Math.log(end) }
    : { start, end };
}

function fromTransformed<ID extends StableID>(axis: ChartAxisView<ID>, window: { readonly start: number; readonly end: number }): ChartAxisViewWindow {
  if (axis.scale === 'categorical') return Object.freeze({ kind: 'categorical', start: Math.round(window.start), end: Math.round(window.end) });
  return Object.freeze({
    kind: 'continuous',
    minimum: axis.scale === 'logarithmic' ? Math.exp(window.start) : window.start,
    maximum: axis.scale === 'logarithmic' ? Math.exp(window.end) : window.end,
  });
}

function baseWindow<ID extends StableID>(axis: ResolvedChartAxis<ID>): ChartAxisViewWindow {
  return axis.domain.kind === 'categorical'
    ? Object.freeze({ kind: 'categorical', start: 0, end: axis.domain.values.length })
    : Object.freeze({ kind: 'continuous', minimum: axis.domain.minimum, maximum: axis.domain.maximum });
}

function compatibleWindow<ID extends StableID>(axis: ChartAxisView<ID>, window: ChartAxisViewWindow): boolean {
  if (window === null || typeof window !== 'object') return false;
  if ((axis.scale === 'categorical') !== (window.kind === 'categorical')) return false;
  const start = windowStart(window);
  const end = windowEnd(window);
  if (!finite(start) || !finite(end) || end <= start) return false;
  if (axis.scale === 'logarithmic' && start <= 0) return false;
  return axis.scale !== 'categorical' || (Number.isSafeInteger(start) && Number.isSafeInteger(end));
}

function sameAxisBase<ID extends StableID>(left: ChartAxisView<ID>, right: ChartAxisView<ID>): boolean {
  if (left.orientation !== right.orientation || left.scale !== right.scale || !sameWindow(left.base, right.base) || !sameWindow(left.initial ?? left.visible, right.initial ?? right.visible)
    || left.minimumSpan !== right.minimumSpan || left.maximumSpan !== right.maximumSpan || left.update !== right.update) return false;
  if (left.categories === undefined || right.categories === undefined) return left.categories === right.categories;
  if (left.categories.length !== right.categories.length) return false;
  for (let index = 0; index < left.categories.length; index += 1) if (left.categories[index] !== right.categories[index]) return false;
  return true;
}

function sameAxisView<ID extends StableID>(left: ChartAxisView<ID>, right: ChartAxisView<ID>): boolean {
  return sameAxisBase(left, right) && sameWindow(left.visible, right.visible)
    && left.followingEnd === right.followingEnd && left.revision === right.revision;
}

function sameWindow(left: ChartAxisViewWindow, right: ChartAxisViewWindow): boolean {
  return left.kind === right.kind && windowStart(left) === windowStart(right) && windowEnd(left) === windowEnd(right);
}

function windowStart(window: ChartAxisViewWindow): number { return window.kind === 'continuous' ? window.minimum : window.start; }
function windowEnd(window: ChartAxisViewWindow): number { return window.kind === 'continuous' ? window.maximum : window.end; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function validPhase(value: unknown): value is ChartViewPhase { return value === 'start' || value === 'update' || value === 'end' || value === 'settled'; }

function createIndex<ID extends StableID>(axes: readonly ChartAxisView<ID>[]): ReadonlyMap<ID, number> {
  return new Map(axes.map((axis, index) => [axis.axisID, index]));
}

function bindIndex<ID extends StableID>(state: ChartViewState<ID>, index: ReadonlyMap<ID, number>): void {
  stateIndexes.set(state, index as ReadonlyMap<StableID, number>);
}

function stateIndex<ID extends StableID>(state: ChartViewState<ID>): { readonly index: ReadonlyMap<ID, number>; readonly built: number } {
  const retained = stateIndexes.get(state);
  if (retained !== undefined) return { index: retained as ReadonlyMap<ID, number>, built: 0 };
  const index = createIndex(state.axes);
  bindIndex(state, index);
  return { index, built: state.axes.length };
}

function invalidView<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-view-invalid', message);
}

function revisionExhausted<T>(): ChartResult<T> {
  return chartFail('resource-rejection', 'revision-ceiling-reached', 'Chart view revision is exhausted.');
}
