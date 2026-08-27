<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import { useDocsLocale } from '../locale.js';
import { baselineBenchmarkResults } from '../virtual-benchmark-data.js';

const { isKorean } = useDocsLocale();
const results = computed(() => baselineBenchmarkResults
  .filter((result) => result.mode === 'fixed')
  .map((result) => ({
    library: result.library,
    version: result.version,
    framework: result.stack,
    mount: result.mountMs,
    median: result.scrollMedianMs,
    p95: result.scrollP95Ms,
    sectile: result.library === 'Sectile Virtual',
  })));
const chartMaximum = computed(() => Math.max(1, ...results.value.flatMap((result) => [result.mount, result.median, result.p95])));
const axisTicks = computed(() => Array.from({ length: 5 }, (_, index) => chartMaximum.value * index / 4));

const copy = computed(() => isKorean.value ? {
  aria: 'Sectile Virtual의 강점과 라이브러리 비교 벤치마크',
  statementFirst: '항목 높이를 미리 계산하지 않아도',
  statementSecond: '브라우저가 잰 크기를 배치에 바로 반영합니다.',
  strengths: [
    { title: '실제 높이를 DOM에서 측정', body: '예상 높이로 먼저 그린 뒤 브라우저가 잰 크기를 다시 반영합니다. 항목별 높이는 앱의 사전 계산 대신 브라우저 측정으로 처리합니다.' },
    { title: '목록부터 자유 배치까지 같은 방식으로', body: '선형 목록과 격자, 벽돌형 카드, 좌표 기반 화면이 같은 조회·측정·변경 흐름을 사용합니다.' },
  ],
  benchmarkTitle: '주요 가상화 라이브러리와 같은 조건에서 비교',
  benchmarkContext: '10만 개 고정 높이 행 · Chrome 151 · 720 × 480px · 라이브러리마다 스크롤 200회',
  legend: { mount: '초기 표시', median: '스크롤 중앙값', p95: '스크롤 p95' },
  scope: '이 그래프는 고정 높이 목록 비교입니다. 동적 높이와 삽입·이동·삭제 실험은 상세 페이지에서 성능과 화면 오류를 함께 공개합니다.',
  benchmarkLink: '측정 방법과 원본 결과 보기',
} : {
  aria: 'Sectile Virtual strengths and ecosystem benchmark',
  statementFirst: 'Measure actual DOM height without',
  statementSecond: 'precomputing every item size.',
  strengths: [
    { title: 'Measure actual height from the DOM', body: 'Sectile starts from an estimate, then applies the browser measurement. Applications do not have to provide every exact height.' },
    { title: 'One API beyond linear lists', body: 'Linear lists, grids, masonry cards, and coordinate-based surfaces share the same query, measurement, and mutation flow.' },
  ],
  benchmarkTitle: 'Same-condition comparison with widely used virtualizers',
  benchmarkContext: '100k fixed rows · Chrome 151 · 720 × 480px · 200 scroll samples per library',
  legend: { mount: 'Initial render', median: 'Scroll median', p95: 'Scroll p95' },
  scope: 'This chart covers the fixed-height list. The detailed report publishes dynamic-height and collection-mutation timing together with visual correctness failures.',
  benchmarkLink: 'See the method and raw result',
});

const benchmarkHref = computed(() => withBase(isKorean.value ? '/ko/packages/virtual/benchmark' : '/packages/virtual/benchmark'));
const conclusion = computed(() => {
  const sectile = results.value.find((result) => result.sectile);
  const fastestMount = [...results.value].sort((left, right) => left.mount - right.mount)[0];
  const fastestScroll = [...results.value].sort((left, right) => left.median - right.median)[0];
  if (sectile === undefined || fastestMount === undefined || fastestScroll === undefined) return '';
  return isKorean.value
    ? `처음 표시가 가장 빨랐던 라이브러리는 ${fastestMount.library} ${fastestMount.mount.toFixed(1)}ms, 스크롤 중앙값이 가장 짧았던 라이브러리는 ${fastestScroll.library} ${fastestScroll.median.toFixed(1)}ms입니다. Sectile은 각각 ${sectile.mount.toFixed(1)}ms와 ${sectile.median.toFixed(1)}ms였습니다.`
    : `${fastestMount.library} had the shortest initial render at ${fastestMount.mount.toFixed(1)}ms, while ${fastestScroll.library} had the shortest median scroll response at ${fastestScroll.median.toFixed(1)}ms. Sectile recorded ${sectile.mount.toFixed(1)}ms and ${sectile.median.toFixed(1)}ms respectively.`;
});
const width = (value: number): string => `${Math.max(1.5, (value / chartMaximum.value) * 100)}%`;
</script>

