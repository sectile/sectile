import { performance } from 'node:perf_hooks';
import { createGrid } from '../packages/primitives/dist/grid.js';
import { createRange } from '../packages/primitives/dist/range.js';
import { createSequence } from '../packages/primitives/dist/sequence.js';
import { createTree } from '../packages/primitives/dist/tree.js';

const unwrap = (result) => {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const sequence = unwrap(createSequence(Array.from({ length: 100_000 }, (_, index) => `i${index}`)));
const range = unwrap(createRange({ origin: '0', step: '0.01', count: 10_000_000 }));
const grid = unwrap(createGrid(Array.from({ length: 300 }, (_, row) =>
  Array.from({ length: 300 }, (_, column) => `c${row}-${column}`),
)));
const treeNodes = Array.from({ length: 100_000 }, (_, index) => ({
  id: `n${index}`,
  parentID: index === 0 ? null : `n${Math.floor((index - 1) / 3)}`,
}));
const tree = unwrap(createTree(treeNodes));

measure('sequence indexOf', 100_000, () => sequence.indexOf('i99999'));
measure('range valueAt', 100_000, () => range.valueAt(9_999_999));
measure('grid positionOf', 100_000, () => grid.positionOf('c299-299'));
measure('tree parentOf', 100_000, () => tree.parentOf('n99999'));

function measure(name, iterations, operation) {
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) operation();
  const elapsed = performance.now() - start;
  console.log(JSON.stringify({ name, iterations, milliseconds: Number(elapsed.toFixed(3)) }));
}
