import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import { tryCreateChartViewState, type ChartViewState } from './contract.js';
import { chartFail, chartOK } from './internal/result.js';
import type { ChartModelState } from './model.js';
import type { ChartResult } from './result.js';
import { chartAxisView, reduceChartViewAction, type ChartViewAction, type ChartViewPhase } from './view.js';

export type ChartSelection<ID extends StableID = StableID> =
  | { readonly type: 'points'; readonly ids: readonly ID[] }
  | { readonly type: 'axis-interval'; readonly axisID: ID; readonly start: number; readonly end: number }
  | {
    readonly type: 'domain-region';
    readonly xAxisID: ID;
    readonly xStart: number;
    readonly xEnd: number;
    readonly yAxisID: ID;
    readonly yStart: number;
    readonly yEnd: number;
  };

export interface ChartState<ID extends StableID = StableID> {
  readonly generation: number;
  readonly activeDatum: ID | null;
  readonly cursor: ID | null;
  readonly selection: ChartSelection<ID>;
  readonly view: ChartViewState<ID> | null;
}

export interface ChartControlledValues<ID extends StableID = StableID> {
  readonly activeDatum?: ID | null;
  readonly cursor?: ID | null;
  readonly selection?: ChartSelection<ID>;
  readonly view?: ChartViewState<ID> | null;
}

export type ChartEvent<ID extends StableID = StableID> = ChartViewAction<ID>
  | { readonly type: 'pointer-candidate'; readonly id: ID | null }
  | { readonly type: 'set-active'; readonly id: ID | null }
  | { readonly type: 'set-cursor'; readonly id: ID | null }
  | { readonly type: 'set-selection'; readonly selection: ChartSelection<ID> }
  | { readonly type: 'move-focus'; readonly direction: 'next' | 'previous' | 'first' | 'last' };

export type ChartCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus-datum'; readonly id: ID }
  | { readonly type: 'announce-datum'; readonly id: ID }
  | { readonly type: 'active-change-requested'; readonly id: ID | null }
  | { readonly type: 'cursor-change-requested'; readonly id: ID | null }
  | { readonly type: 'selection-change-requested'; readonly selection: ChartSelection<ID> }
  | { readonly type: 'view-change-requested'; readonly view: ChartViewState<ID>; readonly phase: ChartViewPhase }
  | { readonly type: 'view-phase'; readonly axisID: ID; readonly phase: ChartViewPhase; readonly changed: boolean }
  | { readonly type: 'render-requested'; readonly generation: number };

export interface ChartControlFlags {
  readonly activeDatum?: boolean;
  readonly cursor?: boolean;
  readonly selection?: boolean;
  readonly view?: boolean;
}

export interface ChartTransition<ID extends StableID = StableID> {
  readonly state: ChartState<ID>;
  readonly commands: readonly ChartCommand<ID>[];
  readonly changed: boolean;
}

const EMPTY_COMMANDS: readonly never[] = Object.freeze([]);
const pointSelectionIndexes = new WeakMap<object, ReadonlySet<StableID>>();

export function chartSelectionContains<ID extends StableID>(selection: ChartSelection<ID>, id: ID): boolean {
  if (selection.type !== 'points') return false;
  let index = pointSelectionIndexes.get(selection);
  if (index === undefined) {
    index = new Set(selection.ids);
    pointSelectionIndexes.set(selection, index);
  }
  return index.has(id);
}

export function createChartState<ID extends StableID>(
  model: ChartModelState<ID>,
  controlled: ChartControlledValues<ID> = {},
): ChartState<ID> {
  return unwrap(tryCreateChartState(model, controlled));
}

export function tryCreateChartState<ID extends StableID>(
  model: ChartModelState<ID>,
  controlled: ChartControlledValues<ID> = {},
): ChartResult<ChartState<ID>> {
  if (controlled === null || typeof controlled !== 'object') return invalidInteraction('Controlled chart values must be an object.');
  const active = validateOptionalDatum(model, controlled.activeDatum ?? null);
  if (!active.ok) return active;
  const cursor = validateOptionalDatum(model, controlled.cursor ?? null);
  if (!cursor.ok) return cursor;
  const view = normalizeView(controlled.view ?? null);
  if (!view.ok) return view;
  const selection = normalizeSelection(model, controlled.selection ?? { type: 'points', ids: [] }, view.value);
  if (!selection.ok) return selection;
  return chartOK(freezeState(model.generation, active.value, cursor.value, selection.value, view.value));
}

