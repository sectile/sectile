import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import { chartFail, chartOK } from './internal/result.js';
import type { ChartModelState } from './model.js';
import type { ChartResult } from './result.js';
import {
  createChartViewTransform,
  IDENTITY_CHART_VIEW_TRANSFORM,
  tryCreateChartViewTransform,
  type ChartViewTransform,
} from './scale.js';

export type ChartSelection<ID extends StableID = StableID> =
  | { readonly type: 'points'; readonly ids: readonly ID[] }
  | { readonly type: 'interval'; readonly start: number; readonly end: number };

export interface ChartState<ID extends StableID = StableID> {
  readonly generation: number;
  readonly activeDatum: ID | null;
  readonly cursor: ID | null;
  readonly selection: ChartSelection<ID>;
  readonly viewTransform: ChartViewTransform;
}

export interface ChartControlledValues<ID extends StableID = StableID> {
  readonly activeDatum?: ID | null;
  readonly cursor?: ID | null;
  readonly selection?: ChartSelection<ID>;
  readonly viewTransform?: ChartViewTransform;
}

export type ChartEvent<ID extends StableID = StableID> =
  | { readonly type: 'pointer-candidate'; readonly id: ID | null }
  | { readonly type: 'set-active'; readonly id: ID | null }
  | { readonly type: 'set-cursor'; readonly id: ID | null }
  | { readonly type: 'set-selection'; readonly selection: ChartSelection<ID> }
  | { readonly type: 'move-focus'; readonly direction: 'next' | 'previous' | 'first' | 'last' }
  | { readonly type: 'pan'; readonly x: number; readonly y: number }
  | { readonly type: 'zoom'; readonly x: number; readonly y: number; readonly factor: number }
  | { readonly type: 'reset-view' };

export type ChartCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus-datum'; readonly id: ID }
  | { readonly type: 'announce-datum'; readonly id: ID }
  | { readonly type: 'active-change-requested'; readonly id: ID | null }
  | { readonly type: 'cursor-change-requested'; readonly id: ID | null }
  | { readonly type: 'selection-change-requested'; readonly selection: ChartSelection<ID> }
  | { readonly type: 'view-transform-change-requested'; readonly viewTransform: ChartViewTransform }
  | { readonly type: 'render-requested'; readonly generation: number };

export interface ChartControlFlags {
  readonly activeDatum?: boolean;
  readonly cursor?: boolean;
  readonly selection?: boolean;
  readonly viewTransform?: boolean;
}

export interface ChartTransition<ID extends StableID = StableID> {
  readonly state: ChartState<ID>;
  readonly commands: readonly ChartCommand<ID>[];
  readonly changed: boolean;
}

const EMPTY_COMMANDS: readonly never[] = Object.freeze([]);

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
  const selection = normalizeSelection(model, controlled.selection ?? { type: 'points', ids: [] });
  if (!selection.ok) return selection;
  const transform = tryCreateChartViewTransform(controlled.viewTransform ?? IDENTITY_CHART_VIEW_TRANSFORM);
  if (!transform.ok) return transform;
  return chartOK(freezeState(model.generation, active.value, cursor.value, selection.value, transform.value));
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
  const selection = controlled.selection === undefined
    ? reconcileSelection(model, state.selection)
    : normalizeSelection(model, controlled.selection);
  if (!selection.ok) return selection;
  const transform = tryCreateChartViewTransform(controlled.viewTransform ?? state.viewTransform);
  if (!transform.ok) return transform;
  const next = freezeState(model.generation, active.value, cursor.value, selection.value, transform.value);
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
    const selection = normalizeSelection(model, event.selection);
    return selection.ok ? updateSelection(state, selection.value, controlled.selection === true) : selection;
  }
  if (event.type === 'move-focus') {
    if (event.direction !== 'next' && event.direction !== 'previous'
      && event.direction !== 'first' && event.direction !== 'last') return invalidInteraction('Chart focus direction is invalid.');
    return updateCursor(state, movedCursor(model, state.cursor, event.direction), controlled.cursor === true);
  }
  if (event.type === 'pan') {
    if (!finite(event.x) || !finite(event.y)) return invalidInteraction('Chart pan deltas must be finite.');
    return updateTransform(state, createChartViewTransform({
      ...state.viewTransform,
      xOffset: state.viewTransform.xOffset + event.x,
      yOffset: state.viewTransform.yOffset + event.y,
    }), controlled.viewTransform === true);
  }
  if (event.type === 'zoom') {
    if (!finite(event.x) || !finite(event.y) || !finite(event.factor) || event.factor <= 0) {
      return invalidInteraction('Chart zoom anchor and factor must be finite and the factor must be positive.');
    }
    const transform = tryCreateChartViewTransform({
      xScale: state.viewTransform.xScale * event.factor,
      xOffset: event.x - (event.x - state.viewTransform.xOffset) * event.factor,
      yScale: state.viewTransform.yScale * event.factor,
      yOffset: event.y - (event.y - state.viewTransform.yOffset) * event.factor,
    });
    return transform.ok ? updateTransform(state, transform.value, controlled.viewTransform === true) : transform;
  }
  if (event.type === 'reset-view') {
    return updateTransform(state, IDENTITY_CHART_VIEW_TRANSFORM, controlled.viewTransform === true);
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
  const commands: ChartCommand<ID>[] = [];
  if (controlled) commands.push(Object.freeze({ type: 'cursor-change-requested', id }));
  if (id !== null) {
    commands.push(Object.freeze({ type: 'focus-datum', id }));
    commands.push(Object.freeze({ type: 'announce-datum', id }));
  }
  return controlled ? transition(state, commands, false) : changedState(state, { cursor: id }, commands);
}

