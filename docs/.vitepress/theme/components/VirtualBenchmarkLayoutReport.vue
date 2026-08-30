<script setup lang="ts">
import { computed, ref } from 'vue';
import { MeterIndicator, MeterRoot, MeterTrack, MeterValueText } from '@sectile/vue/meter';
import { useDocsLocale } from '../locale.js';
import type {
  BenchmarkLocation,
  BenchmarkOperation,
  LayoutBaselineBenchmarkFailure,
  LayoutBaselineBenchmarkResult,
  LayoutBenchmarkMode,
  LayoutMutationBenchmarkResult,
} from '../virtual-benchmark-data.js';
import DemoCascadeList from './DemoCascadeList.vue';

type LayoutScenario = 'mount' | 'scroll' | BenchmarkOperation;
type ChartResult = {
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly values: readonly (number | null)[];
  readonly state: string | null;
  readonly notice: string | null;
  readonly failed: boolean;
  readonly evidence: string | null;
};

const props = withDefaults(defineProps<{
  readonly baselineResults?: readonly LayoutBaselineBenchmarkResult[];
  readonly baselineFailures?: readonly LayoutBaselineBenchmarkFailure[];
  readonly mutationResults?: readonly LayoutMutationBenchmarkResult[];
}>(), {
  baselineResults: () => [],
  baselineFailures: () => [],
  mutationResults: () => [],
});

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  condition: '비교 조건',
  columns: ['측정 항목', '입력 방식', '변경 위치'],
  scenario: {
    mount: '초기 렌더', scroll: '스크롤', insert: '삽입', move: '이동', remove: '삭제', resize: '크기 변경',
  } as Record<LayoutScenario, string>,
  mode: { fixed: '고정', estimated: '예상값 제공', automatic: '자동 측정', positioned: '좌표 지정' } as Record<LayoutBenchmarkMode, string>,
  location: { start: '시작', middle: '중간', end: '끝' } as Record<BenchmarkLocation, string>,
  legend: {
    mount: ['설정', '첫 항목', '안정 레이아웃'],
    scroll: ['스크롤 중앙값', '느린 5% 경계', null],
    mutation: ['안정화 중앙값', '느린 5% 경계', null],
  } as const,
  scale: (maximum: number, logarithmic: boolean) => logarithmic ? `최대 ${maximum.toFixed(0)} ms · 로그 눈금` : `최대 ${maximum.toFixed(0)} ms`,
  rounds: (count: number) => `${count}라운드`,
  samples: (actual: number, planned: number) => `표본 ${actual}/${planned}`,
  unsupported: '이 조건을 지원하지 않거나 측정값이 없습니다.',
  failure: '초기 렌더 오류',
  failedSamples: (failed: number) => `${failed}개 표본 실패`,
  stopped: '조기 종료',
  raw: '원본 측정값 보기',
  baseline: '초기 렌더와 스크롤', mutation: '레이아웃 변경', library: '라이브러리', inputMode: '입력 방식',
  setup: '설정', first: '첫 항목', stable: '안정 레이아웃', median: '스크롤 중앙값', p95: '스크롤 p95',
  sampleCount: '표본', operation: '작업', locationLabel: '위치', failed: '실패',
} : {
  condition: 'Comparison conditions',
  columns: ['Measurement', 'Input mode', 'Mutation position'],
  scenario: {
    mount: 'Initial render', scroll: 'Scroll', insert: 'Insert', move: 'Move', remove: 'Remove', resize: 'Resize',
  } as Record<LayoutScenario, string>,
  mode: { fixed: 'Fixed', estimated: 'Estimate provided', automatic: 'Automatic measurement', positioned: 'Positioned' } as Record<LayoutBenchmarkMode, string>,
  location: { start: 'Start', middle: 'Middle', end: 'End' } as Record<BenchmarkLocation, string>,
  legend: {
    mount: ['Setup', 'First items', 'Stable layout'],
    scroll: ['Scroll median', 'Slower 5% boundary', null],
    mutation: ['Settle median', 'Slower 5% boundary', null],
  } as const,
  scale: (maximum: number, logarithmic: boolean) => logarithmic ? `Max ${maximum.toFixed(0)} ms · logarithmic scale` : `Max ${maximum.toFixed(0)} ms`,
  rounds: (count: number) => `${count} rounds`,
  samples: (actual: number, planned: number) => `n=${actual}/${planned}`,
  unsupported: 'This condition is unsupported or has no measurement.',
  failure: 'Initial-render failure',
  failedSamples: (failed: number) => `${failed} failed samples`,
  stopped: 'Stopped early',
  raw: 'View raw measurements',
  baseline: 'Initial render and scrolling', mutation: 'Layout mutations', library: 'Library', inputMode: 'Input mode',
  setup: 'Setup', first: 'First items', stable: 'Stable layout', median: 'Scroll median', p95: 'Scroll p95',
  sampleCount: 'Samples', operation: 'Operation', locationLabel: 'Location', failed: 'Failed',
});