export function reconcileChartState<ID extends StableID>(
  state: ChartState<ID>,
  model: ChartModelState<ID>,
  controlled: ChartControlledValues<ID> = {},
): ChartResult<ChartState<ID>> {
  if (controlled === null || typeof controlled !== 'object') return invalidInteraction('Controlled chart values must be an object.');
  const active = controlled.activeDatum !== undefined
    ? validateOptionalDatum(model, controlled.activeDatum)
    : chartOK(state.activeDatum !== null && model.indexOf(state.activeDatum) >= 0 ? state.activeDatum : null);
  if (!active.ok) return active;
  const cursor = controlled.cursor !== undefined
    ? validateOptionalDatum(model, controlled.cursor)
    : chartOK(state.cursor !== null && model.indexOf(state.cursor) >= 0 ? state.cursor : null);
  if (!cursor.ok) return cursor;
  const view = controlled.view === undefined ? chartOK(state.view) : normalizeView(controlled.view);
  if (!view.ok) return view;
  const selection = controlled.selection === undefined
    ? reconcileSelection(model, state.selection, view.value)
    : normalizeSelection(model, controlled.selection, view.value);
  if (!selection.ok) return selection;
  const next = freezeState(model.generation, active.value, cursor.value, selection.value, view.value);
  return chartOK(sameState(state, next) ? state : next);
}

export function reduceChartEvent<ID extends StableID>(
  model: ChartModelState<ID>,
  state: ChartState<ID>,
  event: ChartEvent<ID>,
  controlled: ChartControlFlags = {},
): ChartResult<ChartTransition<ID>> {
  if (state.generation !== model.generation) return invalidInteraction('Chart state generation must match its model generation.');
  if (event === null || typeof event !== 'object' || typeof event.type !== 'string') return invalidInteraction('Chart event is invalid.');
  if (event.type === 'pointer-candidate' || event.type === 'set-active') {
    const candidate = validateOptionalDatum(model, event.id);
    return candidate.ok ? updateActive(state, candidate.value, controlled.activeDatum === true) : candidate;
  }
  if (event.type === 'set-cursor') {
    const candidate = validateOptionalDatum(model, event.id);
    return candidate.ok ? updateCursor(state, candidate.value, controlled.cursor === true) : candidate;
  }
  if (event.type === 'set-selection') {
    const selection = normalizeSelection(model, event.selection, state.view);
    return selection.ok ? updateSelection(state, selection.value, controlled.selection === true) : selection;
  }
  if (event.type === 'move-focus') {
    if (event.direction !== 'next' && event.direction !== 'previous'
      && event.direction !== 'first' && event.direction !== 'last') return invalidInteraction('Chart focus direction is invalid.');
    return updateCursor(state, movedCursor(model, state.cursor, event.direction), controlled.cursor === true);
  }
  if (event.type === 'set-axis-view' || event.type === 'pan-axis-view' || event.type === 'zoom-axis-view' || event.type === 'reset-axis-view') {
    if (state.view === null) return invalidInteraction('Chart axis view action requires enabled axis view state.');
    const reduced = reduceChartViewAction(state.view, event);
    if (!reduced.ok) return reduced;
    const phase = Object.freeze({ type: 'view-phase' as const, axisID: event.axisID, phase: reduced.value.phase, changed: reduced.value.changed });
    if (!reduced.value.changed) return transition(state, [phase], false);
    if (controlled.view === true) return transition(state, [
      Object.freeze({ type: 'view-change-requested', view: reduced.value.state, phase: reduced.value.phase }),
    ], false);
    return changedState(state, { view: reduced.value.state }, [phase]);
  }
  return invalidInteraction('Chart event type is invalid.');
}

function updateActive<ID extends StableID>(state: ChartState<ID>, id: ID | null, controlled: boolean): ChartResult<ChartTransition<ID>> {
  if (state.activeDatum === id) return unchanged(state);
  if (controlled) return transition<ID>(state, [Object.freeze({ type: 'active-change-requested', id })], false);
  return changedState(state, { activeDatum: id });
}

function updateCursor<ID extends StableID>(state: ChartState<ID>, id: ID | null, controlled: boolean): ChartResult<ChartTransition<ID>> {
  if (state.cursor === id) return unchanged(state);
  if (controlled) return transition<ID>(state, [Object.freeze({ type: 'cursor-change-requested', id })], false);
  const commands: ChartCommand<ID>[] = [];
  if (id !== null) {
    commands.push(Object.freeze({ type: 'focus-datum', id }));
    commands.push(Object.freeze({ type: 'announce-datum', id }));
  }
  return changedState(state, { cursor: id }, commands);
}

function updateSelection<ID extends StableID>(state: ChartState<ID>, selection: ChartSelection<ID>, controlled: boolean): ChartResult<ChartTransition<ID>> {
  if (sameSelection(state.selection, selection)) return unchanged(state);
  if (controlled) return transition<ID>(state, [Object.freeze({ type: 'selection-change-requested', selection })], false);
  return changedState(state, { selection });
}

