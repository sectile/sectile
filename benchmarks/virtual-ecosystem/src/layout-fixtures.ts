import {
  ITEM_COUNT,
  MAXIMUM_SCROLL_HEIGHT,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
  stableVariant,
} from './constants.js';
import type { BenchmarkFamily } from './families.js';

export type LayoutBenchmarkFamily = Exclude<BenchmarkFamily, 'list'>;
export type LayoutMutationOperation = 'insert' | 'move' | 'remove' | 'resize';
export type LayoutMutationLocation = 'start' | 'middle' | 'end';

export interface LayoutBenchmarkItem {
  readonly id: string;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly zIndex: number;
  readonly lane: number;
  readonly row: number;
  readonly column: number;
  readonly contentVariant: number;
}

export interface LayoutBenchmarkFixture {
  readonly family: LayoutBenchmarkFamily;
  readonly items: readonly LayoutBenchmarkItem[];
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly laneCount: number;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly rowHeight: number;
  readonly columnWidth: number;
  readonly rowHeights: readonly number[];
  readonly columnWidths: readonly number[];
  readonly gap: number;
  readonly revision: number;
}

export interface LayoutMutationScenario {
  readonly operation: LayoutMutationOperation;
  readonly location: LayoutMutationLocation;
  readonly before: LayoutBenchmarkFixture;
  readonly after: LayoutBenchmarkFixture;
  readonly affectedIDs: readonly string[];
}

const FLOW_LANES = 4;
const LANE_GAP = 12;
const FLOW_ITEM_WIDTH = (VIEWPORT_WIDTH - LANE_GAP * (FLOW_LANES - 1)) / FLOW_LANES;
const TRACK_ROW_HEIGHT = 36;
const TRACK_COLUMN_WIDTH = 120;
const SPATIAL_COLUMNS = 200;
const SPATIAL_CELL_WIDTH = 112;
const SPATIAL_CELL_HEIGHT = 84;
const fixtureLanes = new WeakMap<LayoutBenchmarkFixture, readonly (readonly LayoutBenchmarkItem[])[]>();
const fixtureLaneBounds = new WeakMap<LayoutBenchmarkFixture, readonly { readonly left: number; readonly right: number }[]>();

export function createLayoutFixture(
  family: LayoutBenchmarkFamily,
  count = ITEM_COUNT,
  revision = 0,
  source?: readonly LayoutBenchmarkItem[],
): LayoutBenchmarkFixture {
  const boundedCount = Math.max(2, Math.min(1_000_000, count));
  switch (family) {
    case 'flow-grid': return createFlowGridFixture(boundedCount, revision, source);
    case 'masonry': return createMasonryFixture(boundedCount, revision, source);
    case 'track-grid': return createTrackGridFixture(boundedCount, revision, source);
    case 'spatial': return createSpatialFixture(boundedCount, revision, source);
  }
}

export function createLayoutMutationScenario(
  fixture: LayoutBenchmarkFixture,
  operation: LayoutMutationOperation,
  location: LayoutMutationLocation,
): LayoutMutationScenario {
  const index = mutationIndex(fixture.items.length, location);
  const source = [...fixture.items];
  const affectedIDs: string[] = [];
  if (operation === 'insert') {
    const inserted = baseItem(`inserted-${fixture.revision + 1}-${location}`, index, fixture.revision + 1);
    source.splice(index, 0, inserted);
    affectedIDs.push(inserted.id);
  } else if (operation === 'remove') {
    const removed = source.splice(index, 1)[0];
    if (removed !== undefined) affectedIDs.push(removed.id);
  } else if (operation === 'move') {
    const moved = source.splice(index, 1)[0];
    if (moved !== undefined) {
      const target = location === 'start' ? source.length - 1 : location === 'end' ? 0 : Math.min(source.length, index + 17);
      source.splice(target, 0, moved);
      affectedIDs.push(moved.id);
    }
  } else {
    const current = source[index];
    if (current !== undefined) {
      source[index] = Object.freeze({
        ...current,
        height: current.height + 37,
        width: fixture.family === 'spatial' ? current.width + 29 : current.width,
      });
      affectedIDs.push(current.id);
    }
  }
  const after = createLayoutFixture(fixture.family, source.length, fixture.revision + 1, source);
  return Object.freeze({ operation, location, before: fixture, after, affectedIDs: Object.freeze(affectedIDs) });
}