const scenarios = computed<readonly LayoutScenario[]>(() => {
  const available = new Set<LayoutScenario>();
  if (props.baselineResults.length > 0 || props.baselineFailures.length > 0) {
    available.add('mount');
    available.add('scroll');
  }
  for (const result of props.mutationResults) available.add(result.operation);
  return ['mount', 'scroll', 'insert', 'move', 'remove', 'resize']
    .filter((value): value is LayoutScenario => available.has(value as LayoutScenario));
});

const cascadeNodes = computed(() => {
  const nodes = new Map<string, { readonly id: string; readonly parentID: string | null }>();
  for (const item of scenarios.value) nodes.set(`scenario:${item}`, { id: `scenario:${item}`, parentID: null });
  for (const result of [...props.baselineResults, ...props.baselineFailures]) {
    for (const item of ['mount', 'scroll'] as const) {
      nodes.set(`${item}:${result.mode}`, { id: `${item}:${result.mode}`, parentID: `scenario:${item}` });
    }
  }
  for (const result of props.mutationResults) {
    const modeID = `${result.operation}:${result.mode}`;
    nodes.set(modeID, { id: modeID, parentID: `scenario:${result.operation}` });
    const locationID = `${modeID}:${result.location}`;
    nodes.set(locationID, { id: locationID, parentID: modeID });
  }
  return [...nodes.values()];
});

const defaultSelection = computed(() => {
  const baseline = props.baselineResults[0] ?? props.baselineFailures[0];
  if (baseline !== undefined) return `mount:${baseline.mode}`;
  const mutation = props.mutationResults[0];
  return mutation === undefined ? null : `${mutation.operation}:${mutation.mode}:${mutation.location}`;
});
const cascadeValue = ref<string | null>(defaultSelection.value);
const selectionParts = computed(() => (cascadeValue.value ?? defaultSelection.value ?? 'mount:fixed').split(':'));
const scenario = computed<LayoutScenario>(() => (selectionParts.value[0] ?? 'mount') as LayoutScenario);
const mode = computed<LayoutBenchmarkMode>(() => (selectionParts.value[1] ?? 'fixed') as LayoutBenchmarkMode);
const location = computed<BenchmarkLocation>(() => (selectionParts.value[2] ?? 'start') as BenchmarkLocation);
const isMutation = computed(() => scenario.value !== 'mount' && scenario.value !== 'scroll');
const logarithmic = computed(() => isMutation.value);
const legendSlots = computed<readonly (string | null)[]>(() => {
  if (scenario.value === 'mount') return copy.value.legend.mount;
  if (scenario.value === 'scroll') return copy.value.legend.scroll;
  return copy.value.legend.mutation;
});
const libraryMetadata = computed(() => {
  const seen = new Set<string>();
  return [...props.baselineResults, ...props.baselineFailures, ...props.mutationResults].flatMap(({ library, version, stack }) => {
    if (seen.has(library)) return [];
    seen.add(library);
    return [{ library, version, stack }];
  });
});
const chartResults = computed<readonly ChartResult[]>(() => libraryMetadata.value.map((metadata) => resultFor(metadata)));
const measurements = computed(() => chartResults.value.flatMap((result) => result.values)
  .filter((value): value is number => value !== null));
const maximum = computed(() => Math.max(1, ...measurements.value));
const selectedDescription = computed(() => [
  copy.value.scenario[scenario.value],
  copy.value.mode[mode.value],
  ...(isMutation.value ? [copy.value.location[location.value]] : []),
].join(' · '));

