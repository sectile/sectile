<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDocsLocale } from '../locale.js';
import DemoCascadeSelect from './DemoCascadeSelect.vue';
import {
  baselineBenchmarkResults,
  mutationBenchmarkResults,
  type BenchmarkHeightMode,
  type BenchmarkLocation,
  type BenchmarkOperation,
  type MutationBenchmarkResult,
} from '../virtual-benchmark-data.js';

type BaselineScenario = 'mount' | 'scroll';
type Scenario = BaselineScenario | BenchmarkOperation;
type ChartResult = {
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly values: readonly (number | null)[];
  readonly state: string | null;
  readonly failed: boolean;
};

const { isKorean } = useDocsLocale();
const baselineScenarios: readonly BaselineScenario[] = Object.freeze(['mount', 'scroll']);
const scenarios: readonly Scenario[] = Object.freeze([...baselineScenarios, 'insert', 'move', 'remove', 'resize']);
const cascadeNodes = Object.freeze([
  ...scenarios.map((item) => ({ id: `scenario:${item}`, parentID: null })),
  ...baselineScenarios.flatMap((baselineScenario) => (['fixed', 'estimated', 'automatic'] as const).map((mode) => ({ id: `${baselineScenario}:${mode}`, parentID: `scenario:${baselineScenario}` }))),
  ...(['insert', 'move', 'remove', 'resize'] as const).flatMap((operation) => [
    { id: `${operation}:estimated`, parentID: `scenario:${operation}` },
    { id: `${operation}:automatic`, parentID: `scenario:${operation}` },
    ...(['estimated', 'automatic'] as const).flatMap((mode) => (['start', 'middle', 'end'] as const).map((itemLocation) => ({
      id: `${operation}:${mode}:${itemLocation}`,
      parentID: `${operation}:${mode}`,
    }))),
  ]),
]);
const cascadeValue = ref<string | null>('mount:fixed');

