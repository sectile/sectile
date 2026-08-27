<script setup lang="ts">
import { computed } from 'vue';
import { useDocsLocale } from '../locale.js';
import {
  baselineBenchmarkResults,
  mutationBenchmarkResults,
  type BenchmarkLocation,
  type BenchmarkOperation,
  type MutationBenchmarkResult,
} from '../virtual-benchmark-data.js';

const { isKorean } = useDocsLocale();
const baselineMaximum = 50;
const operations: readonly BenchmarkOperation[] = Object.freeze(['insert', 'move', 'remove', 'resize']);
const locations: readonly BenchmarkLocation[] = Object.freeze(['start', 'middle', 'end']);

const copy = computed(() => isKorean.value ? {
  baselineTitle: '고정 높이 목록',
  baselineDescription: '10만 개 행을 처음 표시하고 스크롤한 시간. 짧을수록 빠릅니다.',
  baselineLegend: { mount: '처음 표시', median: '평소 스크롤', p95: '느린 5% 경계' },
  footprintTitle: '화면을 만드는 데 쓴 DOM',
  footprintDescription: '같은 HTML 행을 그려도 라이브러리가 추가하는 래퍼와 미리 만든 행 수는 다릅니다.',
  renderedRows: '만든 행',
  domElements: '생성된 DOM 요소',
  mutationTitle: '목록 변경 뒤 화면이 안정될 때까지',
  mutationDescription: '각 변경을 목록의 시작·중간·끝에서 10번씩 실행했습니다. 막대는 로그 눈금이며 짧을수록 빠릅니다.',
  mutationLegend: { median: '중앙값', p95: '느린 5% 경계', failure: '화면 이상 감지' },
  logScale: (maximum: number) => `최대 ${maximum.toFixed(0)} ms · 로그 눈금`,
  operation: { insert: '삽입', move: '이동', remove: '삭제', resize: '높이 변경' },
  location: { start: '목록 시작', middle: '목록 중간', end: '목록 끝' },
  stableFailure: '정상 상태에 도달하지 못함',
  transientFailure: (correct: number, total: number) => `화면 이상 ${total - correct}/${total}회`,
  correct: (correct: number, total: number) => `${correct}/${total} 정상`,
  failureCode: { 'scroll-anchor': '기준 행 이동', 'row-overlap': '행 겹침', 'scroll-height': '전체 높이 오차', 'blank-viewport': '빈 화면', timeout: '안정화 실패', 'row-gap': '행 사이 빈틈', 'row-height': '행 높이 오차', 'row-order': '행 순서 오류', 'duplicate-id': 'ID 중복', 'unexpected-id': '잘못된 ID' } as Record<string, string>,
  heightTitle: '높이를 누가 계산했나',
  heightDescription: '모든 동적 높이 실험은 48px 예상값으로 시작했습니다. 정확한 높이는 DOM에서 읽고, 가상화 API에는 처음의 예상값만 제공했습니다.',
  heightAutomatic: 'DOM을 자동 측정',
  heightInvalidation: 'DOM 측정 + 캐시 갱신 호출',
  heightPrecompute: '정확한 높이 사전 계산',
  no: '사전 계산 없음',
  methodNote: '프레임마다 DOM 순서·높이·전체 스크롤 높이·빈 영역·겹침·기준 행 위치를 검사했습니다. 하나라도 어긋난 프레임은 시간과 별개로 실패에 포함했습니다.',
} : {
  baselineTitle: 'Fixed-height list',
  baselineDescription: 'Time to mount and scroll 100,000 rows. Shorter is faster.',
  baselineLegend: { mount: 'Initial render', median: 'Typical scroll', p95: 'Slower 5% boundary' },
  footprintTitle: 'DOM used to build the viewport',
  footprintDescription: 'Internal wrappers and pre-rendered rows remain part of each library’s output.',
  renderedRows: 'Rendered rows',
  domElements: 'DOM elements',
  mutationTitle: 'Time to settle after collection changes',
  mutationDescription: 'Each change ran ten times at the start, middle, and end of the collection. Bars use a logarithmic scale; shorter is faster.',
  mutationLegend: { median: 'Median', p95: 'Slower 5% boundary', failure: 'Visual failure detected' },
  logScale: (maximum: number) => `Max ${maximum.toFixed(0)} ms · logarithmic scale`,
  operation: { insert: 'Insert', move: 'Move', remove: 'Remove', resize: 'Height change' },
  location: { start: 'Collection start', middle: 'Collection middle', end: 'Collection end' },
  stableFailure: 'Did not reach a correct stable state',
  transientFailure: (correct: number, total: number) => `Visual failure in ${total - correct}/${total} runs`,
  correct: (correct: number, total: number) => `${correct}/${total} correct`,
  failureCode: { 'scroll-anchor': 'anchor moved', 'row-overlap': 'row overlap', 'scroll-height': 'scroll-height error', 'blank-viewport': 'blank viewport', timeout: 'failed to settle', 'row-gap': 'row gap', 'row-height': 'row-height error', 'row-order': 'row-order error', 'duplicate-id': 'duplicate ID', 'unexpected-id': 'unexpected ID' } as Record<string, string>,
  heightTitle: 'Who calculated the row height',
  heightDescription: 'Every dynamic-height run started from a 48px estimate. The changed exact height was not passed back into the virtualization API.',
  heightAutomatic: 'Automatic DOM measurement',
  heightInvalidation: 'DOM measurement + cache invalidation call',
  heightPrecompute: 'Exact height precomputation',
  no: 'No precomputation',
  methodNote: 'Every frame was checked for DOM order, row height, total scroll height, blank space, overlap, and anchor position. Any incorrect frame is recorded separately from timing.',
});

