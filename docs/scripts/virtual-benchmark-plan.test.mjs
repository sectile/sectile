import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeVirtualBenchmarkPlan } from '../.vitepress/theme/virtual-benchmark-plan.ts';

const options = {
  libraries: ['Sectile Virtual', 'TanStack Virtual', 'react-window', 'React Virtuoso', 'react-virtualized', 'Virtua', 'Vue Virtual Scroller'],
  automaticLibraries: new Set(['Sectile Virtual', 'React Virtuoso', 'Virtua']),
};

const standardTarget = {
  preset: 'standard',
  profile: 'all',
  phase: 'both',
  library: 'all',
  baselineMode: 'all',
  mutationMode: 'all',
  operation: 'all',
  location: 'all',
  rows: 100_000,
  baselineRounds: 5,
  scrollSamples: 20,
  mutationRounds: 5,
  mutationSamples: 10,
};

test('benchmark plan expands profiles and supported condition combinations', () => {
  const summary = summarizeVirtualBenchmarkPlan([standardTarget], options);

  assert.equal(summary.profileRuns, 2);
  assert.equal(summary.baselineConditions, 27);
  assert.equal(summary.mutationConditions, 240);
  assert.equal(summary.maximumSamples, 14_700);
  assert.ok(summary.minimumDurationSeconds > 0);
  assert.ok(summary.maximumDurationSeconds > summary.minimumDurationSeconds);
});

test('benchmark plan respects single-condition custom targets', () => {
  const summary = summarizeVirtualBenchmarkPlan([{
    ...standardTarget,
    preset: 'custom',
    profile: 'uniform',
    library: 'Sectile Virtual',
    baselineMode: 'fixed',
    mutationMode: 'estimated',
    operation: 'insert',
    location: 'middle',
    baselineRounds: 2,
    scrollSamples: 3,
    mutationRounds: 2,
    mutationSamples: 4,
  }], options);

  assert.equal(summary.profileRuns, 1);
  assert.equal(summary.baselineConditions, 1);
  assert.equal(summary.mutationConditions, 1);
  assert.equal(summary.maximumSamples, 14);
});

test('empty benchmark plan reports zero work and duration', () => {
  assert.deepEqual(summarizeVirtualBenchmarkPlan([], options), {
    profileRuns: 0,
    baselineConditions: 0,
    mutationConditions: 0,
    maximumSamples: 0,
    minimumDurationSeconds: 0,
    maximumDurationSeconds: 0,
  });
});