export function expectedVisibleItems(
  fixture: LayoutBenchmarkFixture,
  scrollLeft: number,
  scrollTop: number,
  overscan = ROW_HEIGHT * 4,
): readonly LayoutBenchmarkItem[] {
  const left = scrollLeft - overscan;
  const top = scrollTop - overscan;
  const right = scrollLeft + VIEWPORT_WIDTH + overscan;
  const bottom = scrollTop + VIEWPORT_HEIGHT + overscan;
  const result: LayoutBenchmarkItem[] = [];
  const lanes = fixtureLanes.get(fixture) ?? [];
  const laneBounds = fixtureLaneBounds.get(fixture) ?? [];
  for (let laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
    const lane = lanes[laneIndex]!;
    const bounds = laneBounds[laneIndex];
    if (lane.length === 0 || bounds === undefined || bounds.left > right || bounds.right < left) continue;
    let low = 0;
    let high = lane.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (lane[middle]!.y + lane[middle]!.height < top) low = middle + 1;
      else high = middle;
    }
    for (let index = low; index < lane.length; index += 1) {
      const item = lane[index]!;
      if (item.y > bottom) break;
      if (item.x + item.width >= left && item.x <= right) result.push(item);
    }
  }
  return result;
}

function createFlowGridFixture(
  count: number,
  revision: number,
  source?: readonly LayoutBenchmarkItem[],
): LayoutBenchmarkFixture {
  const normalized = normalizeSource(count, revision, source);
  const rowCount = Math.ceil(normalized.length / FLOW_LANES);
  const rowHeights = Array.from({ length: rowCount }, () => ROW_HEIGHT);
  if (source !== undefined) for (let index = 0; index < normalized.length; index += 1) {
    const row = Math.floor(index / FLOW_LANES);
    rowHeights[row] = Math.max(rowHeights[row]!, normalized[index]!.height);
  }
  const rowOffsets = new Float64Array(rowCount + 1);
  for (let row = 0; row < rowCount; row += 1) {
    rowOffsets[row + 1] = rowOffsets[row]! + rowHeights[row]! + (row + 1 < rowCount ? LANE_GAP : 0);
  }
  const items = normalized.map((item, index) => {
    const row = Math.floor(index / FLOW_LANES);
    const column = index % FLOW_LANES;
    return Object.freeze({
      ...item,
      index,
      x: column * (FLOW_ITEM_WIDTH + LANE_GAP),
      y: rowOffsets[row]!,
      width: FLOW_ITEM_WIDTH,
      height: source === undefined ? ROW_HEIGHT : item.height,
      lane: column,
      row,
      column,
    });
  });
  return freezeFixture({
    family: 'flow-grid', items, contentWidth: VIEWPORT_WIDTH,
    contentHeight: rowOffsets[rowCount]!, laneCount: FLOW_LANES,
    rowCount, columnCount: FLOW_LANES, rowHeight: ROW_HEIGHT, columnWidth: FLOW_ITEM_WIDTH,
    rowHeights, columnWidths: Array.from({ length: FLOW_LANES }, () => FLOW_ITEM_WIDTH),
    gap: LANE_GAP, revision,
  });
}

function createMasonryFixture(
  count: number,
  revision: number,
  source?: readonly LayoutBenchmarkItem[],
): LayoutBenchmarkFixture {
  const laneEnds = new Float64Array(FLOW_LANES);
  const heightScale = Math.min(1, Math.max(16 / 145, (
    (MAXIMUM_SCROLL_HEIGHT * FLOW_LANES) / Math.max(1, count) - LANE_GAP
  ) / 145));
  const items = normalizeSource(count, revision, source).map((item, index) => {
    const lane = shortestLane(laneEnds);
    const naturalHeight = source === undefined
      ? Math.max(16, Math.floor((88 + (item.contentVariant % 7) * 19) * heightScale))
      : item.height;
    const positioned = Object.freeze({
      ...item,
      index,
      x: lane * (FLOW_ITEM_WIDTH + LANE_GAP),
      y: laneEnds[lane]!,
      width: FLOW_ITEM_WIDTH,
      height: naturalHeight,
      lane,
      row: index,
      column: lane,
    });
    laneEnds[lane] = positioned.y + positioned.height + LANE_GAP;
    return positioned;
  });
  return freezeFixture({
    family: 'masonry', items, contentWidth: VIEWPORT_WIDTH,
    contentHeight: Math.max(0, ...laneEnds) - LANE_GAP, laneCount: FLOW_LANES,
    rowCount: items.length, columnCount: FLOW_LANES, rowHeight: ROW_HEIGHT,
    columnWidth: FLOW_ITEM_WIDTH, rowHeights: items.map((item) => item.height),
    columnWidths: Array.from({ length: FLOW_LANES }, () => FLOW_ITEM_WIDTH), gap: LANE_GAP, revision,
  });
}

