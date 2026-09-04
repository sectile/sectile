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
  assert.match(examples, /<template #item="\{ value: row \}">/u);
  assert.match(examples, /:get-i-d="row => row\.id"/u);
  assert.match(examples, /:size-policy="\{ kind: 'measured' \}"/u);
  assert.match(examples, /:lane-policy="\{ kind: 'responsive'/u);
  assert.match(examples, /size-ownership="declared"/u);
  assert.match(examples, /<VirtualizerSurface>/u);
  assert.match(examples, /scrollport: list/u);
  assert.match(examples, /surface: listSurface/u);
  assert.doesNotMatch(examples, /class=|:class=|style=|<style/u);

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
  assert.match(examples, /minExtent: 104, maxCount: 8, gap: 8/u);
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

test('Virtual benchmark lab stays isolated and reuses docs controls', async () => {
  const [lab, targetFields, report, popover, formField, tooltip, virtualList, button, englishPage, koreanPage, config, runnerPlugin] = await Promise.all([
    source('.vitepress/theme/components/VirtualBenchmarkLab.vue'),
    source('.vitepress/theme/components/VirtualBenchmarkTargetFields.vue'),
    source('.vitepress/theme/components/VirtualBenchmarkReport.vue'),
    source('.vitepress/theme/components/DemoPopover.vue'),
    source('.vitepress/theme/components/DemoFormField.vue'),
    source('.vitepress/theme/components/DemoTooltip.vue'),
    source('.vitepress/theme/components/DemoVirtualList.vue'),
    source('.vitepress/theme/components/DocsButton.vue'),
    source('benchmarks/virtual.md'),
    source('ko/benchmarks/virtual.md'),
    source('.vitepress/config.ts'),
    source('.vitepress/virtual-benchmark-runner.ts'),
  ]);

  for (const page of [englishPage, koreanPage]) {
    assert.match(page, /layout: false/u);
    assert.match(page, /<VirtualBenchmarkLab \/>/u);
  }
  for (const component of ['DemoPopover', 'DemoProgress', 'DemoVirtualList', 'DocsButton', 'VirtualBenchmarkReport', 'VirtualBenchmarkLayoutReport', 'VirtualBenchmarkTargetFields']) {
    assert.match(lab, new RegExp(`import ${component} from`));
  }
  for (const component of ['DemoFormField', 'DemoSelect', 'DemoSpinButton']) {
    assert.match(targetFields, new RegExp(`import ${component}(?:,| from)`));
  }
  assert.match(lab, /both: '전체'/u);
  assert.match(lab, /both: 'All'/u);
  assert.doesNotMatch(lab, /from ['"]@sectile\/vue/u);
  assert.doesNotMatch(lab, /\bsandbox=/u);
  assert.match(lab, /event\.origin !== window\.location\.origin/u);
  assert.match(lab, /event\.source !== runnerFrame\.value\?\.contentWindow/u);
  assert.match(lab, /window\.setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 0\)/u);
  assert.match(lab, /interface BenchmarkTarget/u);
  assert.match(lab, /function submitTarget/u);
  assert.match(popover, /FormRoot/u);
  assert.match(popover, /FormSubmit/u);
  assert.match(popover, /FormSummary/u);
  assert.doesNotMatch(popover, /close-on-interact-outside/u);
  assert.match(popover, /<DocsButton compact appearance="ghost" @click="close">/u);
  assert.doesNotMatch(lab, /<template #submit-icon>/u);
  const configActions = lab.match(/\.benchmark-config__actions\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';
  assert.doesNotMatch(configActions, /border-top|padding-top/u);
  const targetList = lab.match(/\.benchmark-targets\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';
  const target = lab.match(/\.benchmark-target\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';
  const emptyTargets = lab.match(/\.benchmark-targets-empty\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';
  assert.doesNotMatch(targetList, /border-block/u);
  assert.doesNotMatch(emptyTargets, /border-block/u);
  assert.match(target, /border-radius:\s*\.65rem/u);
  assert.match(target, /box-shadow:\s*0 4px 14px/u);
  assert.match(lab, /if \(message\.type === 'checkpoint'\) recordCheckpoint\(message\);/u);
  assert.match(lab, /checkpoints\.value = \[\.\.\.checkpoints\.value, previousCheckpoint\]/u);
  assert.match(lab, /checkpointHistoryList\.value\?\.isAtEnd\(\)/u);
  assert.match(lab, /latestCheckpoint\.value = checkpoint/u);
  assert.match(lab, /class="benchmark-checkpoints"/u);
  assert.match(lab, /<DemoVirtualList/u);
  assert.match(virtualList, /from '@sectile\/vue\/virtual\/list'/u);
  assert.match(virtualList, /VirtualListIDResolver/u);
  assert.match(virtualList, /:get-i-d="runtimeGetID"/u);
  assert.match(virtualList, /:size-policy="\{ kind: 'fixed', extent: props\.itemExtent \}"/u);
  assert.match(virtualList, /scrollToID/u);
  const running = lab.match(/\.benchmark-running\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';
  const runningStack = lab.match(/\.benchmark-running-stack\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';
  const checkpointCard = lab.match(/\.benchmark-checkpoints\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';
  assert.match(running, /flex:\s*0 0 auto/u);
  assert.doesNotMatch(running, /min-height/u);
  assert.match(runningStack, /height:\s*calc\(100dvh/u);
  assert.match(runningStack, /min-height:\s*0/u);
  assert.match(checkpointCard, /flex:\s*1/u);
  assert.match(formField, /FormField/u);
  assert.match(formField, /FormLabel/u);
  assert.match(formField, /FormDescription/u);
  assert.match(formField, /FormMessage/u);
  assert.match(formField, /import DemoTooltip from/u);
  assert.match(formField, /props\.minimumLabel/u);
  assert.match(formField, /props\.maximumLabel/u);
  assert.match(tooltip, /TooltipRoot/u);
  assert.match(tooltip, /TooltipTrigger/u);
  assert.match(tooltip, /TooltipPortal/u);
  assert.match(tooltip, /TooltipContent/u);
  assert.match(tooltip, /@click="open = true"/u);
  assert.match(button, /readonly as\?: 'button' \| 'a' \| 'label'/u);
  assert.match(button, /hover:not\(:disabled\)/u);
  assert.match(button, /data-appearance='primary'\]:active:not\(:disabled\)/u);
  assert.match(button, /\.docs-button:disabled/u);
  assert.ok(button.indexOf('.docs-button:disabled') > button.indexOf(".docs-button[data-appearance='primary']"));
  assert.doesNotMatch(lab, /benchmark-button/u);
  assert.match(targetFields, /:hint="family === 'list' \? copy\.rowsHelp : copy\.itemsHelp"/u);
  assert.match(targetFields, /:readonly="preset !== 'custom'"/u);
  assert.doesNotMatch(targetFields, /v-if="preset === 'custom'/u);
  assert.match(lab, /const runQueue/u);
  assert.match(lab, /const showRunWorkspace = computed\(\(\) => !viewingResults\.value/u);
  assert.match(lab, /status\.value === 'cancelled'/u);
  assert.match(lab, /v-else-if="showRunWorkspace"/u);
  assert.match(lab, /v-if="resultGroups\.length > 0"/u);
  assert.match(lab, /@click="viewingResults = true"/u);
  assert.match(lab, /\.benchmark-library-totals thead\s*\{[\s\S]*border-bottom:\s*1px solid var\(--sectile-border-strong\)/u);
  assert.match(lab, /reportTargetIDs/u);
  assert.match(lab, /baselineSamples: baselineSamples\.value/u);
  assert.match(lab, /partialRun\.value = imported\.partialResults\?\.run/u);
  assert.match(lab, /imported\.partialResults === undefined \? 'complete' : 'cancelled'/u);
  assert.match(report, /\.\.\.props\.baselineFailures/u);
  assert.match(report, /showHeading \? 'benchmark-report-title' : undefined/u);
  assert.match(report, /scenario\.value === 'mount'[\s\S]*mountEvidence/u);
  assert.match(config, /plugins: \[virtualBenchmarkRunner\(\)\]/u);
  assert.match(config, /text: 'Benchmark', link: '\/benchmarks\/virtual', activeMatch: '\^\/benchmarks\/'/u);
  assert.match(config, /text: 'Benchmark lab', link: '\/benchmarks\/virtual'/u);
  assert.match(config, /text: '벤치마크', link: '\/ko\/benchmarks\/virtual', activeMatch: '\^\/ko\/benchmarks\/'/u);
  assert.match(config, /text: '벤치마크 실행', link: '\/ko\/benchmarks\/virtual'/u);
  assert.match(runnerPlugin, /outDir: runnerOutput/u);
  assert.match(runnerPlugin, /mode: 'production'/u);
  assert.match(runnerPlugin, /'process\.env\.NODE_ENV': JSON\.stringify\('production'\)/u);
});

test('Virtual benchmark runner routes each family and reports checkpoints', async () => {
  const [entry, listRunner, layoutRunner, mutationRunner, fixedAdapters, mutableAdapters, viteConfig] = await Promise.all([
    readFile(new URL('../../benchmarks/virtual-ecosystem/src/main.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../benchmarks/virtual-ecosystem/src/list-runner.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../benchmarks/virtual-ecosystem/src/layout-runner.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../benchmarks/virtual-ecosystem/src/mutation-runner.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../benchmarks/virtual-ecosystem/src/adapters.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../benchmarks/virtual-ecosystem/src/mutable-adapters.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../benchmarks/virtual-ecosystem/vite.config.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(entry, /if \(isLayoutBenchmarkFamily\(family\)\) void import\('\.\/layout-runner\.js'\)/u);
  assert.match(entry, /else void import\('\.\/list-runner\.js'\)/u);
  assert.match(listRunner, /const EMBEDDED = search\.has\('embedded'\)/u);
  assert.match(layoutRunner, /const embedded = search\.has\('embedded'\)/u);
  for (const runner of [listRunner, layoutRunner]) {
    assert.match(runner, /publish\('checkpoint'/u);
    assert.match(runner, /window\.parent\.postMessage/u);
  }
  assert.match(listRunner, /baselineSamples: baselineSampleRecords/u);
  assert.match(mutationRunner, /onCheckpoint\?\.\(\s*summarizeMutationResult/u);
  assert.match(mutationRunner, /No supported mutation conditions match the selected filters/u);
  assert.match(fixedAdapters, /item\.key\)\)\)\);/u);
  assert.doesNotMatch(mutableAdapters, /\bCellMeasurer\b/u);
  assert.match(mutableAdapters, /function ReactVirtualizedMeasuredRow/u);
  assert.match(viteConfig, /__VUE_OPTIONS_API__:\s*true/u);
  assert.match(viteConfig, /__VUE_PROD_DEVTOOLS__:\s*false/u);
  assert.match(viteConfig, /__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:\s*false/u);
});

test('Committed benchmark pages expose list through spatial from one suite report', async () => {
  const [suite, theme, data, englishPackage, koreanPackage, englishPerformance, koreanPerformance] = await Promise.all([
    source('.vitepress/theme/components/VirtualBenchmarkSuiteReport.vue'),
    source('.vitepress/theme/index.ts'),
    source('.vitepress/theme/virtual-benchmark-data.ts'),
    source('packages/virtual/benchmark.md'),
    source('ko/packages/virtual/benchmark.md'),
    source('performance/virtualization.md'),
    source('ko/performance/virtualization.md'),
  ]);

  assert.match(suite, /\['flow-grid', 'masonry', 'track-grid', 'spatial'\]/u);
  assert.match(suite, /<VirtualBenchmarkReport :show-heading="false" \/>/u);
  assert.match(suite, /<VirtualBenchmarkLayoutReport/u);
  assert.match(theme, /VirtualBenchmarkSuiteReport/u);
  assert.match(data, /export const layoutBaselineBenchmarkResults/u);
  assert.match(data, /export const layoutMutationBenchmarkResults/u);
  for (const page of [englishPackage, koreanPackage, englishPerformance, koreanPerformance]) {
    assert.match(page, /<VirtualBenchmarkSuiteReport \/>/u);
  }
});
