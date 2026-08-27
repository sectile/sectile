<script setup lang="ts">
import { computed, ref } from 'vue';
import { MeterIndicator, MeterRoot, MeterTrack, MeterValueText } from '@sectile/vue/meter';
import { useDocsLocale } from '../locale.js';
import DemoCascadeList from './DemoCascadeList.vue';
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
  readonly initialRenderMs: number | null;
  readonly slowTailMs: readonly number[];
  readonly state: string | null;
  readonly notice: string | null;
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
  columnLabel: ['측정 항목', '높이 입력', '변경 위치'],
  scenario: { mount: '초기 렌더', scroll: '스크롤', insert: '삽입', move: '이동', remove: '삭제', resize: '높이 변경' } as Record<Scenario, string>,
  mode: { fixed: '고정 높이', estimated: '예상값 제공', automatic: '높이 생략' } as Record<BenchmarkHeightMode, string>,
  location: { start: '시작', middle: '중간', end: '끝' } as Record<BenchmarkLocation, string>,
  mountLegend: ['초기 렌더', null, null, null],
  scrollLegend: ['스크롤 중앙값', '느린 5% 경계', null, null],
  mutationLegend: ['안정화 중앙값', '느린 5% 경계', '복구 중앙값', '복구 느린 5% 경계'],
  tailLegend: 'p95 초과 표본',
  initialRenderLabel: '초기 렌더',
  unsupported: '이 조건은 높이 예상값 없이 시작할 수 없음',
  stableFailure: '정상 화면에 도달하지 못했습니다.',
  recoveredFailure: (recovered: number, total: number) => recovered === total
    ? `${total}번 모두 처리 중 화면 오류가 발생했지만 최종 화면은 정상으로 돌아왔습니다.`
    : `${total}번 중 ${recovered}번에서 화면 오류가 발생했지만 최종 화면은 정상으로 돌아왔습니다.`,
  permanentFailure: (failed: number, total: number) => failed === total
    ? `${total}번 모두 정상 화면에 도달하지 못했습니다.`
    : `${total}번 중 ${failed}번은 정상 화면에 도달하지 못했습니다.`,
  failureSummary: (failures: string) => `오류 유형은 ${failures}입니다.`,
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
      mutation: '같은 조건 50회',
    },
    completion: {
      mount: '전체 높이와 화면 배치가 모두 맞은 시점',
      scroll: '목표 행·전체 높이·화면 배치 좌표를 모두 읽은 시점',
      mutation: '순서·높이·전체 높이·기준 위치가 모두 맞은 첫 프레임',
    },
    environment: 'Chrome 151 · Apple Silicon · macOS',
  },
} : {
  title: 'Compare results under the same conditions',
  description: 'Change the scenario to compare all seven libraries in the same chart.',
  conditionLabel: 'Comparison conditions',
  columnLabel: ['Scenario', 'Height input', 'Mutation position'],
  scenario: { mount: 'Initial render', scroll: 'Scroll', insert: 'Insert', move: 'Move', remove: 'Remove', resize: 'Height change' } as Record<Scenario, string>,
  mode: { fixed: 'Fixed height', estimated: 'Estimate provided', automatic: 'Height omitted' } as Record<BenchmarkHeightMode, string>,
  location: { start: 'Start', middle: 'Middle', end: 'End' } as Record<BenchmarkLocation, string>,
  mountLegend: ['Initial render', null, null, null],
  scrollLegend: ['Scroll median', 'Slower 5% boundary', null, null],
  mutationLegend: ['Settle median', 'Slower 5% boundary', 'Recovery median', 'Recovery slower 5% boundary'],
  tailLegend: 'Samples above p95',
  initialRenderLabel: 'Initial render',
  unsupported: 'This condition cannot start without a height estimate',
  stableFailure: 'The screen did not reach a correct stable state.',
  recoveredFailure: (recovered: number, total: number) => recovered === total
    ? `All ${total} runs showed a visual error, but the final screen recovered.`
    : `${recovered} of ${total} runs showed a visual error, but the final screen recovered.`,
  permanentFailure: (failed: number, total: number) => failed === total
    ? `All ${total} runs failed to reach a correct screen.`
    : `${failed} of ${total} runs failed to reach a correct screen.`,
  failureSummary: (failures: string) => `The observed errors were ${failures}.`,
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
      mutation: '50 samples under the same condition',
    },
    completion: {
      mount: 'Correct total height and viewport geometry',
      scroll: 'Target row, total height, and viewport geometry have been read',
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
  return copy.value.mutationLegend;
});
const libraryMetadata = computed(() => baselineBenchmarkResults
  .filter((result) => result.mode === 'fixed')
  .map(({ library, version, stack }) => ({ library, version, stack })));

