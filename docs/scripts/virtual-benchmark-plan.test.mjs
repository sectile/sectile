import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeVirtualBenchmarkPlan } from '../.vitepress/theme/virtual-benchmark-plan.ts';

const options = {
  libraries: ['Sectile Virtual', 'TanStack Virtual', 'react-window', 'React Virtuoso', 'react-virtualized', 'Virtua', 'Vue Virtual Scroller'],
  automaticLibraries: new Set(['Sectile Virtual', 'React Virtuoso', 'Virtua']),
};

const standardTarget = {
  family: 'list',
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

test('layout plan matches every declared library, mode, and operation capability', () => {
  const families = ['flow-grid', 'masonry', 'track-grid', 'spatial'];
  const targets = families.map((family) => ({
    ...standardTarget,
    family,
    profile: 'all',
  }));

  const allLibraries = summarizeVirtualBenchmarkPlan(targets, options);
  assert.equal(allLibraries.baselineConditions, 13);
  assert.equal(allLibraries.mutationConditions, 147);

  const sectileOnly = summarizeVirtualBenchmarkPlan(
    targets.map((target) => ({ ...target, library: 'Sectile Virtual' })),
    options,
  );
  assert.equal(sectileOnly.baselineConditions, 9);
  assert.equal(sectileOnly.mutationConditions, 102);
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