<template>
  <section class="virtual-strength-overview" :aria-label="copy.aria">
    <div class="virtual-strength-overview__case">
      <p class="virtual-strength-overview__statement"><span>{{ copy.statementFirst }}</span><span>{{ copy.statementSecond }}</span></p>
      <dl>
        <div v-for="strength in copy.strengths" :key="strength.title"><dt>{{ strength.title }}</dt><dd>{{ strength.body }}</dd></div>
      </dl>
    </div>

    <figure class="virtual-strength-overview__benchmark">
      <figcaption><strong>{{ copy.benchmarkTitle }}</strong><span>{{ copy.benchmarkContext }}</span></figcaption>
      <div class="virtual-strength-overview__legend" aria-label="Legend">
        <span class="is-mount"><i />{{ copy.legend.mount }}</span>
        <span class="is-median"><i />{{ copy.legend.median }}</span>
        <span class="is-p95"><i />{{ copy.legend.p95 }}</span>
      </div>
      <div class="virtual-strength-overview__axis" aria-hidden="true">
        <div><span v-for="(tick, index) in axisTicks" :key="index">{{ index === axisTicks.length - 1 ? `${tick.toFixed(1)} ms` : tick.toFixed(1) }}</span></div>
      </div>
      <div class="virtual-strength-overview__chart" role="group">
        <div v-for="result in results" :key="result.library" class="virtual-strength-overview__group" :class="{ 'is-sectile': result.sectile }">
          <header>
            <strong>{{ result.library }}</strong>
            <small>v{{ result.version }} · {{ result.framework }}</small>
          </header>
          <div class="virtual-strength-overview__series">
            <div class="virtual-strength-overview__bar is-mount" role="img" :aria-label="`${copy.legend.mount}: ${result.mount.toFixed(1)}ms`"><i :style="{ width: width(result.mount) }" /><strong>{{ result.mount.toFixed(1) }} ms</strong></div>
            <div class="virtual-strength-overview__bar is-median" role="img" :aria-label="`${copy.legend.median}: ${result.median.toFixed(1)}ms`"><i :style="{ width: width(result.median) }" /><strong>{{ result.median.toFixed(1) }} ms</strong></div>
            <div class="virtual-strength-overview__bar is-p95" role="img" :aria-label="`${copy.legend.p95}: ${result.p95.toFixed(1)}ms`"><i :style="{ width: width(result.p95) }" /><strong>{{ result.p95.toFixed(1) }} ms</strong></div>
          </div>
        </div>
      </div>
      <p class="virtual-strength-overview__conclusion">{{ conclusion }}</p>
      <p class="virtual-strength-overview__scope">{{ copy.scope }}</p>
      <a :href="benchmarkHref">{{ copy.benchmarkLink }} <span aria-hidden="true">→</span></a>
    </figure>
  </section>
</template>