const chartResults = computed<readonly ChartResult[]>(() => libraryMetadata.value.map((metadata) => {
  if (isBaselineScenario(scenario.value)) return baselineResult(metadata);
  return mutationResult(metadata);
}));
const visibleLegendEntries = computed(() => [
  ...legendSlots.value.flatMap((label, index) => (
  label !== null && chartResults.value.some((result) => typeof result.values[index] === 'number')
    ? [{ label, index }]
    : []
  )),
  ...(chartResults.value.some((result) => displayedSlowTail(result).length > 0)
    ? [{ label: copy.value.tailLegend, index: 4 }]
    : []),
]);

const measurements = computed(() => chartResults.value
  .flatMap((result) => [...result.values, ...displayedSlowTail(result)])
  .filter((value): value is number => value !== null));
const outlierThreshold = computed(() => upperOutlierFence(measurements.value));
const libraryOutlierThreshold = computed(() => upperOutlierFence(chartResults.value
  .map(resultRepresentative)
  .filter((value): value is number => value !== null)));
const outlierLibraries = computed(() => new Set(chartResults.value
  .filter((result) => {
    const representative = resultRepresentative(result);
    return representative !== null && representative > libraryOutlierThreshold.value;
  })
  .map((result) => result.library)));
const maximum = computed(() => Math.max(
  1,
  ...chartResults.value.flatMap((result) => [...result.values, ...displayedSlowTail(result)]
    .filter((value): value is number => value !== null && !isOutlier(result, value))),
));
const semanticMaximum = computed(() => Math.max(1, ...measurements.value));
const initialRenderMeasurements = computed(() => chartResults.value
  .map((result) => result.initialRenderMs)
  .filter((value): value is number => value !== null));