const copy = computed(() => isKorean.value ? {
  title: '같은 조건에서 결과 비교',
  description: '조건을 바꾸면 같은 그래프에서 일곱 라이브러리의 결과를 바로 비교할 수 있습니다.',
  conditionLabel: '비교 조건',
  conditionPlaceholder: '비교할 조건 선택',
  columnLabel: ['측정 항목', '높이 입력', '변경 위치'],
  scenario: { mount: '처음 표시', scroll: '스크롤', insert: '삽입', move: '이동', remove: '삭제', resize: '높이 변경' } as Record<Scenario, string>,
  mode: { fixed: '고정 높이', estimated: '예상값 제공', automatic: '높이 생략' } as Record<BenchmarkHeightMode, string>,
  location: { start: '시작', middle: '중간', end: '끝' } as Record<BenchmarkLocation, string>,
  mountLegend: ['처음 표시', null, null],
  scrollLegend: ['스크롤 중앙값', '느린 5% 경계', null],
  mutationLegend: ['중앙값', '느린 5% 경계'],
  unsupported: '이 조건은 높이 예상값 없이 시작할 수 없음',
  stableFailure: '정상 화면에 도달하지 못함',
  transientFailure: (correct: number, total: number) => `화면 이상 ${total - correct}/${total}회`,
  failureCode: { 'scroll-anchor': '기준 행 이동', 'row-overlap': '행 겹침', 'scroll-height': '전체 높이 오차', 'blank-viewport': '빈 화면', timeout: '안정화 실패', 'row-gap': '행 사이 빈틈', 'row-height': '행 높이 오차', 'row-order': '행 순서 오류', 'duplicate-id': 'ID 중복', 'unexpected-id': '잘못된 ID' } as Record<string, string>,
  scale: (maximum: number, logarithmic: boolean) => logarithmic ? `최대 ${maximum.toFixed(0)} ms · 로그 눈금` : `최대 ${maximum.toFixed(0)} ms`,
  criteriaTitle: '이 그래프의 측정 기준',
  criteriaLabel: {
    data: '데이터',
    viewport: '화면',
    height: '높이 입력',
    repeat: '반복',
    completion: '완료 판정',
    environment: '환경',
  },
  criteriaValue: {
    data: '같은 행 100,000개',
    viewport: '720 × 480px · 여유 8행',
    height: {
      fixed: '정확한 48px 전달',
      estimated: '48px 예상값 뒤 DOM 실측',
      automatic: '높이값 없이 DOM 실측',
    } as Record<BenchmarkHeightMode, string>,
    repeat: {
      mount: '라이브러리 순서를 바꿔 5회',
      scroll: '5회 · 준비 5번 뒤 40번 기록',
      mutation: '같은 조건 10회',
    },
    completion: {
      mount: '전체 높이와 화면 배치가 모두 맞은 시점',
      scroll: '목표 행이 DOM에 나타난 시점',
      mutation: '순서·높이·전체 높이·기준 위치가 모두 맞은 프레임',
    },
    environment: 'Chrome 151 · Apple Silicon · macOS',
  },
} : {
  title: 'Compare results under the same conditions',
  description: 'Change the scenario to compare all seven libraries in the same chart.',
  conditionLabel: 'Comparison conditions',
  conditionPlaceholder: 'Choose conditions',
  columnLabel: ['Scenario', 'Height input', 'Mutation position'],
  scenario: { mount: 'Initial render', scroll: 'Scroll', insert: 'Insert', move: 'Move', remove: 'Remove', resize: 'Height change' } as Record<Scenario, string>,
  mode: { fixed: 'Fixed height', estimated: 'Estimate provided', automatic: 'Height omitted' } as Record<BenchmarkHeightMode, string>,
  location: { start: 'Start', middle: 'Middle', end: 'End' } as Record<BenchmarkLocation, string>,
  mountLegend: ['Initial render', null, null],
  scrollLegend: ['Scroll median', 'Slower 5% boundary', null],
  mutationLegend: ['Median', 'Slower 5% boundary'],
  unsupported: 'This condition cannot start without a height estimate',
  stableFailure: 'Did not reach a correct stable state',
  transientFailure: (correct: number, total: number) => `Visual failure in ${total - correct}/${total} runs`,
  failureCode: { 'scroll-anchor': 'anchor moved', 'row-overlap': 'row overlap', 'scroll-height': 'scroll-height error', 'blank-viewport': 'blank viewport', timeout: 'failed to settle', 'row-gap': 'row gap', 'row-height': 'row-height error', 'row-order': 'row-order error', 'duplicate-id': 'duplicate ID', 'unexpected-id': 'unexpected ID' } as Record<string, string>,
  scale: (maximum: number, logarithmic: boolean) => logarithmic ? `Max ${maximum.toFixed(0)} ms · logarithmic scale` : `Max ${maximum.toFixed(0)} ms`,
  criteriaTitle: 'Measurement criteria for this chart',
  criteriaLabel: {
    data: 'Data',
    viewport: 'Viewport',
    height: 'Height input',
    repeat: 'Repetition',
    completion: 'Completion',
    environment: 'Environment',
  },
  criteriaValue: {
    data: '100,000 identical rows',
    viewport: '720 × 480px · 8-row overscan',
    height: {
      fixed: 'Exact 48px supplied',
      estimated: '48px estimate, then DOM measurement',
      automatic: 'DOM measurement without a height value',
    } as Record<BenchmarkHeightMode, string>,
    repeat: {
      mount: '5 rounds with rotated library order',
      scroll: '5 rounds · 5 warm-ups, then 40 samples',
      mutation: '10 samples under the same condition',
    },
    completion: {
      mount: 'Correct total height and viewport geometry',
      scroll: 'Target row appears in the DOM',
      mutation: 'Correct order, geometry, total height, and anchor',
    },
    environment: 'Chrome 151 · Apple Silicon · macOS',
  },
});

