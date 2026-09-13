import { performance } from 'node:perf_hooks';
import { Window } from 'happy-dom';
import { createForm } from '../dist/form.js';

const sizes = [100, 250, 500, 1_000];
const warmupRuns = 2;
const measuredRuns = 7;
const window = new Window({ url: 'https://sectile.dev/form-initialization-benchmark' });
const previous = {
  FormData: globalThis.FormData,
  HTMLElement: globalThis.HTMLElement,
  Node: globalThis.Node,
};
const originalCompareDocumentPosition = window.Node.prototype.compareDocumentPosition;
let comparisons = 0;

try {
  globalThis.FormData = window.FormData;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
  window.Node.prototype.compareDocumentPosition = function compareDocumentPosition(other) {
    comparisons += 1;
    return originalCompareDocumentPosition.call(this, other);
  };

  const measurements = [];
  for (const size of sizes) {
    const form = window.document.createElement('form');
    const participants = [];
    for (let index = 0; index < size; index += 1) {
      const input = window.document.createElement('input');
      input.name = `field${index}`;
      input.value = String(index);
      form.append(input);
      participants.push({ id: `field${index}`, element: input });
    }
    window.document.body.append(form);

    const run = () => {
      comparisons = 0;
      const startedAt = performance.now();
      const connection = createForm({ form, participants });
      const durationMs = performance.now() - startedAt;
      const comparisonCount = comparisons;
      connection.destroy();
      return { durationMs, comparisonCount };
    };

    for (let runIndex = 0; runIndex < warmupRuns; runIndex += 1) run();
    const runs = Array.from({ length: measuredRuns }, run);
    const durations = runs.map((run) => run.durationMs).sort((left, right) => left - right);
    const comparisonCounts = runs.map((run) => run.comparisonCount);
    measurements.push({
      participants: size,
      medianMs: durations[Math.floor(durations.length / 2)],
      minMs: durations[0],
      maxMs: durations.at(-1),
      compareDocumentPositionCalls: {
        min: Math.min(...comparisonCounts),
        max: Math.max(...comparisonCounts),
      },
    });
    form.remove();
  }

  process.stdout.write(`${JSON.stringify({
    benchmark: 'ISSUE-134:dom-form-initial-participants',
    warmupRuns,
    measuredRuns,
    measurements,
  }, null, 2)}\n`);
} finally {
  window.Node.prototype.compareDocumentPosition = originalCompareDocumentPosition;
  globalThis.FormData = previous.FormData;
  globalThis.HTMLElement = previous.HTMLElement;
  globalThis.Node = previous.Node;
  window.close();
}