const initialRenderOutlierThreshold = computed(() => upperOutlierFence(initialRenderMeasurements.value));
const initialRenderMaximum = computed(() => Math.max(
  1,
  ...initialRenderMeasurements.value.filter((value) => !isInitialRenderOutlier(value)),
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
  return { ...metadata, values, initialRenderMs: result.mountMs, slowTailMs: [], state: null, notice: null, failed: false };
}

function mutationResult(metadata: { readonly library: string; readonly version: string; readonly stack: string }): ChartResult {
  const result = mutationBenchmarkResults.find((entry) => entry.library === metadata.library
    && entry.sizeMode === mutationMode.value
    && entry.operation === scenario.value
    && entry.location === location.value);
  if (result === undefined) return unsupportedResult(metadata);
  const state = result.settledSamples === 0 ? failureLabel(result) : null;
  const notice = state === null && (result.recoveredSamples > 0 || result.failedSamples > 0)
    ? failureLabel(result)
    : null;
  return {
    ...metadata,
    values: [result.medianMs, result.p95Ms, result.recoveryMedianMs, result.recoveryP95Ms],
    initialRenderMs: null,
    slowTailMs: result.slowTailMs,
    state,
    notice,
    failed: result.failedSamples > 0,
  };
}

function unsupportedResult(metadata: { readonly library: string; readonly version: string; readonly stack: string }): ChartResult {
  return {
    ...metadata,
    values: [null, null, null, null],
    initialRenderMs: null,
    slowTailMs: [],
    state: copy.value.unsupported,
    notice: null,
    failed: false,
  };
}

function meterIndicatorStyle(result: ChartResult, value: number): Readonly<Record<'--benchmark-meter-ratio', string>> {
  if (isOutlier(result, value)) return { '--benchmark-meter-ratio': '1' };
  const ratio = logarithmic.value
    ? Math.log10(value + 1) / Math.log10(maximum.value + 1)
    : value / maximum.value;
  return { '--benchmark-meter-ratio': String(Math.max(0.018, ratio)) };
}

function initialRenderIndicatorStyle(value: number): Readonly<Record<'--initial-render-ratio', string>> {
  const ratio = isInitialRenderOutlier(value) ? 1 : value / initialRenderMaximum.value;
  return { '--initial-render-ratio': String(Math.max(0.025, ratio)) };
}

function isOutlier(result: ChartResult, value: number): boolean {
  return outlierLibraries.value.has(result.library) || value > outlierThreshold.value;
}

function isInitialRenderOutlier(value: number): boolean {
  return value > initialRenderOutlierThreshold.value;
}

function upperOutlierFence(values: readonly number[]): number {
  if (values.length < 4) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((left, right) => left - right);
  const lowerQuartile = percentile(sorted, 0.25);
  const upperQuartile = percentile(sorted, 0.75);
  return upperQuartile + (upperQuartile - lowerQuartile) * 3;
}

function resultRepresentative(result: ChartResult): number | null {
  const values = result.values
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  return values.length === 0 ? null : percentile(values, 0.5);
}

function displayedSlowTail(result: ChartResult): readonly number[] {
  return result.notice === null ? result.slowTailMs : [];
}

function slowTailSlots(result: ChartResult): readonly (number | null)[] {
  const values = displayedSlowTail(result);
  return [values[0] ?? null, values[1] ?? null, values[2] ?? null];
}

function percentile(sorted: readonly number[], ratio: number): number {
  const position = (sorted.length - 1) * ratio;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sorted[lowerIndex] ?? 0;
  const upper = sorted[upperIndex] ?? lower;
  return lower + (upper - lower) * (position - lowerIndex);
}

function formatTime(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} ms`;
}

function formatInitialRenderTime(value: number): string {
  if (value < 1000) return formatTime(value);
  const seconds = (value / 1000).toFixed(2);
  return `${seconds} s`;
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
  const states = [];
  const failures = result.failureCodes.map((code) => copy.value.failureCode[code] ?? code).join(', ');
  if (result.recoveredSamples > 0) states.push(copy.value.recoveredFailure(result.recoveredSamples, result.totalSamples));
  if (result.failedSamples > 0) states.push(copy.value.permanentFailure(result.failedSamples, result.totalSamples));
  else if (result.settledSamples === 0) states.push(copy.value.stableFailure);
  if (failures.length > 0) states.push(copy.value.failureSummary(failures));
  return states.join('\n');
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
      <DemoCascadeList
        v-model="cascadeValue"
        :nodes="cascadeNodes"
        :text-value="nodeLabel"
        :label="copy.conditionLabel"
        :column-labels="copy.columnLabel"
        :column-count="3"
        :show-value="false"
      />
    </div>

    <figure class="benchmark-figure" aria-labelledby="selected-benchmark-title">
      <figcaption>
        <strong id="selected-benchmark-title" aria-live="polite" :title="selectedDescription">{{ selectedDescription }}</strong>
        <span>{{ copy.scale(maximum, logarithmic) }}</span>
      </figcaption>

      <div class="chart-legend" aria-label="Legend">
        <span v-for="entry in visibleLegendEntries" :key="entry.index" :class="`is-series-${entry.index}`"><i />{{ entry.label }}</span>
      </div>

      <div class="benchmark-chart">
        <div v-for="result in chartResults" :key="result.library" class="benchmark-row" :class="{ 'is-sectile': result.library === 'Sectile Virtual' }">
          <header>
            <strong>{{ result.library }}</strong>
            <small>v{{ result.version }} · {{ result.stack }}</small>
            <div
              class="initial-render-time"
              :class="{
                'is-placeholder': scenario !== 'scroll' || result.initialRenderMs === null,
                'is-outlier': result.initialRenderMs !== null && isInitialRenderOutlier(result.initialRenderMs),
              }"
              :aria-hidden="scenario !== 'scroll' || result.initialRenderMs === null"
            >
              <span>{{ copy.initialRenderLabel }}</span>
              <span class="initial-render-track" aria-hidden="true">
                <span
                  v-if="result.initialRenderMs !== null"
                  class="initial-render-indicator"
                  :style="initialRenderIndicatorStyle(result.initialRenderMs)"
                />
              </span>
              <data
                :value="result.initialRenderMs ?? undefined"
                :title="result.initialRenderMs === null ? undefined : formatTime(result.initialRenderMs)"
              >{{ result.initialRenderMs === null ? '—' : formatInitialRenderTime(result.initialRenderMs) }}</data>
            </div>
          </header>
          <div class="result-content" :class="{ 'has-notice': result.notice !== null }">
            <div v-if="result.state !== null" class="result-message" :class="{ 'is-failure': result.failed }" :title="result.state">{{ result.state }}</div>
            <template v-else>
              <div class="bar-series">
                <template v-for="(value, index) in result.values" :key="index">
                  <MeterRoot
                    v-if="value !== null"
                    :value="value"
                    :max="semanticMaximum"
                    :label="`${result.library} · ${legendSlots[index]}`"
                    :format-value="() => formatTime(value)"
                    class="benchmark-meter"
                    :class="[`is-series-${index}`, { 'is-placeholder': legendSlots[index] === null, 'is-outlier': isOutlier(result, value) }]"
                    :aria-hidden="legendSlots[index] === null"
                  >
                    <MeterTrack class="benchmark-meter-track">
                      <MeterIndicator class="benchmark-meter-indicator" :style="meterIndicatorStyle(result, value)" />
                    </MeterTrack>
                    <MeterValueText class="benchmark-meter-value" />
                  </MeterRoot>
                  <div
                    v-else
                    class="benchmark-meter benchmark-meter-empty"
                    :class="[`is-series-${index}`, { 'is-placeholder': legendSlots[index] === null }]"
                    :aria-label="legendSlots[index] === null ? undefined : `${legendSlots[index]}: ${formatTime(value)}`"
                    :aria-hidden="legendSlots[index] === null"
                  >
                    <span class="benchmark-meter-track" />
                    <span class="benchmark-meter-value">{{ formatTime(value) }}</span>
                  </div>
                </template>
                <template v-if="result.notice === null">
                  <template v-for="(value, index) in slowTailSlots(result)" :key="`tail-${index}`">
                    <MeterRoot
                      v-if="value !== null"
                      :value="value"
                      :max="semanticMaximum"
                      :label="`${result.library} · ${copy.tailLegend} ${index + 1}`"
                      :format-value="() => formatTime(value)"
                      class="benchmark-meter is-series-4"
                      :class="{ 'is-outlier': isOutlier(result, value) }"
                    >
                      <MeterTrack class="benchmark-meter-track">
                        <MeterIndicator class="benchmark-meter-indicator" :style="meterIndicatorStyle(result, value)" />
                      </MeterTrack>
                      <MeterValueText class="benchmark-meter-value" />
                    </MeterRoot>
                    <div v-else class="benchmark-meter benchmark-meter-empty is-series-4" aria-hidden="true">
                      <span class="benchmark-meter-track" />
                      <span class="benchmark-meter-value">—</span>
                    </div>
                  </template>
                </template>
              </div>
              <div
                v-if="result.notice !== null"
                class="result-notice"
                :class="{
                  'is-failure': result.failed,
                }"
                :title="result.notice"
              >{{ result.notice }}</div>
            </template>
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
.is-series-3 { --bar-color: var(--sectile-feedback-critical); }
.is-series-4 { --bar-color: var(--sectile-content-secondary); }
.benchmark-chart { border-top: 1px solid var(--sectile-border-subtle); }
.benchmark-row { display: grid; grid-template-columns: minmax(152px, 0.32fr) minmax(0, 1fr); gap: 16px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--sectile-border-subtle); }
.benchmark-row header { display: grid; min-width: 0; gap: 0; }
.benchmark-row header strong { overflow: hidden; font-size: 0.78rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.benchmark-row.is-sectile header strong { color: var(--sectile-action); }
.benchmark-row header small { min-width: 0; overflow: hidden; color: var(--sectile-content-tertiary); font-size: 0.64rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.benchmark-row header .initial-render-time { display: grid; grid-template-columns: auto minmax(24px, 1fr) 52px; align-items: center; gap: 5px; min-width: 0; min-height: 11px; margin-top: 2px; color: var(--sectile-content-secondary); font-size: 0.62rem; line-height: 1; }
.initial-render-time span { color: var(--sectile-content-tertiary); }
.initial-render-time data { overflow: hidden; color: var(--sectile-content-primary); font-size: 0.64rem; font-variant-numeric: tabular-nums; font-weight: 650; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.initial-render-time .initial-render-track { height: 2px; overflow: hidden; background: color-mix(in srgb, var(--sectile-content-tertiary) 10%, transparent); }
.initial-render-time .initial-render-indicator { display: block; width: 100%; height: 100%; background: var(--sectile-content-secondary); transform: scaleX(var(--initial-render-ratio)); transform-origin: left center; }
.initial-render-time.is-outlier data { color: var(--sectile-feedback-critical); }
.result-content { display: grid; min-width: 0; block-size: 72px; grid-template-rows: 72px; }
.result-content.has-notice { grid-template-rows: 42px 30px; }
.bar-series { display: grid; min-width: 0; grid-template-rows: repeat(7, 9px); align-content: center; gap: 1px; }
.result-content.has-notice .bar-series { grid-template-rows: repeat(4, 9px); }
.benchmark-meter { display: grid; grid-template-columns: minmax(0, 1fr) 50px; block-size: 9px; align-items: center; gap: 7px; min-height: 0; }
.benchmark-meter-track { display: block; height: 3px; overflow: hidden; border-radius: 1px; background: color-mix(in srgb, var(--sectile-content-tertiary) 8%, transparent); }
.benchmark-meter-indicator { display: block; width: 100%; height: 100%; border-radius: inherit; background: var(--bar-color); transform: scaleX(var(--benchmark-meter-ratio)); transform-origin: left center; transition: transform 220ms cubic-bezier(0.645, 0.045, 0.355, 1); }
.benchmark-meter.is-outlier .benchmark-meter-value { color: var(--sectile-feedback-critical); font-weight: 700; }
.benchmark-meter-value { color: var(--sectile-content-secondary); font-size: 0.65rem; font-variant-numeric: tabular-nums; line-height: 9px; text-align: right; white-space: nowrap; }
.benchmark-meter-empty { visibility: hidden; }
.result-message { display: grid; grid-row: 1 / -1; place-items: center; overflow: hidden; padding-inline: 10px; color: var(--sectile-content-primary); font-size: 0.8rem; font-weight: 720; line-height: 1.45; text-align: center; white-space: pre-line; }
.result-message.is-failure { color: var(--sectile-feedback-critical); }
.result-notice { display: -webkit-box; align-self: center; overflow: hidden; padding-top: 5px; color: var(--sectile-feedback-warning); font-size: 0.66rem; font-weight: 680; line-height: 1.4; text-align: left; white-space: pre-line; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.result-notice.is-failure { color: var(--sectile-feedback-critical); }
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
  .benchmark-row header .initial-render-time { grid-column: 1 / -1; margin-top: -3px; }
  .benchmark-meter { grid-template-columns: minmax(0, 1fr) 46px; }
  .benchmark-criteria dl { grid-template-columns: minmax(0, 1fr); gap: 7px; }
}

@media (prefers-reduced-motion: reduce) {
  .benchmark-meter-indicator { transition: none; }
}
</style>