const selectionParts = computed(() => (cascadeValue.value ?? 'mount:fixed').split(':'));
const scenario = computed<Scenario>(() => (selectionParts.value[0] ?? 'mount') as Scenario);
const baselineMode = computed<BenchmarkHeightMode>(() => (selectionParts.value[1] ?? 'fixed') as BenchmarkHeightMode);
const mutationMode = computed<Exclude<BenchmarkHeightMode, 'fixed'>>(() => (selectionParts.value[1] ?? 'estimated') as Exclude<BenchmarkHeightMode, 'fixed'>);
const location = computed<BenchmarkLocation>(() => (selectionParts.value[2] ?? 'start') as BenchmarkLocation);
const logarithmic = computed(() => !isBaselineScenario(scenario.value));
const legendSlots = computed<readonly (string | null)[]>(() => {
  if (scenario.value === 'mount') return copy.value.mountLegend;
  if (scenario.value === 'scroll') return copy.value.scrollLegend;
  return [...copy.value.mutationLegend, null];
});
const libraryMetadata = computed(() => baselineBenchmarkResults
  .filter((result) => result.mode === 'fixed')
  .map(({ library, version, stack }) => ({ library, version, stack })));

const chartResults = computed<readonly ChartResult[]>(() => libraryMetadata.value.map((metadata) => {
  if (isBaselineScenario(scenario.value)) return baselineResult(metadata);
  return mutationResult(metadata);
}));

const maximum = computed(() => Math.max(
  1,
  ...chartResults.value.flatMap((result) => result.values.map((value) => value ?? 0)),
));

const selectedDescription = computed(() => {
  const mode = isBaselineScenario(scenario.value) ? baselineMode.value : mutationMode.value;
  const parts = [copy.value.scenario[scenario.value], copy.value.mode[mode]];
  if (!isBaselineScenario(scenario.value)) parts.push(copy.value.location[location.value]);
  return parts.join(' · ');
});

const benchmarkCriteria = computed(() => {
  const mode = isBaselineScenario(scenario.value) ? baselineMode.value : mutationMode.value;
  const phase = scenario.value === 'mount' ? 'mount' : scenario.value === 'scroll' ? 'scroll' : 'mutation';
  return [
    { label: copy.value.criteriaLabel.data, value: copy.value.criteriaValue.data },
    { label: copy.value.criteriaLabel.viewport, value: copy.value.criteriaValue.viewport },
    { label: copy.value.criteriaLabel.height, value: copy.value.criteriaValue.height[mode] },
    { label: copy.value.criteriaLabel.repeat, value: copy.value.criteriaValue.repeat[phase] },
    { label: copy.value.criteriaLabel.completion, value: copy.value.criteriaValue.completion[phase] },
    { label: copy.value.criteriaLabel.environment, value: copy.value.criteriaValue.environment },
  ];
});

function baselineResult(metadata: { readonly library: string; readonly version: string; readonly stack: string }): ChartResult {
  const result = baselineBenchmarkResults.find((entry) => entry.library === metadata.library && entry.mode === baselineMode.value);
  if (result === undefined) return unsupportedResult(metadata);
  const values = scenario.value === 'mount'
    ? [result.mountMs, null, null]
    : [result.scrollMedianMs, result.scrollP95Ms, null];
  return { ...metadata, values, state: null, failed: false };
}

function mutationResult(metadata: { readonly library: string; readonly version: string; readonly stack: string }): ChartResult {
  const result = mutationBenchmarkResults.find((entry) => entry.library === metadata.library
    && entry.sizeMode === mutationMode.value
    && entry.operation === scenario.value
    && entry.location === location.value);
  if (result === undefined) return unsupportedResult(metadata);
  return {
    ...metadata,
    values: [result.medianMs, result.p95Ms, null],
    state: result.correctSamples < result.totalSamples ? failureLabel(result) : null,
    failed: result.correctSamples < result.totalSamples,
  };
}

function unsupportedResult(metadata: { readonly library: string; readonly version: string; readonly stack: string }): ChartResult {
  return {
    ...metadata,
    values: [null, null, null],
    state: copy.value.unsupported,
    failed: false,
  };
}

function barTransform(value: number | null): string {
  if (value === null) return 'scaleX(0)';
  const ratio = logarithmic.value
    ? Math.log10(value + 1) / Math.log10(maximum.value + 1)
    : value / maximum.value;
  return `scaleX(${Math.max(0.018, ratio)})`;
}