function updateSelection<ID extends StableID>(state: ChartState<ID>, selection: ChartSelection<ID>, controlled: boolean): ChartResult<ChartTransition<ID>> {
  if (sameSelection(state.selection, selection)) return unchanged(state);
  if (controlled) return transition<ID>(state, [Object.freeze({ type: 'selection-change-requested', selection })], false);
  return changedState(state, { selection });
}

function updateTransform<ID extends StableID>(state: ChartState<ID>, viewTransform: ChartViewTransform, controlled: boolean): ChartResult<ChartTransition<ID>> {
  if (sameTransform(state.viewTransform, viewTransform)) return unchanged(state);
  if (controlled) return transition(state, [Object.freeze({ type: 'view-transform-change-requested', viewTransform })], false);
  return changedState(state, { viewTransform });
}

function changedState<ID extends StableID>(
  state: ChartState<ID>,
  patch: Partial<Pick<ChartState<ID>, 'activeDatum' | 'cursor' | 'selection' | 'viewTransform'>>,
  commands: readonly ChartCommand<ID>[] = EMPTY_COMMANDS,
): ChartResult<ChartTransition<ID>> {
  const next = freezeState(
    state.generation,
    'activeDatum' in patch ? (patch.activeDatum as ID | null) : state.activeDatum,
    'cursor' in patch ? (patch.cursor as ID | null) : state.cursor,
    patch.selection ?? state.selection,
    patch.viewTransform ?? state.viewTransform,
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

function normalizeSelection<ID extends StableID>(model: ChartModelState<ID>, selection: ChartSelection<ID>): ChartResult<ChartSelection<ID>> {
  if (selection === null || typeof selection !== 'object') return invalidInteraction('Chart selection is invalid.');
  if (selection.type === 'interval') {
    if (!finite(selection.start) || !finite(selection.end) || selection.start > selection.end) {
      return invalidInteraction('Chart selection interval must contain finite ordered bounds.');
    }
    return chartOK(Object.freeze({ type: 'interval', start: selection.start, end: selection.end }));
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

function reconcileSelection<ID extends StableID>(
  model: ChartModelState<ID>, selection: ChartSelection<ID>,
): ChartResult<ChartSelection<ID>> {
  if (selection.type === 'interval') return normalizeSelection(model, selection);
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
  selection: ChartSelection<ID>, viewTransform: ChartViewTransform,
): ChartState<ID> {
  return Object.freeze({ generation, activeDatum, cursor, selection, viewTransform });
}

function sameState<ID extends StableID>(left: ChartState<ID>, right: ChartState<ID>): boolean {
  return left.generation === right.generation && left.activeDatum === right.activeDatum && left.cursor === right.cursor
    && sameSelection(left.selection, right.selection) && sameTransform(left.viewTransform, right.viewTransform);
}

function sameSelection<ID extends StableID>(left: ChartSelection<ID>, right: ChartSelection<ID>): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'interval' && right.type === 'interval') return left.start === right.start && left.end === right.end;
  if (left.type !== 'points' || right.type !== 'points' || left.ids.length !== right.ids.length) return false;
  for (let index = 0; index < left.ids.length; index += 1) if (left.ids[index] !== right.ids[index]) return false;
  return true;
}

function sameTransform(left: ChartViewTransform, right: ChartViewTransform): boolean {
  return left.xScale === right.xScale && left.xOffset === right.xOffset
    && left.yScale === right.yScale && left.yOffset === right.yOffset;
}

function invalidInteraction<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-interaction-invalid', message);
}

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