function changedState<ID extends StableID>(
  state: ChartState<ID>,
  patch: Partial<Pick<ChartState<ID>, 'activeDatum' | 'cursor' | 'selection' | 'view'>>,
  commands: readonly ChartCommand<ID>[] = EMPTY_COMMANDS,
): ChartResult<ChartTransition<ID>> {
  const next = freezeState(
    state.generation,
    'activeDatum' in patch ? (patch.activeDatum as ID | null) : state.activeDatum,
    'cursor' in patch ? (patch.cursor as ID | null) : state.cursor,
    patch.selection ?? state.selection,
    'view' in patch ? (patch.view as ChartViewState<ID> | null) : state.view,
  );
  return transition(next, [...commands, Object.freeze({ type: 'render-requested', generation: state.generation })], true);
}

function transition<ID extends StableID>(state: ChartState<ID>, commands: readonly ChartCommand<ID>[], changed: boolean): ChartResult<ChartTransition<ID>> {
  return chartOK(Object.freeze({ state, commands: Object.freeze([...commands]), changed }));
}

function unchanged<ID extends StableID>(state: ChartState<ID>): ChartResult<ChartTransition<ID>> {
  return chartOK(Object.freeze({ state, commands: EMPTY_COMMANDS, changed: false }));
}

function movedCursor<ID extends StableID>(
  model: ChartModelState<ID>, current: ID | null, direction: 'next' | 'previous' | 'first' | 'last',
): ID | null {
  if (model.size === 0) return null;
  if (direction === 'first') return model.identityAt(0);
  if (direction === 'last') return model.identityAt(model.size - 1);
  if (current === null) return direction === 'next' ? model.identityAt(0) : model.identityAt(model.size - 1);
  const index = model.indexOf(current);
  if (index < 0) return direction === 'next' ? model.identityAt(0) : model.identityAt(model.size - 1);
  return direction === 'next'
    ? model.identityAt(Math.min(model.size - 1, index + 1))
    : model.identityAt(Math.max(0, index - 1));
}

function normalizeSelection<ID extends StableID>(
  model: ChartModelState<ID>, selection: ChartSelection<ID>, view: ChartViewState<ID> | null,
): ChartResult<ChartSelection<ID>> {
  if (selection === null || typeof selection !== 'object') return invalidInteraction('Chart selection is invalid.');
  if (selection.type === 'axis-interval') {
    const axis = view === null ? null : chartAxisView(view, selection.axisID);
    if (axis === null || !validSelectionBounds(axis, selection.start, selection.end)) {
      return invalidInteraction('Chart axis selection must reference an enabled axis and contain finite ordered bounds.');
    }
    return chartOK(Object.freeze({ type: 'axis-interval', axisID: selection.axisID, start: selection.start, end: selection.end }));
  }
  if (selection.type === 'domain-region') {
    const xAxis = view === null ? null : chartAxisView(view, selection.xAxisID);
    const yAxis = view === null ? null : chartAxisView(view, selection.yAxisID);
    if (xAxis === null || yAxis === null || (xAxis.orientation !== undefined && xAxis.orientation !== 'x')
      || (yAxis.orientation !== undefined && yAxis.orientation !== 'y')
      || !validSelectionBounds(xAxis, selection.xStart, selection.xEnd)
      || !validSelectionBounds(yAxis, selection.yStart, selection.yEnd)) {
      return invalidInteraction('Chart domain region must reference enabled axes and contain finite ordered bounds.');
    }
    return chartOK(Object.freeze({ ...selection }));
  }
  if (selection.type !== 'points' || !Array.isArray(selection.ids)) return invalidInteraction('Chart point selection must contain an identity array.');
  const seen = new Set<ID>();
  const ids: ID[] = [];
  for (const id of selection.ids) {
    if (model.indexOf(id) < 0) return missingDatum(id);
    if (seen.has(id)) return invalidInteraction('Chart point selection identities must be unique.');
    seen.add(id); ids.push(id);
  }
  return chartOK(Object.freeze({ type: 'points', ids: Object.freeze(ids) }));
}

function validSelectionBounds<ID extends StableID>(axis: import('./contract.js').ChartAxisView<ID>, start: number, end: number): boolean {
  if (!finite(start) || !finite(end) || start > end) return false;
  const baseStart = axis.base.kind === 'continuous' ? axis.base.minimum : axis.base.start;
  const baseEnd = axis.base.kind === 'continuous' ? axis.base.maximum : axis.base.end;
  return start >= baseStart && end <= baseEnd
    && (axis.scale !== 'categorical' || (Number.isSafeInteger(start) && Number.isSafeInteger(end)));
}