function formatTime(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} ms`;
}

function nodeLabel(id: string): string {
  const parts = id.split(':');
  if (parts[0] === 'scenario') return copy.value.scenario[(parts[1] ?? 'mount') as Scenario];
  if (parts.length === 2) return copy.value.mode[(parts[1] ?? 'estimated') as BenchmarkHeightMode];
  return copy.value.location[(parts[2] ?? 'start') as BenchmarkLocation];
}

function isBaselineScenario(value: Scenario): value is BaselineScenario {
  return value === 'mount' || value === 'scroll';
}

function failureLabel(result: MutationBenchmarkResult): string {
  const state = result.settledSamples === 0 ? copy.value.stableFailure : copy.value.transientFailure(result.correctSamples, result.totalSamples);
  const failures = result.failureCodes.map((code) => copy.value.failureCode[code] ?? code).join(' · ');
  return failures.length === 0 ? state : `${state} · ${failures}`;
}
</script>

<template>
  <section class="virtual-benchmark-report" aria-labelledby="benchmark-report-title">
    <header class="report-heading">
      <h2 id="benchmark-report-title">{{ copy.title }}</h2>
      <p>{{ copy.description }}</p>
    </header>

    <div class="ds-field benchmark-condition">
      <span>{{ copy.conditionLabel }}</span>
      <DemoCascadeSelect v-model="cascadeValue" :nodes="cascadeNodes" :text-value="nodeLabel" :label="copy.conditionLabel" :column-labels="copy.columnLabel" :placeholder="copy.conditionPlaceholder" separator=" · " floating />
    </div>

    <figure class="benchmark-figure" aria-labelledby="selected-benchmark-title">
      <figcaption>
        <strong id="selected-benchmark-title" aria-live="polite" :title="selectedDescription">{{ selectedDescription }}</strong>
        <span>{{ copy.scale(maximum, logarithmic) }}</span>
      </figcaption>

      <div class="chart-legend" aria-label="Legend">
        <span v-for="(label, index) in legendSlots" :key="index" :class="[`is-series-${index}`, { 'is-placeholder': label === null }]" :aria-hidden="label === null"><i />{{ label ?? copy.mutationLegend[0] }}</span>
      </div>

      <div class="benchmark-chart">
        <div v-for="result in chartResults" :key="result.library" class="benchmark-row" :class="{ 'is-sectile': result.library === 'Sectile Virtual' }">
          <header>
            <strong>{{ result.library }}</strong>
            <small>v{{ result.version }} · {{ result.stack }}</small>
          </header>
          <div class="result-content">
            <div v-if="result.state !== null" class="result-message" :class="{ 'is-failure': result.failed }" :title="result.state">{{ result.state }}</div>
            <div v-else class="bar-series">
              <div v-for="(value, index) in result.values" :key="index" class="bar" :class="[`is-series-${index}`, { 'is-placeholder': legendSlots[index] === null }]" :role="legendSlots[index] === null ? undefined : 'img'" :aria-label="legendSlots[index] === null ? undefined : `${legendSlots[index]}: ${formatTime(value)}`" :aria-hidden="legendSlots[index] === null">
                <i :style="{ transform: barTransform(value) }" />
                <span>{{ formatTime(value) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="benchmark-criteria" :aria-label="copy.criteriaTitle">
        <strong>{{ copy.criteriaTitle }}</strong>
        <dl>
          <div v-for="criterion in benchmarkCriteria" :key="criterion.label">
            <dt>{{ criterion.label }}</dt>
            <dd>{{ criterion.value }}</dd>
          </div>
        </dl>
      </footer>
    </figure>
  </section>
</template>

<style scoped>
.virtual-benchmark-report { display: grid; gap: 18px; margin: 28px 0 0; color: var(--sectile-content-primary); }
.report-heading { display: grid; gap: 5px; }
.report-heading h2 { margin: 0; padding: 0; border: 0; font-size: 1rem; line-height: 1.45; letter-spacing: -0.015em; }
.report-heading p { max-width: 70ch; margin: 0; color: var(--sectile-content-secondary); font-size: 0.8rem; line-height: 1.65; }
.benchmark-condition { position: relative; padding: 14px 0; border-block: 1px solid var(--sectile-border-subtle); }
.benchmark-figure { min-width: 0; margin: 0; }
.benchmark-figure > figcaption { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.benchmark-figure > figcaption strong { min-width: 0; overflow: hidden; font-size: 0.84rem; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.benchmark-figure > figcaption span { color: var(--sectile-content-tertiary); font-size: 0.68rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.chart-legend { display: flex; flex-wrap: nowrap; gap: 6px 14px; min-height: 1.35em; margin-bottom: 8px; overflow: hidden; color: var(--sectile-content-secondary); font-size: 0.7rem; }
.chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.chart-legend i { width: 13px; height: 3px; border-radius: 1px; background: var(--bar-color); }
.is-series-0 { --bar-color: var(--sectile-feedback-info); }
.is-series-1 { --bar-color: var(--sectile-feedback-success); }
.is-series-2 { --bar-color: var(--sectile-feedback-warning); }
.benchmark-chart { border-top: 1px solid var(--sectile-border-subtle); }
.benchmark-row { display: grid; grid-template-columns: minmax(152px, 0.32fr) minmax(0, 1fr); gap: 16px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--sectile-border-subtle); }
.benchmark-row header { display: grid; min-width: 0; gap: 0; }
.benchmark-row header strong { overflow: hidden; font-size: 0.78rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.benchmark-row.is-sectile header strong { color: var(--sectile-action); }
.benchmark-row header small { min-width: 0; overflow: hidden; color: var(--sectile-content-tertiary); font-size: 0.64rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.result-content { min-width: 0; block-size: 42px; }
.bar-series { display: grid; min-width: 0; block-size: 42px; align-content: center; gap: 1px; }
.bar { display: grid; grid-template-columns: minmax(0, 1fr) 50px; align-items: center; gap: 7px; min-height: 6px; }
.bar::before { grid-area: 1 / 1; width: 100%; height: 3px; border-radius: 1px; background: color-mix(in srgb, var(--sectile-content-tertiary) 8%, transparent); content: ''; }
.bar i { grid-area: 1 / 1; z-index: 1; width: 100%; height: 3px; border-radius: 1px; background: var(--bar-color); transform-origin: left center; transition: transform 220ms cubic-bezier(0.645, 0.045, 0.355, 1); }
.bar span { color: var(--sectile-content-secondary); font-size: 0.65rem; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.result-message { display: grid; block-size: 42px; place-items: center; overflow: hidden; padding-inline: 10px; color: var(--sectile-content-primary); font-size: 0.8rem; font-weight: 720; line-height: 1.4; text-align: center; }
.result-message.is-failure { color: var(--sectile-feedback-critical); }
.benchmark-criteria { display: grid; gap: 10px; padding-top: 14px; }
.benchmark-criteria > strong { font-size: 0.76rem; line-height: 1.4; }
.benchmark-criteria dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 36px; margin: 0; }
.benchmark-criteria dl > div { display: grid; grid-template-columns: 68px minmax(0, 1fr); align-items: baseline; gap: 10px; min-width: 0; }
.benchmark-criteria dt { color: var(--sectile-content-tertiary); font-size: 0.66rem; font-weight: 700; line-height: 1.4; }
.benchmark-criteria dd { margin: 0; color: var(--sectile-content-primary); font-size: 0.74rem; font-weight: 560; line-height: 1.45; }
.is-placeholder { visibility: hidden; pointer-events: none; }

@media (max-width: 640px) {
  .benchmark-figure > figcaption { display: grid; gap: 2px; }
  .benchmark-row { grid-template-columns: minmax(0, 1fr); gap: 5px; padding: 9px 0; }
  .benchmark-row header { grid-template-columns: auto 1fr; align-items: baseline; gap: 7px; }
  .bar { grid-template-columns: minmax(0, 1fr) 46px; }
  .benchmark-criteria dl { grid-template-columns: minmax(0, 1fr); gap: 7px; }
}

@media (prefers-reduced-motion: reduce) {
  .bar i { transition: none; }
}
</style>
