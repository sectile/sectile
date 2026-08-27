import { ITEM_COUNT, items, ROW_HEIGHT, type BenchmarkItem } from './constants.js';

export type MutationOperation = 'insert' | 'move' | 'remove' | 'resize';
export type MutationLocation = 'start' | 'middle' | 'end';

export interface MutationScenario {
  readonly operation: MutationOperation;
  readonly location: MutationLocation;
  readonly index: number;
  readonly initialItems: readonly BenchmarkItem[];
  readonly nextItems: readonly BenchmarkItem[];
  readonly affectedIDs: readonly string[];
  readonly expectedScrollHeightDelta: number;
}

export const mutationOperations: readonly MutationOperation[] = Object.freeze(['insert', 'move', 'remove', 'resize']);
export const mutationLocations: readonly MutationLocation[] = Object.freeze(['start', 'middle', 'end']);

export function createMutationScenario(operation: MutationOperation, location: MutationLocation): MutationScenario {
  const index = location === 'start' ? 0 : location === 'middle' ? Math.floor(ITEM_COUNT / 2) : ITEM_COUNT - 1;
  if (operation === 'insert') {
    const inserted = Object.freeze({ id: `inserted-${location}`, index: -1, label: `Inserted ${location} row`, height: ROW_HEIGHT });
    const nextItems = [...items.slice(0, index), inserted, ...items.slice(index)];
    return freezeScenario({ operation, location, index, nextItems, affectedIDs: [inserted.id, items[index]!.id], expectedScrollHeightDelta: ROW_HEIGHT });
  }
  if (operation === 'remove') {
    const nextItems = [...items.slice(0, index), ...items.slice(index + 1)];
    const neighbor = items[index === ITEM_COUNT - 1 ? index - 1 : index + 1]!;
    return freezeScenario({ operation, location, index, nextItems, affectedIDs: [items[index]!.id, neighbor.id], expectedScrollHeightDelta: -ROW_HEIGHT });
  }
  if (operation === 'resize') {
    const resized = Object.freeze({ ...items[index]!, height: ROW_HEIGHT * 2 });
    const nextItems = [...items];
    nextItems[index] = resized;
    return freezeScenario({ operation, location, index, nextItems, affectedIDs: [resized.id], expectedScrollHeightDelta: ROW_HEIGHT });
  }
  const otherIndex = index === ITEM_COUNT - 1 ? index - 1 : index + 1;
  const nextItems = [...items];
  [nextItems[index], nextItems[otherIndex]] = [nextItems[otherIndex]!, nextItems[index]!];
  return freezeScenario({ operation, location, index: Math.min(index, otherIndex), nextItems, affectedIDs: [items[index]!.id, items[otherIndex]!.id], expectedScrollHeightDelta: 0 });
}

function freezeScenario(input: Omit<MutationScenario, 'initialItems'>): MutationScenario {
  return Object.freeze({ ...input, initialItems: items, nextItems: Object.freeze(input.nextItems), affectedIDs: Object.freeze(input.affectedIDs) });
}