function createTrackGridFixture(
  count: number,
  revision: number,
  source?: readonly LayoutBenchmarkItem[],
): LayoutBenchmarkFixture {
  const columnCount = Math.max(2, Math.ceil(Math.sqrt(count)));
  const rowCount = Math.ceil(count / columnCount);
  const normalized = normalizeSource(count, revision, source);
  const rowHeights = Array.from({ length: rowCount }, () => TRACK_ROW_HEIGHT);
  if (source !== undefined) for (let index = 0; index < normalized.length; index += 1) {
    const row = Math.floor(index / columnCount);
    rowHeights[row] = Math.max(rowHeights[row]!, normalized[index]!.height);
  }
  const rowOffsets = new Float64Array(rowCount + 1);
  for (let row = 0; row < rowCount; row += 1) rowOffsets[row + 1] = rowOffsets[row]! + rowHeights[row]!;
  const items = normalized.map((item, index) => {
    const row = Math.floor(index / columnCount);
    const column = index % columnCount;
    return Object.freeze({
      ...item,
      index,
      x: column * TRACK_COLUMN_WIDTH,
      y: rowOffsets[row]!,
      width: TRACK_COLUMN_WIDTH,
      height: rowHeights[row]!,
      lane: column,
      row,
      column,
    });
  });
  return freezeFixture({
    family: 'track-grid', items,
    contentWidth: columnCount * TRACK_COLUMN_WIDTH,
    contentHeight: rowOffsets[rowCount]!,
    laneCount: columnCount, rowCount, columnCount,
    rowHeight: TRACK_ROW_HEIGHT, columnWidth: TRACK_COLUMN_WIDTH,
    rowHeights, columnWidths: Array.from({ length: columnCount }, () => TRACK_COLUMN_WIDTH),
    gap: 0, revision,
  });
}

function createSpatialFixture(
  count: number,
  revision: number,
  source?: readonly LayoutBenchmarkItem[],
): LayoutBenchmarkFixture {
  const base = normalizeSource(count, revision, source);
  const items = base.map((item, index) => {
    const row = Math.floor(index / SPATIAL_COLUMNS);
    const column = index % SPATIAL_COLUMNS;
    const width = source === undefined ? 80 + (item.contentVariant % 3) * 8 : item.width;
    const height = source === undefined ? 54 + (item.contentVariant % 5) * 6 : item.height;
    return Object.freeze({
      ...item,
      index,
      x: column * SPATIAL_CELL_WIDTH + (item.contentVariant % 5),
      y: row * SPATIAL_CELL_HEIGHT + (item.contentVariant % 7),
      width,
      height,
      zIndex: item.contentVariant % 7,
      lane: column,
      row,
      column,
    });
  });
  const rowCount = Math.ceil(items.length / SPATIAL_COLUMNS);
  return freezeFixture({
    family: 'spatial', items,
    contentWidth: SPATIAL_COLUMNS * SPATIAL_CELL_WIDTH,
    contentHeight: rowCount * SPATIAL_CELL_HEIGHT,
    laneCount: SPATIAL_COLUMNS, rowCount, columnCount: SPATIAL_COLUMNS,
    rowHeight: SPATIAL_CELL_HEIGHT, columnWidth: SPATIAL_CELL_WIDTH,
    rowHeights: Array.from({ length: rowCount }, () => SPATIAL_CELL_HEIGHT),
    columnWidths: Array.from({ length: SPATIAL_COLUMNS }, () => SPATIAL_CELL_WIDTH),
    gap: 0, revision,
  });
}

function normalizeSource(
  count: number,
  revision: number,
  source?: readonly LayoutBenchmarkItem[],
): readonly LayoutBenchmarkItem[] {
  if (source !== undefined) return source;
  return Array.from({ length: count }, (_, index) => baseItem(`item-${index}`, index, revision));
}

function baseItem(id: string, index: number, revision: number): LayoutBenchmarkItem {
  return Object.freeze({
    id, index, x: 0, y: 0, width: 80, height: ROW_HEIGHT,
    zIndex: 0, lane: 0, row: 0, column: 0,
    contentVariant: stableVariant(index + revision * 977),
  });
}

function shortestLane(ends: Float64Array): number {
  let lane = 0;
  for (let index = 1; index < ends.length; index += 1) {
    if (ends[index]! < ends[lane]!) lane = index;
  }
  return lane;
}

function mutationIndex(length: number, location: LayoutMutationLocation): number {
  if (location === 'start') return 0;
  if (location === 'end') return Math.max(0, length - 1);
  return Math.floor(length / 2);
}

function freezeFixture(fixture: LayoutBenchmarkFixture): LayoutBenchmarkFixture {
  const frozen = Object.freeze({ ...fixture, items: Object.freeze(fixture.items) });
  const lanes = Array.from({ length: fixture.laneCount }, () => [] as LayoutBenchmarkItem[]);
  for (const item of frozen.items) lanes[item.lane]?.push(item);
  fixtureLanes.set(frozen, Object.freeze(lanes.map((lane) => Object.freeze(lane.sort((left, right) => left.y - right.y)))));
  fixtureLaneBounds.set(frozen, Object.freeze(lanes.map((lane) => Object.freeze({
    left: lane.reduce((minimum, item) => Math.min(minimum, item.x), Number.POSITIVE_INFINITY),
    right: lane.reduce((maximum, item) => Math.max(maximum, item.x + item.width), Number.NEGATIVE_INFINITY),
  }))));
  return frozen;
}