const heightRows = computed(() => baselineBenchmarkResults.map((baseline) => {
  const dynamic = mutationBenchmarkResults.find((result) => result.library === baseline.library);
  return {
    ...baseline,
    handling: dynamic?.heightHandling.resizeNotification === 'cache-invalidation'
      ? copy.value.heightInvalidation
      : copy.value.heightAutomatic,
    precompute: dynamic?.heightHandling.applicationCalculatesHeight ? 'Required' : copy.value.no,
  };
}));

const baselineWidth = (value: number): string => `${Math.max(1, value / baselineMaximum * 100)}%`;
const countWidth = (value: number, maximum: number): string => `${Math.max(2, value / maximum * 100)}%`;
const mutationWidth = (value: number | null, maximum: number): string => value === null
  ? '0%'
  : `${Math.max(1.5, Math.log10(value + 1) / Math.log10(maximum + 1) * 100)}%`;
const formatTime = (value: number | null): string => value === null ? '—' : `${value.toFixed(1)} ms`;

function resultsFor(operation: BenchmarkOperation, location: BenchmarkLocation): readonly MutationBenchmarkResult[] {
  return mutationBenchmarkResults.filter((result) => result.operation === operation && result.location === location);
}

function mutationMaximum(results: readonly MutationBenchmarkResult[]): number {
  return Math.max(10, ...results.flatMap((result) => [result.medianMs ?? 0, result.p95Ms ?? 0]));
}

function failureLabel(result: MutationBenchmarkResult): string {
  if (result.correctSamples === result.totalSamples) return copy.value.correct(result.correctSamples, result.totalSamples);
  const state = result.settledSamples === 0
    ? copy.value.stableFailure
    : copy.value.transientFailure(result.correctSamples, result.totalSamples);
  const failures = result.failureCodes.map((code) => copy.value.failureCode[code] ?? code).join(' · ');
  return failures.length === 0 ? state : `${state} · ${failures}`;
}
</script>