function reconcileSelection<ID extends StableID>(
  model: ChartModelState<ID>, selection: ChartSelection<ID>, view: ChartViewState<ID> | null,
): ChartResult<ChartSelection<ID>> {
  if (selection.type !== 'points') {
    const normalized = normalizeSelection(model, selection, view);
    return normalized.ok && sameSelection(selection, normalized.value) ? chartOK(selection) : normalized;
  }
  const ids = selection.ids.filter((id) => model.indexOf(id) >= 0);
  return ids.length === selection.ids.length
    ? chartOK(selection)
    : chartOK(Object.freeze({ type: 'points', ids: Object.freeze(ids) }));
}

function validateOptionalDatum<ID extends StableID>(model: ChartModelState<ID>, id: ID | null): ChartResult<ID | null> {
  return id === null || model.indexOf(id) >= 0 ? chartOK(id) : missingDatum(id);
}

function missingDatum<T>(id: StableID): ChartResult<T> {
  return chartFail('transition-rejection', 'chart-datum-missing', 'Chart datum identity does not exist.', { id });
}

function freezeState<ID extends StableID>(
  generation: number, activeDatum: ID | null, cursor: ID | null,
  selection: ChartSelection<ID>, view: ChartViewState<ID> | null,
): ChartState<ID> {
  return Object.freeze({ generation, activeDatum, cursor, selection, view });
}

function sameState<ID extends StableID>(left: ChartState<ID>, right: ChartState<ID>): boolean {
  return left.generation === right.generation && left.activeDatum === right.activeDatum && left.cursor === right.cursor
    && sameSelection(left.selection, right.selection) && sameViewState(left.view, right.view);
}

function sameViewState<ID extends StableID>(left: ChartViewState<ID> | null, right: ChartViewState<ID> | null): boolean {
  if (left === right) return true;
  if (left === null || right === null || left.revision !== right.revision || left.axes.length !== right.axes.length) return false;
  for (let index = 0; index < left.axes.length; index += 1) {
    const a = left.axes[index];
    const b = right.axes[index];
    if (a === undefined || b === undefined || a.axisID !== b.axisID || a.orientation !== b.orientation || a.scale !== b.scale
      || !sameViewWindow(a.base, b.base) || !sameViewWindow(a.initial ?? a.visible, b.initial ?? b.visible)
      || !sameViewWindow(a.visible, b.visible) || a.minimumSpan !== b.minimumSpan || a.maximumSpan !== b.maximumSpan
      || a.update !== b.update || a.followingEnd !== b.followingEnd || a.revision !== b.revision) return false;
    if (a.categories === undefined || b.categories === undefined) {
      if (a.categories !== b.categories) return false;
    } else {
      if (a.categories.length !== b.categories.length) return false;
      for (let category = 0; category < a.categories.length; category += 1) {
        if (a.categories[category] !== b.categories[category]) return false;
      }
    }
  }
  return true;
}

function sameViewWindow(left: import('./contract.js').ChartAxisViewWindow, right: import('./contract.js').ChartAxisViewWindow): boolean {
  return left.kind === right.kind && (left.kind === 'continuous' && right.kind === 'continuous'
    ? left.minimum === right.minimum && left.maximum === right.maximum
    : left.kind === 'categorical' && right.kind === 'categorical' && left.start === right.start && left.end === right.end);
}

function normalizeView<ID extends StableID>(view: ChartViewState<ID> | null): ChartResult<ChartViewState<ID> | null> {
  if (view === null) return chartOK(null);
  const normalized = tryCreateChartViewState(view.axes, view.revision);
  if (!normalized.ok) return normalized;
  return chartOK(normalized.value);
}

function sameSelection<ID extends StableID>(left: ChartSelection<ID>, right: ChartSelection<ID>): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'axis-interval' && right.type === 'axis-interval') {
    return left.axisID === right.axisID && left.start === right.start && left.end === right.end;
  }
  if (left.type === 'domain-region' && right.type === 'domain-region') {
    return left.xAxisID === right.xAxisID && left.xStart === right.xStart && left.xEnd === right.xEnd
      && left.yAxisID === right.yAxisID && left.yStart === right.yStart && left.yEnd === right.yEnd;
  }
  if (left.type !== 'points' || right.type !== 'points' || left.ids.length !== right.ids.length) return false;
  for (let index = 0; index < left.ids.length; index += 1) if (left.ids[index] !== right.ids[index]) return false;
  return true;
}

function invalidInteraction<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-interaction-invalid', message);
}

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