function resultFor(metadata: { readonly library: string; readonly version: string; readonly stack: string }): ChartResult {
  if (!isMutation.value) {
    const result = props.baselineResults.find((entry) => entry.library === metadata.library && entry.mode === mode.value);
    if (result !== undefined) return {
      ...metadata,
      values: scenario.value === 'mount'
        ? [result.setupMs, result.firstItemsMs, result.stableLayoutMs]
        : [result.scrollMedianMs, result.scrollP95Ms, null],
      state: null,
      notice: null,
      failed: false,
      evidence: scenario.value === 'mount'
        ? copy.value.rounds(result.completedRounds)
        : copy.value.samples(result.scrollSampleCount, result.scrollSampleCount),
    };
    const failure = props.baselineFailures.find((entry) => entry.library === metadata.library && entry.mode === mode.value);
    return {
      ...metadata,
      values: [null, null, null],
      state: failure === undefined ? copy.value.unsupported : `${copy.value.failure} · ${failure.message}`,
      notice: null,
      failed: failure !== undefined,
      evidence: null,
    };
  }
  const result = props.mutationResults.find((entry) => entry.library === metadata.library
    && entry.mode === mode.value
    && entry.operation === scenario.value
    && entry.location === location.value);
  if (result === undefined) return {
    ...metadata, values: [null, null, null], state: copy.value.unsupported, notice: null, failed: false, evidence: null,
  };
  const notices = [
    result.failedSamples > 0 ? copy.value.failedSamples(result.failedSamples) : null,
    result.earlyStopped ? copy.value.stopped : null,
  ].filter((value): value is string => value !== null);
  return {
    ...metadata,
    values: [result.medianMs, result.p95Ms, null],
    state: result.samples === 0 ? notices.join(' · ') || copy.value.unsupported : null,
    notice: result.samples > 0 && notices.length > 0 ? notices.join(' · ') : null,
    failed: result.failedSamples > 0,
    evidence: copy.value.samples(result.samples, result.plannedSamples),
  };
}

function meterStyle(value: number): Readonly<Record<'--layout-meter-ratio', string>> {
  const ratio = logarithmic.value ? Math.log10(value + 1) / Math.log10(maximum.value + 1) : value / maximum.value;
  return { '--layout-meter-ratio': String(Math.max(0.018, ratio)) };
}

function nodeLabel(id: string): string {
  const parts = id.split(':');
  if (parts[0] === 'scenario') return copy.value.scenario[(parts[1] ?? 'mount') as LayoutScenario];
  if (parts.length === 2) return copy.value.mode[(parts[1] ?? 'fixed') as LayoutBenchmarkMode];
  return copy.value.location[(parts[2] ?? 'start') as BenchmarkLocation];
}