<template>
  <section class="virtual-benchmark-report">
    <figure class="benchmark-figure" aria-labelledby="baseline-title">
      <figcaption>
        <strong id="baseline-title">{{ copy.baselineTitle }}</strong>
        <span>{{ copy.baselineDescription }}</span>
      </figcaption>
      <div class="chart-legend">
        <span class="is-mount"><i />{{ copy.baselineLegend.mount }}</span>
        <span class="is-median"><i />{{ copy.baselineLegend.median }}</span>
        <span class="is-p95"><i />{{ copy.baselineLegend.p95 }}</span>
      </div>
      <div class="benchmark-chart">
        <div v-for="result in baselineBenchmarkResults" :key="result.library" class="benchmark-row" :class="{ 'is-sectile': result.library === 'Sectile Virtual' }">
          <header><strong>{{ result.library }}</strong><small>v{{ result.version }} · {{ result.stack }}</small></header>
          <div class="bar-series">
            <div class="bar is-mount"><i :style="{ width: baselineWidth(result.mountMs) }" /><span>{{ result.mountMs.toFixed(1) }} ms</span></div>
            <div class="bar is-median"><i :style="{ width: baselineWidth(result.scrollMedianMs) }" /><span>{{ result.scrollMedianMs.toFixed(1) }} ms</span></div>
            <div class="bar is-p95"><i :style="{ width: baselineWidth(result.scrollP95Ms) }" /><span>{{ result.scrollP95Ms.toFixed(1) }} ms</span></div>
          </div>
        </div>
      </div>
    </figure>

    <figure class="benchmark-figure" aria-labelledby="footprint-title">
      <figcaption>
        <strong id="footprint-title">{{ copy.footprintTitle }}</strong>
        <span>{{ copy.footprintDescription }}</span>
      </figcaption>
      <div class="chart-legend"><span class="is-rows"><i />{{ copy.renderedRows }}</span><span class="is-elements"><i />{{ copy.domElements }}</span></div>
      <div class="benchmark-chart">
        <div v-for="result in baselineBenchmarkResults" :key="result.library" class="benchmark-row" :class="{ 'is-sectile': result.library === 'Sectile Virtual' }">
          <header><strong>{{ result.library }}</strong><small>v{{ result.version }} · {{ result.stack }}</small></header>
          <div class="bar-series">
            <div class="bar is-rows"><i :style="{ width: countWidth(result.renderedRows, 84) }" /><span>{{ result.renderedRows }}</span></div>
            <div class="bar is-elements"><i :style="{ width: countWidth(result.domElements, 84) }" /><span>{{ result.domElements }}</span></div>
          </div>
        </div>
      </div>
    </figure>

    <section class="mutation-report" aria-labelledby="mutation-title">
      <header class="section-heading">
        <h2 id="mutation-title">{{ copy.mutationTitle }}</h2>
        <p>{{ copy.mutationDescription }}</p>
      </header>
      <div class="chart-legend"><span class="is-median"><i />{{ copy.mutationLegend.median }}</span><span class="is-p95"><i />{{ copy.mutationLegend.p95 }}</span><span class="is-failure"><i />{{ copy.mutationLegend.failure }}</span></div>

      <section v-for="operation in operations" :key="operation" class="operation-group">
        <h3>{{ copy.operation[operation] }}</h3>
        <figure v-for="location in locations" :key="location" class="mutation-figure">
          <figcaption><strong>{{ copy.location[location] }}</strong><span>{{ copy.logScale(mutationMaximum(resultsFor(operation, location))) }}</span></figcaption>
          <div class="benchmark-chart">
            <div v-for="result in resultsFor(operation, location)" :key="result.library" class="benchmark-row mutation-row" :class="{ 'is-sectile': result.library === 'Sectile Virtual', 'has-failure': result.correctSamples < result.totalSamples }">
              <header><strong>{{ result.library }}</strong><small>v{{ result.version }} · {{ result.stack }}</small></header>
              <div class="bar-series">
                <div class="bar is-median"><i :style="{ width: mutationWidth(result.medianMs, mutationMaximum(resultsFor(operation, location))) }" /><span>{{ formatTime(result.medianMs) }}</span></div>
                <div class="bar is-p95"><i :style="{ width: mutationWidth(result.p95Ms, mutationMaximum(resultsFor(operation, location))) }" /><span>{{ formatTime(result.p95Ms) }}</span></div>
                <small class="result-state">{{ failureLabel(result) }}</small>
              </div>
            </div>
          </div>
        </figure>
      </section>
      <p class="method-note">{{ copy.methodNote }}</p>
    </section>

    <section class="height-report" aria-labelledby="height-title">
      <header class="section-heading">
        <h2 id="height-title">{{ copy.heightTitle }}</h2>
        <p>{{ copy.heightDescription }}</p>
      </header>
      <dl>
        <div v-for="result in heightRows" :key="result.library">
          <dt><strong>{{ result.library }}</strong><small>v{{ result.version }} · {{ result.stack }}</small></dt>
          <dd><span>{{ result.handling }}</span><span>{{ copy.heightPrecompute }}: <strong>{{ result.precompute }}</strong></span></dd>
        </div>
      </dl>
    </section>
  </section>
</template>

