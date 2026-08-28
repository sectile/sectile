import { performance } from 'node:perf_hooks';
import {
  createFacadeConnection,
  createSemanticController,
} from '@sectile/core/adapter-runtime';
import { createGrid } from '@sectile/core/grid';
import { createSelectionState, toggleMultipleSelection } from '@sectile/core/selection';
import { createSequence } from '@sectile/core/sequence';
import { replacePlainText } from '@sectile/core/text';
import { createTree } from '@sectile/core/tree';

export const COMPLEXITY_SCALES = Object.freeze([1_000, 10_000, 100_000]);

export function runDeterministicWitness(size) {
  const ids = Object.freeze(Array.from({ length: size }, (_, index) => `w-${size}-${index}`));
  const startedAt = performance.now();
  const sequence = createSequence(ids);
  let predicateCalls = 0;
  const projected = sequence.project((_id, index) => {
    predicateCalls += 1;
    return (index & 1) === 0;
  });

  let eligibleCalls = 0;
  const moved = sequence.move(ids[0], 1, 'stop', {
    maxScan: 64,
    eligible: () => {
      eligibleCalls += 1;
      return false;
    },
  });

  const domainCounts = { at: 0, contains: 0, indexOf: 0 };
  const domain = {
    size: sequence.size,
    at: (index) => {
      domainCounts.at += 1;
      return sequence.at(index);
    },
    contains: (id) => {
      domainCounts.contains += 1;
      return sequence.contains(id);
    },
    indexOf: (id) => {
      domainCounts.indexOf += 1;
      return sequence.indexOf(id);
    },
  };
  const selected = unwrap(createSelectionState(domain, 'multiple', { selected: [ids[0]], anchor: ids[0] }));
  domainCounts.at = 0;
  domainCounts.contains = 0;
  toggleMultipleSelection(selected, ids[size - 1], domain);

  const columnCount = Math.min(100, size);
  const rows = Array.from({ length: Math.ceil(size / columnCount) }, (_, row) =>
    Array.from({ length: columnCount }, (_, column) => ids[row * columnCount + column] ?? null));
  const grid = createGrid(rows);
  let gridEligibleCalls = 0;
  const gridMove = grid.move(ids[0], 'right', 'stop', {
    maxScan: Math.min(32, columnCount - 1),
    eligible: () => {
      gridEligibleCalls += 1;
      return false;
    },
  });

  const tree = createTree(ids.map((id, index) => ({ id, parentID: index === 0 ? null : ids[Math.floor((index - 1) / 2)] })));
  let expansionReads = 0;
  const expansion = tree.normalizeExpansion({
    *[Symbol.iterator]() {
      for (let index = 0; index < Math.min(size, 64); index += 1) {
        expansionReads += 1;
        yield ids[index];
      }
    },
  });
  const visible = tree.visible(expansion);

  const text = 'a'.repeat(size);
  const replacement = unwrap(replacePlainText(text, size - 1, size, 'z'));
  const elapsedMilliseconds = performance.now() - startedAt;

  return Object.freeze({
    size,
    elapsedMilliseconds,
    sequence: Object.freeze({
      predicateCalls,
      outputEntries: projected.size,
      eligibleCalls,
      scanned: moved.scanned,
    }),
    selection: Object.freeze({ ...domainCounts }),
    grid: Object.freeze({ eligibleCalls: gridEligibleCalls, scanned: gridMove.scanned }),
    tree: Object.freeze({ expansionReads, visibleEntries: visible.size }),
    text: Object.freeze({ inspectedUpperBound: text.length + 1, outputCodeUnits: replacement.length }),
  });
}

export function runHostResourceWitness() {
  const counters = {
    reducerCalls: 0,
    effectCalls: 0,
    facadeNotifications: 0,
    subscriptions: 0,
    disconnects: 0,
  };
  const controller = unwrap(createSemanticController({
    initial: { ok: true, value: 0 },
    reducer: (state, event) => {
      counters.reducerCalls += 1;
      return { ok: true, value: { state: state + event, commands: [event] } };
    },
    toEffect: (command) => {
      counters.effectCalls += 1;
      return command;
    },
  }));
  controller.handle(1);

  const facade = unwrap(createFacadeConnection({}, (options) => {
    let state = 0;
    return {
      ok: true,
      value: {
        getSnapshot: () => ({ state }),
        handleEvent: (event) => {
          state += event;
          options.onUpdate?.();
          return true;
        },
        disconnect: () => { counters.disconnects += 1; },
      },
    };
  }));
  const unsubscribeA = facade.subscribe(() => { counters.facadeNotifications += 1; });
  counters.subscriptions += 1;
  const unsubscribeB = facade.subscribe(() => { counters.facadeNotifications += 1; });
  counters.subscriptions += 1;
  facade.send(1);
  unsubscribeA();
  counters.subscriptions -= 1;
  unsubscribeB();
  counters.subscriptions -= 1;
  facade.destroy();
  facade.destroy();
  return Object.freeze({ ...counters });
}

function unwrap(result) {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}