function milliseconds(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString(isKorean.value ? 'ko-KR' : 'en-US', { maximumFractionDigits: 3 })} ms`;
}
</script>

<template>
  <div class="layout-report">
    <div class="ds-field layout-report__condition">
      <span>{{ copy.condition }}</span>
      <DemoCascadeList
        v-model="cascadeValue"
        :nodes="cascadeNodes"
        :text-value="nodeLabel"
        :label="copy.condition"
        :column-labels="copy.columns"
        :column-count="3"
        :show-value="false"
      />
    </div>

    <figure class="layout-report__figure" aria-labelledby="layout-report-selection">
      <figcaption>
        <strong id="layout-report-selection" aria-live="polite">{{ selectedDescription }}</strong>
        <span>{{ copy.scale(maximum, logarithmic) }}</span>
      </figcaption>
      <div class="layout-report__legend" aria-label="Legend">
        <span v-for="(label, index) in legendSlots" v-show="label !== null" :key="index" :class="`is-series-${index}`"><i />{{ label }}</span>
      </div>
      <div class="layout-report__chart">
        <div v-for="result in chartResults" :key="result.library" class="layout-report__row" :class="{ 'is-sectile': result.library === 'Sectile Virtual' }">
          <header>
            <strong>{{ result.library }}</strong>
            <small>v{{ result.version }} · {{ result.stack }}</small>
            <small :class="{ 'is-placeholder': result.evidence === null }">{{ result.evidence ?? '—' }}</small>
          </header>
          <div class="layout-report__values" :class="{ 'has-notice': result.notice !== null }">
            <p v-if="result.state !== null" class="layout-report__state" :class="{ 'is-failure': result.failed }">{{ result.state }}</p>
            <template v-else>
              <div class="layout-report__bars">
                <template v-for="(value, index) in result.values" :key="index">
                  <MeterRoot
                    v-if="value !== null"
                    :value="value"
                    :max="maximum"
                    :label="`${result.library} · ${legendSlots[index]}`"
                    :format-value="() => milliseconds(value)"
                    class="layout-report__meter"
                    :class="`is-series-${index}`"
                    :aria-hidden="legendSlots[index] === null"
                  >
                    <MeterTrack class="layout-report__track">
                      <MeterIndicator class="layout-report__indicator" :style="meterStyle(value)" />
                    </MeterTrack>
                    <MeterValueText class="layout-report__value" />
                  </MeterRoot>
                  <div v-else class="layout-report__meter is-placeholder" aria-hidden="true" />
                </template>
              </div>
              <p v-if="result.notice !== null" class="layout-report__notice" :class="{ 'is-failure': result.failed }">{{ result.notice }}</p>
            </template>
          </div>
        </div>
      </div>
    </figure>

    <details class="layout-report__raw">
      <summary>{{ copy.raw }}</summary>
      <section>
        <h3>{{ copy.baseline }}</h3>
        <div class="layout-report__table">
          <table>
            <thead><tr><th>{{ copy.library }}</th><th>{{ copy.inputMode }}</th><th>{{ copy.setup }}</th><th>{{ copy.first }}</th><th>{{ copy.stable }}</th><th>{{ copy.median }}</th><th>{{ copy.p95 }}</th><th>{{ copy.sampleCount }}</th></tr></thead>
            <tbody>
              <tr v-for="result in props.baselineResults" :key="`${result.library}:${result.mode}`"><th scope="row">{{ result.library }}</th><td>{{ result.mode }}</td><td>{{ milliseconds(result.setupMs) }}</td><td>{{ milliseconds(result.firstItemsMs) }}</td><td>{{ milliseconds(result.stableLayoutMs) }}</td><td>{{ milliseconds(result.scrollMedianMs) }}</td><td>{{ milliseconds(result.scrollP95Ms) }}</td><td>{{ result.scrollSampleCount }}</td></tr>
              <tr v-for="failure in props.baselineFailures" :key="`failure:${failure.library}:${failure.mode}`" class="is-failure"><th scope="row">{{ failure.library }}</th><td>{{ failure.mode }}</td><td colspan="6"><strong>{{ copy.failure }}</strong> · {{ failure.message }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section v-if="props.mutationResults.length > 0">
        <h3>{{ copy.mutation }}</h3>
        <div class="layout-report__table">
          <table>
            <thead><tr><th>{{ copy.library }}</th><th>{{ copy.inputMode }}</th><th>{{ copy.operation }}</th><th>{{ copy.locationLabel }}</th><th>{{ copy.median }}</th><th>p95</th><th>{{ copy.sampleCount }}</th><th>{{ copy.failed }}</th></tr></thead>
            <tbody><tr v-for="result in props.mutationResults" :key="`${result.library}:${result.mode}:${result.operation}:${result.location}`"><th scope="row">{{ result.library }}</th><td>{{ result.mode }}</td><td>{{ result.operation }}</td><td>{{ result.location }}</td><td>{{ milliseconds(result.medianMs) }}</td><td>{{ milliseconds(result.p95Ms) }}</td><td>{{ result.samples }}</td><td :class="{ 'is-critical': result.failedSamples > 0 }">{{ result.failedSamples }}</td></tr></tbody>
          </table>
        </div>
      </section>
    </details>
  </div>
</template>

<style scoped>
.layout-report { display: grid; min-width: 0; gap: 18px; color: var(--sectile-content-primary); }
.layout-report__condition { position: relative; padding: 14px 0; border-block: 1px solid var(--sectile-border-subtle); }
.layout-report__figure { min-width: 0; margin: 0; }
.layout-report__figure > figcaption { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.layout-report__figure > figcaption strong { min-width: 0; overflow: hidden; font-size: .84rem; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.layout-report__figure > figcaption span { color: var(--sectile-content-tertiary); font-size: .68rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.layout-report__legend { display: flex; gap: 6px 14px; min-height: 1.35em; margin-bottom: 8px; color: var(--sectile-content-secondary); font-size: .7rem; }
.layout-report__legend span { display: inline-flex; align-items: center; gap: 5px; }
.layout-report__legend i { width: 13px; height: 3px; border-radius: 1px; background: var(--bar-color); }
.is-series-0 { --bar-color: var(--sectile-feedback-info); }
.is-series-1 { --bar-color: var(--sectile-feedback-success); }
.is-series-2 { --bar-color: var(--sectile-feedback-warning); }
.layout-report__chart { border-top: 1px solid var(--sectile-border-subtle); }
.layout-report__row { display: grid; grid-template-columns: minmax(152px, .32fr) minmax(0, 1fr); align-items: center; gap: 16px; padding: 9px 0; border-bottom: 1px solid var(--sectile-border-subtle); }
.layout-report__row header { display: grid; min-width: 0; align-content: center; }
.layout-report__row header strong { overflow: hidden; font-size: .78rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.layout-report__row.is-sectile header strong { color: var(--sectile-action); }
.layout-report__row header small { overflow: hidden; color: var(--sectile-content-tertiary); font-size: .64rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.layout-report__values { display: grid; min-width: 0; min-height: 48px; align-content: center; }
.layout-report__values.has-notice { grid-template-rows: minmax(30px, auto) auto; }
.layout-report__bars { display: grid; min-width: 0; grid-template-rows: repeat(3, 12px); align-content: center; gap: 2px; }
.layout-report__meter { display: grid; min-width: 0; grid-template-columns: minmax(0, 1fr) 58px; align-items: center; gap: 7px; }
.layout-report__track { display: block; height: 3px; overflow: hidden; border-radius: 1px; background: color-mix(in srgb, var(--sectile-content-tertiary) 8%, transparent); }
.layout-report__indicator { display: block; width: 100%; height: 100%; border-radius: inherit; background: var(--bar-color); transform: scaleX(var(--layout-meter-ratio)); transform-origin: left center; }
.layout-report__value { color: var(--sectile-content-secondary); font-size: .65rem; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.layout-report__state { display: grid; min-height: 48px; place-items: center; margin: 0; color: var(--sectile-content-secondary); font-size: .72rem; font-weight: 680; text-align: center; }
.layout-report__notice { margin: 3px 0 0; color: var(--sectile-feedback-warning); font-size: .66rem; font-weight: 680; }
.layout-report__state.is-failure, .layout-report__notice.is-failure, .is-failure td, .is-critical { color: var(--sectile-feedback-critical); }
.layout-report__raw { border-top: 1px solid var(--sectile-border-subtle); }
.layout-report__raw summary { padding: 12px 0; color: var(--sectile-content-secondary); cursor: pointer; font-size: .74rem; font-weight: 700; }
.layout-report__raw section { margin-top: 10px; }
.layout-report__raw h3 { margin: 0 0 .65rem; font-size: .82rem; }
.layout-report__table { overflow-x: auto; border: 1px solid var(--sectile-border-subtle); border-radius: .75rem; }
table { width: 100%; min-width: 58rem; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th, td { padding: .7rem .8rem; border-bottom: 1px solid var(--sectile-border-subtle); text-align: right; white-space: nowrap; }
thead th { background: var(--sectile-surface-subtle); color: var(--sectile-content-secondary); font-size: .75rem; }
tbody th { text-align: left; }
tbody tr:last-child > * { border-bottom: 0; }
.is-placeholder { visibility: hidden; pointer-events: none; }

@media (max-width: 640px) {
  .layout-report__figure > figcaption { display: grid; gap: 2px; }
  .layout-report__row { grid-template-columns: minmax(0, 1fr); gap: 5px; }
  .layout-report__meter { grid-template-columns: minmax(0, 1fr) 52px; }
}
</style>