<style scoped>
.virtual-benchmark-report { display: grid; gap: 52px; margin: 32px 0 44px; color: var(--sectile-content-primary); }
.benchmark-figure, .mutation-figure { min-width: 0; margin: 0; }
.benchmark-figure > figcaption, .section-heading { display: grid; gap: 5px; margin-bottom: 14px; }
.benchmark-figure > figcaption strong, .section-heading h2 { margin: 0; color: var(--sectile-content-primary); font-size: 1rem; line-height: 1.45; letter-spacing: -0.015em; }
.benchmark-figure > figcaption span, .section-heading p { max-width: 70ch; margin: 0; color: var(--sectile-content-secondary); font-size: 0.82rem; line-height: 1.65; }
.chart-legend { display: flex; flex-wrap: wrap; gap: 7px 16px; margin-bottom: 12px; color: var(--sectile-content-secondary); font-size: 0.74rem; }
.chart-legend span { display: inline-flex; align-items: center; gap: 6px; }
.chart-legend i { width: 14px; height: 4px; border-radius: 1px; background: var(--bar-color); }
.is-mount { --bar-color: var(--sectile-feedback-info); }
.is-median, .is-rows { --bar-color: var(--sectile-feedback-success); }
.is-p95, .is-elements { --bar-color: var(--sectile-feedback-warning); }
.is-failure { --bar-color: var(--sectile-feedback-critical); }
.benchmark-chart { border-top: 1px solid var(--sectile-border-subtle); }
.benchmark-row { display: grid; grid-template-columns: minmax(150px, 0.34fr) minmax(0, 1fr); gap: 18px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--sectile-border-subtle); }
.benchmark-row header { display: grid; min-width: 0; gap: 1px; }
.benchmark-row header strong { font-size: 0.82rem; line-height: 1.4; }
.benchmark-row.is-sectile header strong { color: var(--sectile-action); }
.benchmark-row header small { color: var(--sectile-content-tertiary); font-size: 0.7rem; line-height: 1.35; }
.bar-series { display: grid; min-width: 0; gap: 2px; }
.bar { display: grid; grid-template-columns: minmax(0, 1fr) 52px; align-items: center; gap: 8px; min-height: 7px; }
.bar::before { grid-area: 1 / 1; width: 100%; height: 4px; border-radius: 1px; background: color-mix(in srgb, var(--sectile-content-tertiary) 9%, transparent); content: ''; }
.bar i { grid-area: 1 / 1; z-index: 1; height: 4px; border-radius: 1px; background: var(--bar-color); }
.bar span { color: var(--sectile-content-secondary); font-size: 0.7rem; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.section-heading h2 { padding: 0; border: 0; }
.operation-group { margin-top: 32px; }
.operation-group > h3 { margin: 0 0 14px; font-size: 0.92rem; }
.mutation-figure + .mutation-figure { margin-top: 26px; }
.mutation-figure > figcaption { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 7px; }
.mutation-figure > figcaption strong { font-size: 0.82rem; }
.mutation-figure > figcaption span { color: var(--sectile-content-tertiary); font-size: 0.7rem; font-variant-numeric: tabular-nums; }
.mutation-row { padding-top: 7px; padding-bottom: 7px; }
.result-state { color: var(--sectile-feedback-success); font-size: 0.7rem; line-height: 1.4; }
.has-failure .result-state { color: var(--sectile-feedback-critical); font-weight: 700; }
.method-note { margin: 22px 0 0; color: var(--sectile-content-secondary); font-size: 0.8rem; line-height: 1.7; }
.height-report dl, .height-report dl div, .height-report dd { margin: 0; }
.height-report dl { border-top: 1px solid var(--sectile-border-subtle); }
.height-report dl div { display: grid; grid-template-columns: minmax(150px, 0.34fr) minmax(0, 1fr); gap: 18px; padding: 10px 0; border-bottom: 1px solid var(--sectile-border-subtle); }
.height-report dt { display: grid; gap: 1px; }
.height-report dt strong { font-size: 0.82rem; }
.height-report dt small { color: var(--sectile-content-tertiary); font-size: 0.7rem; }
.height-report dd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px 18px; color: var(--sectile-content-secondary); font-size: 0.78rem; }
.height-report dd strong { color: var(--sectile-content-primary); }

@media (max-width: 560px) {
  .virtual-benchmark-report { gap: 42px; margin-top: 26px; }
  .benchmark-row, .height-report dl div { grid-template-columns: minmax(0, 1fr); gap: 7px; }
  .benchmark-row header { grid-template-columns: auto 1fr; align-items: baseline; gap: 7px; }
  .bar { grid-template-columns: minmax(0, 1fr) 48px; }
  .height-report dd { display: grid; gap: 3px; }
}
</style>
