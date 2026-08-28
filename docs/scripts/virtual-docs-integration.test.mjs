import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('Virtual examples follow the shared usage environment and real host connection', async () => {
  const [component, examples, overview, layouts] = await Promise.all([
    source('.vitepress/theme/components/VirtualExample.vue'),
    source('.vitepress/theme/virtual-example-code.ts'),
    source('ko/packages/virtual.md'),
    source('ko/packages/virtual/layouts.md'),
  ]);

  assert.match(component, /<ExampleFrame :sources="sources">/u);
  assert.match(component, /queryLinearLayout/u);
  assert.match(component, /queryTrackGridLayout/u);
  assert.match(component, /queryMasonryLayout/u);
  assert.match(component, /querySpatialLayout/u);
  assert.match(component, /<SliderRoot/u);
  assert.match(
    component,
    /v-for="placement in placements"[\s\S]*class="virtual-overscan-diagram__dim/u,
  );
  assert.doesNotMatch(component, /virtual-overscan-diagram__(?:rendered|viewport)/u);
  assert.match(component, /@scroll\.passive="handleScroll"/u);
  assert.match(examples, /<template v-slot="\{ value: row \}">/u);
  assert.doesNotMatch(examples, /#default|class=|:class=|style=|<style/u);

  for (const host of ['core', 'dom', 'terminal', 'vue']) {
    assert.match(examples, new RegExp(`\\b${host}:`));
  }

  assert.match(overview, /<VirtualInstall \/>/u);
  assert.match(overview, /<VirtualExample kind="list" \/>/u);
  assert.match(layouts, /300개 행 × 300개 열/u);
  assert.match(layouts, /<VirtualExample kind="grid" \/>/u);
  assert.match(layouts, /<VirtualExample kind="masonry" \/>/u);
  assert.match(layouts, /<VirtualExample kind="spatial" \/>/u);
});

test('Virtual grid examples keep both axes equally large', async () => {
  const [component, examples] = await Promise.all([
    source('.vitepress/theme/components/VirtualExample.vue'),
    source('.vitepress/theme/virtual-example-code.ts'),
  ]);

  assert.match(component, /const gridTrackCount = 300;/u);
  assert.match(component, /length: gridTrackCount \* gridTrackCount/u);
  assert.match(component, /gridTrackCount, \{ kind: 'exact', value: 28 \}/u);
  assert.match(component, /gridTrackCount, \{ kind: 'exact', value: 72 \}/u);
  assert.match(examples, /const count = 300/u);
  assert.match(examples, /length: count \* count/u);
  assert.match(examples, /count, \{ kind: 'exact', value: 28 \}/u);
  assert.match(examples, /count, \{ kind: 'exact', value: 72 \}/u);
});

test('Virtual visual examples keep a dense viewport', async () => {
  const [component, examples] = await Promise.all([
    source('.vitepress/theme/components/VirtualExample.vue'),
    source('.vitepress/theme/virtual-example-code.ts'),
  ]);

  assert.match(component, /laneCount: 8/u);
  assert.match(component, /laneExtent: 108/u);
  assert.match(component, /const spatialClusterSize = 180;/u);
  assert.match(examples, /:min-lane-size="104"/u);
  assert.match(examples, /laneCount: 8, laneExtent: 108/u);
});

test('Virtual spatial examples use irregular coordinates and variable rectangles', async () => {
  const [component, examples, layouts] = await Promise.all([
    source('.vitepress/theme/components/VirtualExample.vue'),
    source('.vitepress/theme/virtual-example-code.ts'),
    source('ko/packages/virtual/layouts.md'),
  ]);

  assert.match(component, /const spatialClusterSize = 180;/u);
  assert.match(component, /Math\.cos\(angle\)/u);
  assert.match(component, /Math\.sin\(angle\)/u);
  assert.match(component, /width: item\.width, height: item\.height/u);
  assert.doesNotMatch(component, /const spatialSide = 200/u);
  assert.match(examples, /:get-z-index="node => node\.layer"/u);
  assert.match(layouts, /불규칙한 군집/u);
});