<style scoped>
.virtual-strength-overview { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; margin: 24px 0 36px; }
.virtual-strength-overview__case { width: min(100%, 780px); }
.virtual-strength-overview__statement { margin: 0 0 22px; color: var(--sectile-content-primary); font-size: 1.16rem; font-weight: 740; line-height: 1.5; letter-spacing: -0.015em; }
.virtual-strength-overview__statement span { display: block; }
.virtual-strength-overview dl, .virtual-strength-overview dl div, .virtual-strength-overview dd { margin: 0; }
.virtual-strength-overview dl { display: grid; }
.virtual-strength-overview dl div { display: grid; gap: 5px; padding: 14px 0; border-top: 1px solid var(--sectile-border-subtle); }
.virtual-strength-overview dt { color: var(--sectile-content-primary); font-size: 0.86rem; font-weight: 700; line-height: 1.55; }
.virtual-strength-overview dd { color: var(--sectile-content-secondary); font-size: 0.78rem; line-height: 1.65; }
.virtual-strength-overview__benchmark { width: min(100%, 820px); min-width: 0; margin: 0; padding: 22px; color: var(--sectile-content-primary); border: 1px solid var(--sectile-border-subtle); border-radius: 12px; }
.virtual-strength-overview figcaption { display: grid; gap: 5px; margin-bottom: 14px; }
.virtual-strength-overview figcaption strong { font-size: 0.98rem; line-height: 1.45; }
.virtual-strength-overview figcaption span, .virtual-strength-overview__scope { color: color-mix(in srgb, var(--sectile-content-secondary) 88%, var(--sectile-action)); font-size: 0.74rem; line-height: 1.65; }
.virtual-strength-overview__legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 18px; color: var(--sectile-content-secondary); font-size: 0.69rem; }
.virtual-strength-overview__legend span { display: inline-flex; align-items: center; gap: 6px; }
.virtual-strength-overview__legend i { width: 14px; height: 4px; border-radius: 1px; background: var(--bar-color); }
.virtual-strength-overview .is-mount { --bar-color: var(--sectile-feedback-info); }
.virtual-strength-overview .is-median { --bar-color: var(--sectile-feedback-success); }
.virtual-strength-overview .is-p95 { --bar-color: var(--sectile-feedback-warning); }
.virtual-strength-overview__axis { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 24px; margin: 0 0 7px; color: var(--sectile-content-tertiary); font-size: 0.61rem; font-variant-numeric: tabular-nums; }
.virtual-strength-overview__axis > div { display: grid; grid-column: 2; grid-template-columns: repeat(5, 1fr); margin-right: 54px; }
.virtual-strength-overview__axis span { text-align: right; }
.virtual-strength-overview__axis span:first-child { text-align: left; }
.virtual-strength-overview__chart { overflow: hidden; border-top: 1px solid color-mix(in srgb, var(--sectile-action) 18%, var(--sectile-border-subtle)); }
.virtual-strength-overview__group { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 20px; align-items: center; padding: 10px 0; border-bottom: 1px solid color-mix(in srgb, var(--sectile-action) 18%, var(--sectile-border-subtle)); }
.virtual-strength-overview__group header { display: grid; align-content: center; gap: 2px; min-width: 0; }
.virtual-strength-overview__group header strong { font-size: 0.77rem; line-height: 1.35; }
.virtual-strength-overview__group.is-sectile header strong { color: var(--sectile-action); }
.virtual-strength-overview__group header small { color: var(--sectile-content-tertiary); font-size: 0.62rem; line-height: 1.35; }
.virtual-strength-overview__series { display: grid; gap: 2px; min-width: 0; }
.virtual-strength-overview__bar { display: grid; grid-template-columns: minmax(0, 1fr) 48px; align-items: center; gap: 6px; min-height: 8px; }
.virtual-strength-overview__bar::before { grid-area: 1 / 1; width: 100%; height: 4px; border-radius: 1px; background: color-mix(in srgb, var(--sectile-content-tertiary) 8%, transparent); content: ''; }
.virtual-strength-overview__bar i { grid-area: 1 / 1; z-index: 1; height: 4px; border-radius: 1px; background: var(--bar-color); }
.virtual-strength-overview__bar strong { color: var(--sectile-content-secondary); font-size: 0.64rem; font-weight: 650; font-variant-numeric: tabular-nums; text-align: right; }
.virtual-strength-overview__conclusion { margin: 16px 0 0; color: var(--sectile-content-primary); font-size: 0.79rem; font-weight: 660; line-height: 1.65; }
.virtual-strength-overview__scope { margin: 8px 0 12px; }
.virtual-strength-overview__benchmark > a { color: var(--sectile-action); font-size: 0.78rem; font-weight: 720; text-decoration: none; }
.virtual-strength-overview__benchmark > a:hover { text-decoration: underline; text-underline-offset: 3px; }
.virtual-strength-overview__benchmark > a:focus-visible { outline: 2px solid var(--sectile-focus-ring); outline-offset: 4px; border-radius: 2px; }

@media (max-width: 560px) {
  .virtual-strength-overview { gap: 24px; margin: 20px 0 30px; }
  .virtual-strength-overview__benchmark { box-sizing: border-box; padding: 18px; }
  .virtual-strength-overview__statement { margin-bottom: 18px; font-size: 1.05rem; }
  .virtual-strength-overview dt { font-size: 0.84rem; }
  .virtual-strength-overview dd { font-size: 0.76rem; }
  .virtual-strength-overview__axis { display: block; }
  .virtual-strength-overview__axis > div { margin-right: 48px; }
  .virtual-strength-overview__group { display: block; padding: 12px 0; }
  .virtual-strength-overview__group header { margin-bottom: 8px; }
  .virtual-strength-overview__bar { grid-template-columns: minmax(0, 1fr) 42px; }
}
</style>
