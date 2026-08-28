import { ITEM_COUNT, items, stableVariant, type BenchmarkItem, type RowProfile } from './constants.js';
import type { ExpectedLayout, HeightOracle } from './fixture.js';

export type MutationOperation = 'insert' | 'move' | 'remove' | 'resize';
export type MutationLocation = 'start' | 'middle' | 'end';

export interface MutationScenario {
  readonly operation: MutationOperation;
  readonly location: MutationLocation;
  readonly rowProfile: RowProfile;
  readonly index: number;
  readonly initialItems: readonly BenchmarkItem[];
  readonly nextItems: readonly BenchmarkItem[];
  readonly affectedIDs: readonly string[];
  readonly initialTotalHeight: number;
  readonly nextTotalHeight: number;
  readonly expectedScrollHeightDelta: number;
  readonly initialLayout: ExpectedLayout;
  readonly nextLayout: ExpectedLayout;
}

export const mutationOperations: readonly MutationOperation[] = Object.freeze(['insert', 'move', 'remove', 'resize']);
export const mutationLocations: readonly MutationLocation[] = Object.freeze(['start', 'middle', 'end']);

export function createMutationScenario(
  operation: MutationOperation,
  location: MutationLocation,
  rowProfile: RowProfile,
  oracle: HeightOracle,
): MutationScenario {
  const index = location === 'start' ? 0 : location === 'middle' ? Math.floor(ITEM_COUNT / 2) : ITEM_COUNT - 1;
  if (operation === 'insert') {
    const inserted = Object.freeze({ id: `inserted-${location}`, index: -1, contentVariant: stableVariant(index + 700_001), expanded: false });
    const nextItems = [...items.slice(0, index), inserted, ...items.slice(index)];
    return freezeScenario({ operation, location, rowProfile, oracle, index, nextItems, affectedIDs: [inserted.id, items[index]!.id] });
  }
  if (operation === 'remove') {
    const nextItems = [...items.slice(0, index), ...items.slice(index + 1)];
    const neighbor = items[index === ITEM_COUNT - 1 ? index - 1 : index + 1]!;
    return freezeScenario({ operation, location, rowProfile, oracle, index, nextItems, affectedIDs: [items[index]!.id, neighbor.id] });
  }
  if (operation === 'resize') {
    const resized = Object.freeze({ ...items[index]!, expanded: true });
    const nextItems = [...items];
    nextItems[index] = resized;
    return freezeScenario({ operation, location, rowProfile, oracle, index, nextItems, affectedIDs: [resized.id] });
  }
  const otherIndex = index === ITEM_COUNT - 1 ? index - 1 : index + 1;
  const nextItems = [...items];
  [nextItems[index], nextItems[otherIndex]] = [nextItems[otherIndex]!, nextItems[index]!];
  return freezeScenario({
    operation,
    location,
    rowProfile,
    oracle,
    index: Math.min(index, otherIndex),
    nextItems,
    affectedIDs: [items[index]!.id, items[otherIndex]!.id],
  });
}

export function reverseMutationScenario(scenario: MutationScenario): MutationScenario {
  const operation = scenario.operation === 'insert'
    ? 'remove'
    : scenario.operation === 'remove'
      ? 'insert'
      : scenario.operation;
  return Object.freeze({
    ...scenario,
    operation,
    initialItems: scenario.nextItems,
    nextItems: scenario.initialItems,
    initialTotalHeight: scenario.nextTotalHeight,
    nextTotalHeight: scenario.initialTotalHeight,
    expectedScrollHeightDelta: -scenario.expectedScrollHeightDelta,
    initialLayout: scenario.nextLayout,
    nextLayout: scenario.initialLayout,
  });
}

function freezeScenario(input: {
  readonly operation: MutationOperation;
  readonly location: MutationLocation;
  readonly rowProfile: RowProfile;
  readonly oracle: HeightOracle;
  readonly index: number;
  readonly nextItems: readonly BenchmarkItem[];
  readonly affectedIDs: readonly string[];
}): MutationScenario {
  const initialLayout = input.oracle.layout(items);
  const nextItems = Object.freeze(input.nextItems);
  const nextLayout = input.oracle.layout(nextItems);
  return Object.freeze({
    operation: input.operation,
    location: input.location,
    rowProfile: input.rowProfile,
    index: input.index,
    initialItems: items,
    nextItems,
    affectedIDs: Object.freeze(input.affectedIDs),
    initialTotalHeight: initialLayout.totalHeight,
    nextTotalHeight: nextLayout.totalHeight,
    expectedScrollHeightDelta: nextLayout.totalHeight - initialLayout.totalHeight,
    initialLayout,
    nextLayout,
  });
}
