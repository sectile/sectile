import {
  expectedVisibleItems,
  type LayoutBenchmarkFixture,
} from './layout-fixtures.ts';

export type LayoutValidationMode = 'exact' | 'estimated';

export interface LayoutSnapshotItem {
  readonly id: string;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LayoutSnapshot {
  readonly observedAt: number;
  readonly revision: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly items: readonly LayoutSnapshotItem[];
}

export interface LayoutValidationExpectation {
  readonly requiredItemIDs?: readonly string[];
  readonly excludedItemIDs?: readonly string[];
}

export function assertLayoutSnapshot(
  snapshot: LayoutSnapshot,
  fixture: LayoutBenchmarkFixture,
  mode: LayoutValidationMode,
  tolerance: number,
  expectation: LayoutValidationExpectation = {},
): void {
  if (snapshot.revision !== fixture.revision) {
    throw new Error(`stale-revision:${snapshot.revision}:${fixture.revision}`);
  }
  assertFiniteExtent('content-width', snapshot.scrollWidth, snapshot.viewportWidth);
  assertFiniteExtent('content-height', snapshot.scrollHeight, snapshot.viewportHeight);
  if (mode === 'exact') {
    if (Math.abs(snapshot.scrollWidth - fixture.contentWidth) > tolerance) {
      throw new Error(`content-width:${snapshot.scrollWidth}:${fixture.contentWidth}`);
    }
    if (Math.abs(snapshot.scrollHeight - fixture.contentHeight) > tolerance) {
      throw new Error(`content-height:${snapshot.scrollHeight}:${fixture.contentHeight}`);
    }
  }

  const expectedByID = mode === 'exact'
    ? new Map(expectedVisibleItems(
        fixture,
        snapshot.scrollLeft,
        snapshot.scrollTop,
        0,
      ).map((item) => [item.id, item]))
    : undefined;
  const seen = new Set<string>();
  let intersectsViewport = false;
  for (const item of snapshot.items) {
    if (item.id.length === 0 || !Number.isInteger(item.index)) throw new Error('invalid-item-identity');
    if (seen.has(item.id)) throw new Error(`duplicate-item:${item.id}`);
    seen.add(item.id);
    const expected = fixture.items[item.index];
    if (expected?.id !== item.id) throw new Error(`stale-item:${item.id}:${item.index}`);
    if (!finitePositiveRect(item)) throw new Error(`invalid-geometry:${item.id}`);
    if (
      Math.abs(item.width - expected.width) > tolerance
      || Math.abs(item.height - expected.height) > tolerance
      || (mode === 'exact' && (
        Math.abs(item.x - expected.x) > tolerance
        || Math.abs(item.y - expected.y) > tolerance
      ))
    ) throw new Error(`geometry:${item.id}`);
    if (rectanglesIntersectViewport(item, snapshot, tolerance)) intersectsViewport = true;
  }
  if (expectedByID !== undefined) {
    for (const expected of expectedByID.values()) {
      if (!seen.has(expected.id)) throw new Error(`missing-visible-item:${expected.id}`);
    }
    if (expectedByID.size > 0 && snapshot.items.length === 0) throw new Error('empty-viewport');
  } else if (!intersectsViewport) {
    throw new Error('empty-viewport');
  }
  for (const id of expectation.requiredItemIDs ?? []) {
    if (!seen.has(id)) throw new Error(`missing-required-item:${id}`);
  }
  for (const id of expectation.excludedItemIDs ?? []) {
    if (seen.has(id)) throw new Error(`excluded-item:${id}`);
  }
}

function assertFiniteExtent(name: string, value: number, viewport: number): void {
  if (!Number.isFinite(value) || value + 1 < viewport) throw new Error(`${name}:${value}:finite`);
}

function finitePositiveRect(item: LayoutSnapshotItem): boolean {
  return Number.isFinite(item.x)
    && Number.isFinite(item.y)
    && Number.isFinite(item.width)
    && Number.isFinite(item.height)
    && item.width > 0
    && item.height > 0;
}

function rectanglesIntersectViewport(
  item: LayoutSnapshotItem,
  snapshot: LayoutSnapshot,
  tolerance: number,
): boolean {
  return item.x + item.width >= snapshot.scrollLeft - tolerance
    && item.x <= snapshot.scrollLeft + snapshot.viewportWidth + tolerance
    && item.y + item.height >= snapshot.scrollTop - tolerance
    && item.y <= snapshot.scrollTop + snapshot.viewportHeight + tolerance;
}
