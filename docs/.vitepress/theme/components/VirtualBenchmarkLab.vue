<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowLeft, Check, Copy, Download, Gauge, Languages, Pencil, Plus, RotateCcw, Trash2, Upload, X } from '@lucide/vue';
import { withBase } from 'vitepress';
import { useDocsLocale } from '../locale.js';
import { summarizeVirtualBenchmarkPlan } from '../virtual-benchmark-plan.js';
import type {
  BaselineBenchmarkFailure,
  BaselineBenchmarkResult,
  BenchmarkHeightMode,
  BenchmarkLocation,
  BenchmarkOperation,
  BenchmarkRowProfile,
  BenchmarkRowProfileConditions,
  MutationBenchmarkResult,
} from '../virtual-benchmark-data.js';
import DemoPopover from './DemoPopover.vue';
import DemoProgress from './DemoProgress.vue';
import type { DemoSelectOption } from './DemoSelect.vue';
import DemoVirtualList from './DemoVirtualList.vue';
import DocsButton from './DocsButton.vue';
import VirtualBenchmarkReport from './VirtualBenchmarkReport.vue';
import VirtualBenchmarkTargetFields from './VirtualBenchmarkTargetFields.vue';

type LabStatus = 'idle' | 'running' | 'complete' | 'cancelled' | 'error';
type Preset = 'quick' | 'standard' | 'custom';
type ProfileSelection = BenchmarkRowProfile | 'all';
type PhaseSelection = 'both' | 'baseline' | 'mutations';
type LibrarySelection = string | 'all';
type HeightModeSelection = BenchmarkHeightMode | 'all';
type MutationModeSelection = Exclude<BenchmarkHeightMode, 'fixed'> | 'all';
type OperationSelection = BenchmarkOperation | 'all';
type LocationSelection = BenchmarkLocation | 'all';

interface BenchmarkTarget {
  readonly id: number;
  readonly preset: Preset;
  readonly profile: ProfileSelection;
  readonly phase: PhaseSelection;
  readonly library: LibrarySelection;
  readonly baselineMode: HeightModeSelection;
  readonly mutationMode: MutationModeSelection;
  readonly operation: OperationSelection;
  readonly location: LocationSelection;
  readonly rows: number;
  readonly baselineRounds: number;
  readonly warmupScrolls: number;
  readonly scrollSamples: number;
  readonly mutationRounds: number;
  readonly mutationSamples: number;
}

interface RunShard {
  readonly target: BenchmarkTarget;
  readonly profile: BenchmarkRowProfile;
}

interface BenchmarkResultGroup {
  readonly target: BenchmarkTarget | null;
  readonly baselineResults: readonly BaselineBenchmarkResult[];
  readonly baselineFailures: readonly BaselineBenchmarkFailure[];
  readonly mutationResults: readonly MutationBenchmarkResult[];
  readonly rowProfileConditions: Readonly<Partial<Record<BenchmarkRowProfile, BenchmarkRowProfileConditions>>>;
}

interface RawBenchmarkReport {
  readonly benchmark: string;
  readonly protocolVersion: number;
  readonly environment: string;
  readonly source: Readonly<Record<string, unknown>>;
  readonly runs: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly conditions: {
    readonly itemCount: number;
    readonly rowProfile?: BenchmarkRowProfile;
    readonly rowProfiles?: Readonly<Partial<Record<BenchmarkRowProfile, BenchmarkRowProfileConditions>>>;
    readonly commonEstimateHeight?: number;
    readonly contentCorpusVersion?: number;
    readonly contentVariants?: number;
    readonly heightDistribution?: BenchmarkRowProfileConditions['heightDistribution'];
    readonly baseline?: Readonly<Record<string, unknown>>;
    readonly mutations?: Readonly<Record<string, unknown>>;
  };
  readonly baselineResults?: readonly (BaselineBenchmarkResult & Readonly<Record<string, unknown>>)[];
  readonly baselineFailures?: readonly RawBaselineFailure[];
  readonly baselineSamples?: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>;
  readonly mutationResults?: readonly RawMutationResult[];
  readonly heightModeSupport?: readonly Readonly<Record<string, unknown>>[];
}

interface RawBaselineFailure {
  readonly runIds?: readonly string[];
  readonly rowProfile: BenchmarkRowProfile;
  readonly mode: BenchmarkHeightMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly message: string;
}

interface RawMutationResult extends Omit<MutationBenchmarkResult, 'slowTailMs' | 'failureCodes'> {
  readonly failures?: readonly { readonly code: string }[];
  readonly samples?: readonly { readonly elapsedMs: number | null }[];
}

interface RunnerMessage {
  readonly channel: 'sectile-virtual-benchmark';
  readonly type: 'progress' | 'checkpoint' | 'complete' | 'error';
  readonly phase?: string;
  readonly message?: string;
  readonly completed?: number;
  readonly total?: number;
  readonly baselineResult?: BaselineBenchmarkResult;
  readonly baselineFailure?: RawBaselineFailure;
  readonly mutationResult?: RawMutationResult;
  readonly report?: RawBenchmarkReport;
  readonly run?: Readonly<Record<string, unknown>>;
  readonly baselineSampleKey?: string;
  readonly baselineSamples?: readonly Readonly<Record<string, unknown>>[];
}

interface BenchmarkCheckpoint {
  readonly id: number;
  readonly targetPosition: number;
  readonly phase: 'baseline' | 'mutations';
  readonly completed: number;
  readonly total: number;
  readonly profile: BenchmarkRowProfile;
  readonly library?: string;
  readonly mode?: BenchmarkHeightMode;
  readonly operation?: BenchmarkOperation;
  readonly location?: BenchmarkLocation;
  readonly samples: number;
  readonly medianMs: number | null;
  readonly p95Ms: number | null;
  readonly outcome: 'round' | 'complete' | 'failed';
}

interface DemoVirtualListHandle {
  isAtEnd(threshold?: number): boolean;
  scrollTo(id: string, alignment?: 'start' | 'center' | 'end' | 'nearest'): unknown;
}

interface BenchmarkLibraryTotals {
  readonly library: string;
  readonly baseline: number;
  readonly mutations: number;
  readonly samples: number;
  readonly failures: number;
}

interface RawBenchmarkPartialResults {
  readonly baselineResults?: readonly BaselineBenchmarkResult[];
  readonly baselineFailures?: readonly BaselineBenchmarkFailure[];
  readonly mutationResults?: readonly MutationBenchmarkResult[];
  readonly rowProfileConditions?: Readonly<Partial<Record<BenchmarkRowProfile, BenchmarkRowProfileConditions>>>;
  readonly run?: Readonly<Record<string, unknown>>;
  readonly baselineSamples?: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>;
}

const libraries = Object.freeze([
  'Sectile Virtual',
  'TanStack Virtual',
  'react-window',
  'React Virtuoso',
  'react-virtualized',
  'Virtua',
  'Vue Virtual Scroller',
]);
const automaticLibraries = new Set(['Sectile Virtual', 'React Virtuoso', 'Virtua']);

const { isKorean } = useDocsLocale();
const status = ref<LabStatus>('idle');
const composerOpen = ref(false);
const editingTargetID = ref<number | null>(null);
const targets = ref<BenchmarkTarget[]>([]);
const nextTargetID = ref(1);
const preset = ref<Preset>('standard');
const profile = ref<ProfileSelection>('all');
const phase = ref<PhaseSelection>('both');
const library = ref<LibrarySelection>('all');
const baselineMode = ref<HeightModeSelection>('all');
const mutationMode = ref<MutationModeSelection>('all');
const operation = ref<OperationSelection>('all');
const location = ref<LocationSelection>('all');
const rows = ref(100_000);
const baselineRounds = ref(5);
const warmupScrolls = ref(5);
const scrollSamples = ref(20);
const mutationRounds = ref(5);
const mutationSamples = ref(10);
const runnerFrame = ref<HTMLIFrameElement | null>(null);
const runnerSource = ref('');
const runnerKey = ref(0);
const runQueue = ref<readonly RunShard[]>([]);
const shardIndex = ref(0);
const shardProgress = ref(0);
const progressMessage = ref('');
const reports = ref<RawBenchmarkReport[]>([]);
const reportTargetIDs = ref<(number | null)[]>([]);
const baselineResults = ref<BaselineBenchmarkResult[]>([]);
const baselineFailures = ref<BaselineBenchmarkFailure[]>([]);
const mutationResults = ref<MutationBenchmarkResult[]>([]);
const rowProfileConditions = ref<Partial<Record<BenchmarkRowProfile, BenchmarkRowProfileConditions>>>({});
const feedback = ref('');
const errorMessage = ref('');
const targetError = ref('');
const viewingResults = ref(false);
const partialRun = ref<Readonly<Record<string, unknown>> | null>(null);
const baselineSamples = ref<Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>>({});
const checkpoints = ref<BenchmarkCheckpoint[]>([]);
const latestCheckpoint = ref<BenchmarkCheckpoint>();
const checkpointHistoryList = ref<DemoVirtualListHandle | null>(null);
const nextCheckpointID = ref(1);
let draftBeforeEdit: BenchmarkTarget | null = null;

const copy = computed(() => isKorean.value ? {
  back: 'Sectile 문서',
  title: '가상화 벤치마크',
  language: 'English',
  configure: '측정 세트',
  targetCount: (count: number) => `${count}개`,
  addTarget: '측정 세트 추가',
  targetComposer: '측정 세트 만들기',
  addToQueue: '추가',
  editTarget: '편집',
  editTargetTitle: (index: number) => `측정 세트 ${index} 수정`,
  saveTarget: '저장',
  closeComposer: '취소',
  removeTarget: '측정 세트 삭제',
  emptyTargets: '추가된 측정 세트가 없습니다.',
  emptyTargetsHint: '측정 세트를 추가해 원하는 조건 조합을 구성하세요.',
  target: (index: number) => `측정 세트 ${index}`,
  targetProgress: (current: number, total: number) => `측정 세트 ${current} / ${total}`,
  noTargets: '측정 세트를 하나 이상 추가하세요.',
  preset: '실행 강도',
  profile: '행 구성',
  phase: '측정 범위',
  library: '라이브러리',
  baselineMode: '초기 렌더 높이 입력',
  mutationMode: '변경 측정 높이 입력',
  operation: '변경 작업',
  location: '변경 위치',
  rows: '행 수',
  rowCount: (count: number) => `${count.toLocaleString()}행`,
  decrease: (label: string) => `${label} 줄이기`,
  increase: (label: string) => `${label} 늘리기`,
  help: (label: string) => `${label} 설명`,
  number: (value: number) => value.toLocaleString('ko-KR'),
  minimum: '최소',
  maximum: '최대',
  baselineRounds: '초기 렌더 라운드',
  warmupScrolls: '준비 스크롤',
  scrollSamples: '라운드당 스크롤 표본',
  mutationRounds: '변경 측정 배치',
  mutationSamples: '배치당 표본',
  rowsHelp: '각 라이브러리가 가상화할 전체 행 수입니다. 행 수가 많을수록 초기화와 스크롤 부하가 커집니다.',
  baselineRoundsHelp: '같은 초기 렌더 조건을 반복 측정하는 횟수입니다. 늘리면 결과가 안정되지만 실행 시간도 길어집니다.',
  warmupScrollsHelp: '표본을 기록하기 전에 왕복 스크롤하는 횟수입니다. 초기 캐시와 레이아웃 준비 영향을 줄입니다.',
  scrollSamplesHelp: '초기 렌더 라운드마다 기록하는 스크롤 표본 수입니다. 늘리면 중앙값과 p95의 신뢰도가 높아집니다.',
  mutationRoundsHelp: '삽입·이동·삭제·높이 변경 조건을 반복 측정하는 배치 수입니다. 반복 간 편차를 확인하는 데 쓰입니다.',
  mutationSamplesHelp: '각 변경 측정 배치에서 실행하는 작업 표본 수입니다. 늘리면 중앙값과 p95가 안정됩니다.',
  planTitle: '전체 실행 예상',
  profileRuns: '행 프로필 실행',
  baselineConditions: '초기 렌더 조건',
  mutationConditions: '변경 조건',
  plannedSamples: '최대 표본',
  estimatedDuration: '예상 소요',
  durationNote: '기기 성능과 조기 종료에 따라 실제 시간은 달라질 수 있습니다.',
  checkpointTitle: '체크포인트 현황',
  checkpointDescription: '측정 사이 안전한 시점에만 갱신됩니다.',
  checkpointWaiting: '첫 체크포인트 대기 중',
  checkpointWaitingHint: '측정 결과가 확정되면 최근 완료 정보가 여기에 표시됩니다.',
  nextCheckpointWaiting: '다음 체크포인트 대기 중',
  latestCheckpoint: '최근 체크포인트',
  recentCheckpoints: '최근 기록',
  checkpointPosition: (completed: number, total: number) => `${completed.toLocaleString('ko-KR')} / ${total.toLocaleString('ko-KR')}`,
  checkpointRound: '라운드 완료',
  checkpointComplete: '조건 완료',
  checkpointFailed: '오류',
  samples: '표본',
  median: '중앙값',
  p95: 'p95',
  seconds: (value: number) => `${value.toLocaleString('ko-KR')}초`,
  minutes: (value: number) => `${value.toLocaleString('ko-KR')}분`,
  hours: (value: number) => `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}시간`,
  run: '벤치마크 실행',
  running: '측정 중',
  complete: '측정 완료',
  completeMessage: '모든 측정 세트가 완료됨',
  cancelledTitle: '실행 취소됨',
  cancelledMessage: '완료된 측정과 체크포인트까지 보존됨',
  viewResults: '결과 보기',
  cancel: '실행 취소',
  progress: '전체 진행률',
  completedBaseline: '초기 렌더 조건',
  completedMutations: '변경 조건',
  totalSamples: '누적 표본',
  failures: '오류 조건',
  accumulatedMetric: '누적 항목',
  resultTitle: '측정 결과',
  resultDescription: '완료된 측정만 반영됩니다. 실행 중 값은 checkpoint에서 교체됩니다.',
  rawTitle: '원본 결과',
  rawDescription: '실행 조건, 환경, source fingerprint, 원본 표본을 그대로 보존합니다.',
  copyJson: 'JSON 복사',
  downloadJson: 'JSON 다운로드',
  importJson: 'JSON 가져오기',
  rerun: '다시 실행',
  cancelled: '실행이 취소됐습니다. 완료된 checkpoint는 아래 원본 결과에 남아 있습니다.',
  failed: '벤치마크 실행 실패',
  unsupportedFixed: '고정 높이 초기 렌더는 같은 높이 행에서만 측정할 수 있습니다.',
  unsupportedAutomatic: '선택한 라이브러리는 높이 생략 모드를 지원하지 않습니다.',
  copied: 'JSON을 복사했습니다.',
  imported: 'JSON을 가져왔습니다.',
  option: {
    all: '전체', quick: '빠른 확인', standard: '표준 측정', custom: '직접 설정',
    uniform: '같은 높이', heterogeneous: '서로 다른 높이', both: '전체',
    baseline: '초기 렌더와 스크롤', mutations: '목록 변경', fixed: '고정 높이',
    estimated: '예상값 제공', automatic: '높이 생략', insert: '삽입', move: '이동',
    remove: '삭제', resize: '높이 변경', start: '시작', middle: '중간', end: '끝',
  },
} : {
  back: 'Sectile docs',
  title: 'Virtual benchmark',
  language: '한국어',
  configure: 'Benchmark sets',
  targetCount: (count: number) => `${count}`,
  addTarget: 'Add benchmark set',
  targetComposer: 'Create benchmark set',
  addToQueue: 'Add',
  editTarget: 'Edit',
  editTargetTitle: (index: number) => `Edit benchmark set ${index}`,
  saveTarget: 'Save',
  closeComposer: 'Cancel',
  removeTarget: 'Remove benchmark set',
  emptyTargets: 'No benchmark sets added.',
  emptyTargetsHint: 'Add a benchmark set to compose the conditions you want to measure.',
  target: (index: number) => `Benchmark set ${index}`,
  targetProgress: (current: number, total: number) => `Benchmark set ${current} / ${total}`,
  noTargets: 'Add at least one benchmark set.',
  preset: 'Run intensity',
  profile: 'Row profile',
  phase: 'Measurement scope',
  library: 'Library',
  baselineMode: 'Initial-render height input',
  mutationMode: 'Mutation height input',
  operation: 'Mutation operation',
  location: 'Mutation location',
  rows: 'Rows',
  rowCount: (count: number) => `${count.toLocaleString()} rows`,
  decrease: (label: string) => `Decrease ${label}`,
  increase: (label: string) => `Increase ${label}`,
  help: (label: string) => `About ${label}`,
  number: (value: number) => value.toLocaleString('en-US'),
  minimum: 'Minimum',
  maximum: 'Maximum',
  baselineRounds: 'Baseline rounds',
  warmupScrolls: 'Warm-up scrolls',
  scrollSamples: 'Scroll samples per round',
  mutationRounds: 'Mutation batches',
  mutationSamples: 'Samples per batch',
  rowsHelp: 'The total number of rows each library virtualizes. Higher values increase initialization and scrolling load.',
  baselineRoundsHelp: 'The number of times the same initial-render condition is measured. More rounds stabilize results but take longer.',
  warmupScrollsHelp: 'The number of round-trip scrolls before samples are recorded. Warm-up reduces the influence of initial caching and layout preparation.',
  scrollSamplesHelp: 'The number of scroll samples recorded in each initial-render round. More samples improve confidence in the median and p95.',
  mutationRoundsHelp: 'The number of batches used to measure insert, move, remove, and height-change conditions. More batches reveal variation between repetitions.',
  mutationSamplesHelp: 'The number of operations performed in each mutation batch. More samples stabilize the median and p95.',
  planTitle: 'Full run estimate',
  profileRuns: 'Row-profile runs',
  baselineConditions: 'Baseline conditions',
  mutationConditions: 'Mutation conditions',
  plannedSamples: 'Maximum samples',
  estimatedDuration: 'Estimated time',
  durationNote: 'Actual time varies with device performance and adaptive early stopping.',
  checkpointTitle: 'Checkpoint status',
  checkpointDescription: 'Updates only at safe boundaries between measurements.',
  checkpointWaiting: 'Waiting for the first checkpoint',
  checkpointWaitingHint: 'The latest completed measurement appears here when its result is committed.',
  nextCheckpointWaiting: 'Waiting for the next checkpoint',
  latestCheckpoint: 'Latest checkpoint',
  recentCheckpoints: 'Recent checkpoints',
  checkpointPosition: (completed: number, total: number) => `${completed.toLocaleString('en-US')} / ${total.toLocaleString('en-US')}`,
  checkpointRound: 'Round complete',
  checkpointComplete: 'Condition complete',
  checkpointFailed: 'Error',
  samples: 'Samples',
  median: 'Median',
  p95: 'p95',
  seconds: (value: number) => `${value.toLocaleString('en-US')}s`,
  minutes: (value: number) => `${value.toLocaleString('en-US')}m`,
  hours: (value: number) => `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}h`,
  run: 'Run benchmark',
  running: 'Measurement in progress',
  complete: 'Measurement complete',
  completeMessage: 'All measurement sets are complete',
  cancelledTitle: 'Run cancelled',
  cancelledMessage: 'Completed measurements and checkpoints were preserved',
  viewResults: 'View results',
  cancel: 'Cancel run',
  progress: 'Overall progress',
  completedBaseline: 'Baseline conditions',
  completedMutations: 'Mutation conditions',
  totalSamples: 'Accumulated samples',
  failures: 'Conditions with errors',
  accumulatedMetric: 'Accumulated metric',
  resultTitle: 'Measured results',
  resultDescription: 'Only completed measurements appear. In-progress values are replaced at checkpoint boundaries.',
  rawTitle: 'Raw result',
  rawDescription: 'Run conditions, environment, source fingerprint, and every raw sample remain intact.',
  copyJson: 'Copy JSON',
  downloadJson: 'Download JSON',
  importJson: 'Import JSON',
  rerun: 'Run again',
  cancelled: 'The run was cancelled. Completed checkpoints remain in the raw result below.',
  failed: 'Benchmark run failed',
  unsupportedFixed: 'Fixed-height baseline measurement is available only for uniform rows.',
  unsupportedAutomatic: 'The selected library does not support omitted-height measurement.',
  copied: 'JSON copied.',
  imported: 'JSON imported.',
  option: {
    all: 'All', quick: 'Quick check', standard: 'Standard measurement', custom: 'Custom',
    uniform: 'Uniform heights', heterogeneous: 'Mixed natural heights', both: 'All',
    baseline: 'Initial render and scrolling', mutations: 'Collection mutations', fixed: 'Fixed height',
    estimated: 'Estimate provided', automatic: 'Height omitted', insert: 'Insert', move: 'Move',
    remove: 'Remove', resize: 'Height change', start: 'Start', middle: 'Middle', end: 'End',
  },
});

const presetOptions = computed<readonly DemoSelectOption[]>(() => optionList(['quick', 'standard', 'custom']));
const profileOptions = computed<readonly DemoSelectOption[]>(() => optionList(['all', 'uniform', 'heterogeneous']));
const phaseOptions = computed<readonly DemoSelectOption[]>(() => optionList(['both', 'baseline', 'mutations']));
const libraryOptions = computed<readonly DemoSelectOption[]>(() => [
  { id: 'all', label: copy.value.option.all },
  ...libraries.map((name) => ({ id: name, label: name })),
]);
const baselineModeOptions = computed<readonly DemoSelectOption[]>(() => optionList(['all', 'fixed', 'estimated', 'automatic']));
const mutationModeOptions = computed<readonly DemoSelectOption[]>(() => optionList(['all', 'estimated', 'automatic']));
const operationOptions = computed<readonly DemoSelectOption[]>(() => optionList(['all', 'insert', 'move', 'remove', 'resize']));
const locationOptions = computed<readonly DemoSelectOption[]>(() => optionList(['all', 'start', 'middle', 'end']));
const isRunning = computed(() => status.value === 'running');
const showRunWorkspace = computed(() => !viewingResults.value
  && (isRunning.value || status.value === 'complete' || status.value === 'cancelled'));
const runWorkspaceTitle = computed(() => {
  if (isRunning.value) return copy.value.running;
  return status.value === 'complete' ? copy.value.complete : copy.value.cancelledTitle;
});
const runWorkspaceMessage = computed(() => {
  if (isRunning.value) return progressMessage.value === copy.value.running ? '\u00a0' : progressMessage.value;
  return status.value === 'complete' ? copy.value.completeMessage : copy.value.cancelledMessage;
});
const libraryTotals = computed<readonly BenchmarkLibraryTotals[]>(() => {
  const totals = new Map<string, {
    baseline: number;
    mutations: number;
    samples: number;
    failures: number;
  }>();
  const ensure = (libraryName: string) => {
    const current = totals.get(libraryName);
    if (current !== undefined) return current;
    const created = { baseline: 0, mutations: 0, samples: 0, failures: 0 };
    totals.set(libraryName, created);
    return created;
  };

  for (const shard of runQueue.value) {
    if (shard.target.library === 'all') {
      for (const libraryName of libraries) ensure(libraryName);
    } else {
      ensure(shard.target.library);
    }
  }

  const completedBaseline = [
    ...baselineResults.value,
    ...reports.value.flatMap((report) => report.baselineResults ?? []),
  ];
  for (const result of completedBaseline) {
    const total = ensure(result.library);
    total.baseline += 1;
    total.samples += result.scrollSampleCount;
  }

  const completedBaselineFailures = [
    ...baselineFailures.value,
    ...reports.value.flatMap((report) => normalizeBaselineFailures(report)),
  ];
  for (const failure of completedBaselineFailures) ensure(failure.library).failures += 1;

  const completedMutations = [
    ...mutationResults.value,
    ...reports.value.flatMap((report) => report.mutationResults ?? []),
  ];
  for (const result of completedMutations) {
    const total = ensure(result.library);
    total.mutations += 1;
    total.samples += result.totalSamples;
    if (result.failedSamples > 0) total.failures += 1;
  }

  return [...totals].map(([libraryName, total]) => Object.freeze({
    library: libraryName,
    ...total,
  }));
});
const planSummary = computed(() => summarizeVirtualBenchmarkPlan(targets.value, {
  libraries,
  automaticLibraries,
}));
const planDurationLabel = computed(() => {
  if (targets.value.length === 0) return '—';
  const minimum = formatPlanDuration(planSummary.value.minimumDurationSeconds);
  const maximum = formatPlanDuration(planSummary.value.maximumDurationSeconds);
  return minimum === maximum ? minimum : `${minimum}–${maximum}`;
});
const overallProgress = computed(() => {
  const count = Math.max(1, runQueue.value.length);
  return Math.min(100, ((shardIndex.value + shardProgress.value / 100) / count) * 100);
});
const activeShard = computed(() => runQueue.value[shardIndex.value]);
const activeTargetPosition = computed(() => {
  const targetID = activeShard.value?.target.id;
  const index = targets.value.findIndex((target) => target.id === targetID);
  return index < 0 ? 0 : index + 1;
});
const rawSession = computed(() => ({
  benchmarkSession: 'sectile-virtual-ecosystem',
  schemaVersion: 2,
  status: status.value,
  configuration: configurationSnapshot(),
  reports: reports.value,
  reportTargetIDs: reportTargetIDs.value,
  partialResults: {
    baselineResults: baselineResults.value,
    baselineFailures: baselineFailures.value,
    mutationResults: mutationResults.value,
    rowProfileConditions: rowProfileConditions.value,
    ...(partialRun.value === null ? {} : { run: partialRun.value }),
    baselineSamples: baselineSamples.value,
  },
}));
const resultGroups = computed<readonly BenchmarkResultGroup[]>(groupReports);
const exportPayload = computed(() => rawSession.value);
const rawJson = computed(() => JSON.stringify(exportPayload.value, null, 2));
const rawByteSize = computed(() => new Blob([rawJson.value]).size);
const docsHref = computed(() => withBase(isKorean.value ? '/ko/' : '/'));
const localeHref = computed(() => withBase(isKorean.value ? '/benchmarks/virtual' : '/ko/benchmarks/virtual'));

onMounted(() => window.addEventListener('message', receiveRunnerMessage));
onBeforeUnmount(() => window.removeEventListener('message', receiveRunnerMessage));
watch(composerOpen, (open) => {
  if (!open) return;
  if (editingTargetID.value !== null) {
    editingTargetID.value = null;
    restoreCreateDraft();
  }
  targetError.value = '';
});

function formatPlanDuration(seconds: number): string {
  if (seconds < 60) return copy.value.seconds(Math.max(5, Math.ceil(seconds / 5) * 5));
  if (seconds < 3_600) return copy.value.minutes(Math.ceil(seconds / 60));
  return copy.value.hours(Math.ceil(seconds / 360) / 10);
}

function optionList(ids: readonly string[]): readonly DemoSelectOption[] {
  return ids.map((id) => ({ id, label: copy.value.option[id as keyof typeof copy.value.option] ?? id }));
}

function targetSnapshot(id = nextTargetID.value): BenchmarkTarget {
  return Object.freeze({
    id,
    preset: preset.value,
    profile: profile.value,
    phase: phase.value,
    library: library.value,
    baselineMode: baselineMode.value,
    mutationMode: mutationMode.value,
    operation: operation.value,
    location: location.value,
    rows: rows.value,
    baselineRounds: baselineRounds.value,
    warmupScrolls: warmupScrolls.value,
    scrollSamples: scrollSamples.value,
    mutationRounds: mutationRounds.value,
    mutationSamples: mutationSamples.value,
  });
}

function loadTargetDraft(target: BenchmarkTarget): void {
  preset.value = target.preset;
  profile.value = target.profile;
  phase.value = target.phase;
  library.value = target.library;
  baselineMode.value = target.baselineMode;
  mutationMode.value = target.mutationMode;
  operation.value = target.operation;
  location.value = target.location;
  rows.value = target.rows;
  baselineRounds.value = target.baselineRounds;
  warmupScrolls.value = target.warmupScrolls;
  scrollSamples.value = target.scrollSamples;
  mutationRounds.value = target.mutationRounds;
  mutationSamples.value = target.mutationSamples;
}

function restoreCreateDraft(): void {
  if (draftBeforeEdit !== null) loadTargetDraft(draftBeforeEdit);
  draftBeforeEdit = null;
}

function updateTargetEditor(target: BenchmarkTarget, open: boolean): void {
  if (open) {
    composerOpen.value = false;
    if (editingTargetID.value === null) draftBeforeEdit = targetSnapshot();
    loadTargetDraft(target);
    targetError.value = '';
    editingTargetID.value = target.id;
    return;
  }
  if (editingTargetID.value !== target.id) return;
  editingTargetID.value = null;
  targetError.value = '';
  restoreCreateDraft();
}

function submitTarget() {
  const target = targetSnapshot();
  const invalidReason = invalidConfiguration(target);
  if (invalidReason !== null) {
    targetError.value = invalidReason;
    return { ok: false as const, issues: [{ id: 'target-configuration', message: invalidReason }] };
  }
  nextTargetID.value += 1;
  targets.value = [...targets.value, target];
  targetError.value = '';
  errorMessage.value = '';
  composerOpen.value = false;
  return { ok: true as const };
}

function submitTargetEdit(targetID: number) {
  const target = targetSnapshot(targetID);
  const invalidReason = invalidConfiguration(target);
  if (invalidReason !== null) {
    targetError.value = invalidReason;
    return { ok: false as const, issues: [{ id: 'target-configuration', message: invalidReason }] };
  }
  targets.value = targets.value.map((current) => current.id === targetID ? target : current);
  targetError.value = '';
  errorMessage.value = '';
  editingTargetID.value = null;
  restoreCreateDraft();
  return { ok: true as const };
}

function removeTarget(targetID: number): void {
  if (editingTargetID.value === targetID) {
    editingTargetID.value = null;
    restoreCreateDraft();
  }
  targets.value = targets.value.filter((target) => target.id !== targetID);
}

function startRun(): void {
  if (targets.value.length === 0) {
    errorMessage.value = copy.value.noTargets;
    return;
  }
  const invalidReason = targets.value.map(invalidConfiguration).find((reason) => reason !== null) ?? null;
  if (invalidReason !== null) {
    errorMessage.value = invalidReason;
    return;
  }
  status.value = 'running';
  viewingResults.value = false;
  errorMessage.value = '';
  feedback.value = '';
  reports.value = [];
  reportTargetIDs.value = [];
  checkpoints.value = [];
  latestCheckpoint.value = undefined;
  nextCheckpointID.value = 1;
  resetPartialResults();
  runQueue.value = targets.value.flatMap((target) => (
    target.profile === 'all'
      ? [{ target, profile: 'uniform' as const }, { target, profile: 'heterogeneous' as const }]
      : [{ target, profile: target.profile }]
  ));
  shardIndex.value = 0;
  shardProgress.value = 0;
  progressMessage.value = copy.value.running;
  launchShard();
}

function launchShard(): void {
  const shard = runQueue.value[shardIndex.value];
  if (shard === undefined) {
    status.value = 'complete';
    runnerSource.value = '';
    return;
  }
  runnerKey.value += 1;
  runnerSource.value = runnerUrl(shard);
}

function runnerUrl({ target, profile: activeProfile }: RunShard): string {
  const url = new URL(withBase('/benchmark-runner/index.html'), window.location.href);
  const params = url.searchParams;
  params.set('embedded', '');
  params.set('row-profile', activeProfile);
  params.set('rows', String(target.rows));
  if (target.phase === 'baseline') params.set('baseline-only', '');
  if (target.phase === 'mutations') params.set('mutations-only', '');
  if (target.library !== 'all') params.set('library', target.library);
  if (target.baselineMode !== 'all') params.set('baseline-mode', target.baselineMode);
  if (target.mutationMode !== 'all') params.set('mutation-mode', target.mutationMode);
  if (target.operation !== 'all') params.set('mutation-operation', target.operation);
  if (target.location !== 'all') params.set('mutation-location', target.location);
  if (target.preset === 'quick') params.set('quick', '');
  if (target.preset === 'custom') {
    params.set('baseline-rounds', String(target.baselineRounds));
    params.set('warmup-scrolls', String(target.warmupScrolls));
    params.set('scroll-samples', String(target.scrollSamples));
    params.set('mutation-rounds', String(target.mutationRounds));
    params.set('mutation-samples', String(target.mutationSamples));
  }
  return url.toString();
}

function receiveRunnerMessage(event: MessageEvent<unknown>): void {
  if (status.value !== 'running' || event.origin !== window.location.origin || event.source !== runnerFrame.value?.contentWindow) return;
  if (!isRunnerMessage(event.data)) return;
  const message = event.data;
  if (message.run !== undefined) partialRun.value = message.run;
  if (message.baselineSampleKey !== undefined && message.baselineSamples !== undefined) {
    baselineSamples.value = { ...baselineSamples.value, [message.baselineSampleKey]: message.baselineSamples };
  }
  if (message.type === 'progress' || message.type === 'checkpoint') updateProgress(message);
  if (message.baselineResult !== undefined) upsertBaseline(message.baselineResult);
  if (message.baselineFailure !== undefined) upsertBaselineFailure(message.baselineFailure);
  if (message.mutationResult !== undefined) upsertMutation(normalizeMutation(message.mutationResult));
  if (message.type === 'checkpoint') recordCheckpoint(message);
  if (message.type === 'complete' && message.report !== undefined) finishShard(message.report);
  if (message.type === 'error') failRun(message.message ?? copy.value.failed);
}

function updateProgress(message: RunnerMessage): void {
  progressMessage.value = message.message ?? progressMessage.value;
  const ratio = Math.max(0, Math.min(1, (message.completed ?? 0) / Math.max(1, message.total ?? 1)));
  const activePhase = activeShard.value?.target.phase ?? 'both';
  if (message.phase === 'baseline') shardProgress.value = activePhase === 'both' ? 5 + ratio * 45 : 5 + ratio * 95;
  else if (message.phase === 'mutations') shardProgress.value = activePhase === 'both' ? 50 + ratio * 50 : 5 + ratio * 95;
  else shardProgress.value = Math.max(shardProgress.value, message.phase === 'warmup' ? 4 : 2);
}

function recordCheckpoint(message: RunnerMessage): void {
  const baseline = message.baselineResult;
  const failure = message.baselineFailure;
  const mutation = message.mutationResult;
  const phase = message.phase === 'mutations' ? 'mutations' : 'baseline';
  const library = baseline?.library ?? failure?.library ?? mutation?.library;
  const mode = baseline?.mode ?? failure?.mode ?? mutation?.sizeMode;
  const checkpoint: BenchmarkCheckpoint = Object.freeze({
    id: nextCheckpointID.value,
    targetPosition: activeTargetPosition.value,
    phase,
    completed: message.completed ?? 0,
    total: message.total ?? 0,
    profile: baseline?.rowProfile ?? failure?.rowProfile ?? mutation?.rowProfile ?? activeShard.value?.profile ?? 'uniform',
    ...(library === undefined ? {} : { library }),
    ...(mode === undefined ? {} : { mode }),
    ...(mutation?.operation === undefined ? {} : { operation: mutation.operation }),
    ...(mutation?.location === undefined ? {} : { location: mutation.location }),
    samples: baseline?.scrollSampleCount ?? mutation?.totalSamples ?? message.baselineSamples?.length ?? 0,
    medianMs: baseline?.scrollMedianMs ?? mutation?.medianMs ?? null,
    p95Ms: baseline?.scrollP95Ms ?? mutation?.p95Ms ?? null,
    outcome: failure !== undefined || (mutation?.failedSamples ?? 0) > 0
      ? 'failed'
      : baseline !== undefined || mutation !== undefined ? 'complete' : 'round',
  });
  nextCheckpointID.value += 1;
  const previousCheckpoint = latestCheckpoint.value;
  if (previousCheckpoint !== undefined) {
    const followLatest = checkpointHistoryList.value?.isAtEnd() ?? true;
    checkpoints.value = [...checkpoints.value, previousCheckpoint];
    if (followLatest) {
      void nextTick(() => checkpointHistoryList.value?.scrollTo(String(previousCheckpoint.id), 'end'));
    }
  }
  latestCheckpoint.value = checkpoint;
}

function checkpointKey(checkpoint: BenchmarkCheckpoint): string {
  return String(checkpoint.id);
}

function checkpointHeading(checkpoint: BenchmarkCheckpoint): string {
  const parts = [
    checkpoint.library,
    checkpoint.mode === undefined ? undefined : selectionLabel(checkpoint.mode),
    checkpoint.operation === undefined ? undefined : selectionLabel(checkpoint.operation),
    checkpoint.location === undefined ? undefined : selectionLabel(checkpoint.location),
  ].filter((value): value is string => value !== undefined);
  return parts.length === 0 ? selectionLabel(checkpoint.phase) : parts.join(' · ');
}

function checkpointContext(checkpoint: BenchmarkCheckpoint): string {
  return [
    copy.value.target(checkpoint.targetPosition),
    selectionLabel(checkpoint.profile),
    copy.value.checkpointPosition(checkpoint.completed, checkpoint.total),
  ].join(' · ');
}

function checkpointOutcome(checkpoint: BenchmarkCheckpoint): string {
  if (checkpoint.outcome === 'failed') return copy.value.checkpointFailed;
  return checkpoint.outcome === 'complete' ? copy.value.checkpointComplete : copy.value.checkpointRound;
}

function milliseconds(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString(isKorean.value ? 'ko-KR' : 'en-US', { maximumFractionDigits: 3 })} ms`;
}

function finishShard(report: RawBenchmarkReport): void {
  reports.value = [...reports.value, report];
  reportTargetIDs.value = [...reportTargetIDs.value, activeShard.value?.target.id ?? null];
  resetPartialResults();
  shardProgress.value = 100;
  if (shardIndex.value + 1 >= runQueue.value.length) {
    status.value = 'complete';
    runnerSource.value = '';
    return;
  }
  shardIndex.value += 1;
  shardProgress.value = 0;
  runnerSource.value = '';
  void nextTick().then(launchShard);
}

function invalidConfiguration(target: BenchmarkTarget): string | null {
  const includesBaseline = target.phase !== 'mutations';
  const includesMutations = target.phase !== 'baseline';
  if (includesBaseline && target.baselineMode === 'fixed' && target.profile !== 'uniform') return copy.value.unsupportedFixed;
  const automaticRequested = (includesBaseline && target.baselineMode === 'automatic')
    || (includesMutations && target.mutationMode === 'automatic');
  if (automaticRequested && target.library !== 'all' && !automaticLibraries.has(target.library)) return copy.value.unsupportedAutomatic;
  return null;
}

function cancelRun(): void {
  if (!isRunning.value) return;
  runnerSource.value = '';
  runnerKey.value += 1;
  status.value = 'cancelled';
  progressMessage.value = copy.value.cancelled;
}

function failRun(message: string): void {
  runnerSource.value = '';
  status.value = 'error';
  errorMessage.value = message;
}

function resetPartialResults(): void {
  baselineResults.value = [];
  baselineFailures.value = [];
  mutationResults.value = [];
  rowProfileConditions.value = {};
  partialRun.value = null;
  baselineSamples.value = {};
}

function applyRowProfileConditions(
  report: RawBenchmarkReport,
  conditions: Partial<Record<BenchmarkRowProfile, BenchmarkRowProfileConditions>>,
): void {
  const profileName = report.conditions.rowProfile;
  if (report.conditions.rowProfiles !== undefined) Object.assign(conditions, report.conditions.rowProfiles);
  else if (profileName !== undefined && report.conditions.heightDistribution !== undefined) {
    conditions[profileName] = {
      commonEstimateHeight: report.conditions.commonEstimateHeight ?? 72,
      contentCorpusVersion: report.conditions.contentCorpusVersion ?? 1,
      contentVariants: report.conditions.contentVariants ?? 256,
      heightDistribution: report.conditions.heightDistribution,
    };
  }
}

function upsertBaseline(result: BaselineBenchmarkResult): void {
  const normalized = { ...result, runIds: result.runIds ?? [] };
  baselineResults.value = upsert(baselineResults.value, normalized, baselineKey);
}

function upsertBaselineFailure(failure: RawBaselineFailure): void {
  const activeTarget = activeShard.value?.target;
  const normalized: BaselineBenchmarkFailure = {
    runIds: failure.runIds ?? [],
    rowProfile: failure.rowProfile,
    mode: failure.mode,
    library: failure.library,
    version: failure.version,
    stack: failure.stack,
    failedRounds: 1,
    totalRounds: activeTarget?.preset === 'custom'
      ? activeTarget.baselineRounds
      : activeTarget?.preset === 'quick' ? 1 : 5,
    message: failure.message,
  };
  const existing = baselineFailures.value.find((entry) => baselineKey(entry) === baselineKey(normalized));
  upsertBaselineFailureResult(existing === undefined ? normalized : { ...normalized, failedRounds: existing.failedRounds + 1 });
}

function upsertBaselineFailureResult(result: BaselineBenchmarkFailure): void {
  baselineFailures.value = upsert(baselineFailures.value, result, baselineKey);
}

function upsertMutation(result: MutationBenchmarkResult): void {
  mutationResults.value = upsert(mutationResults.value, result, mutationKey);
}

function normalizeBaselineFailures(report: RawBenchmarkReport): readonly BaselineBenchmarkFailure[] {
  const groups = new Map<string, RawBaselineFailure[]>();
  for (const failure of report.baselineFailures ?? []) {
    const key = baselineKey(failure);
    groups.set(key, [...(groups.get(key) ?? []), failure]);
  }
  const totalRounds = Number(report.conditions.baseline?.['maximumRounds'] ?? report.conditions.baseline?.['rounds'] ?? 0);
  return [...groups.values()].map((failures) => {
    const first = failures[0]!;
    return {
      runIds: [...new Set(failures.flatMap((failure) => failure.runIds ?? []))],
      rowProfile: first.rowProfile,
      mode: first.mode,
      library: first.library,
      version: first.version,
      stack: first.stack,
      failedRounds: failures.length,
      totalRounds,
      message: first.message,
    };
  });
}

function normalizeMutation(result: RawMutationResult): MutationBenchmarkResult {
  const slowTailMs = result.p95Ms === null ? [] : (result.samples ?? [])
    .map((sample) => sample.elapsedMs)
    .filter((value): value is number => typeof value === 'number' && value > result.p95Ms! )
    .sort((left, right) => left - right);
  return {
    ...result,
    slowTailMs,
    failureCodes: [...new Set((result.failures ?? []).map((failure) => failure.code))],
  };
}

function upsert<T>(values: readonly T[], value: T, key: (entry: T) => string): T[] {
  const target = key(value);
  const index = values.findIndex((entry) => key(entry) === target);
  if (index < 0) return [...values, value];
  const next = [...values];
  next[index] = value;
  return next;
}

function baselineKey(result: Pick<BaselineBenchmarkResult, 'rowProfile' | 'mode' | 'library'>): string {
  return `${result.rowProfile}:${result.mode}:${result.library}`;
}

function mutationKey(result: Pick<MutationBenchmarkResult, 'rowProfile' | 'library' | 'sizeMode' | 'operation' | 'location'>): string {
  return `${result.rowProfile}:${result.library}:${result.sizeMode}:${result.operation}:${result.location}`;
}

function groupReports(): readonly BenchmarkResultGroup[] {
  const groups: BenchmarkResultGroup[] = [];
  for (const target of targets.value) {
    const matching = reports.value.filter((_report, index) => reportTargetIDs.value[index] === target.id);
    if (matching.length > 0) groups.push(aggregateReports(matching, target));
  }
  const imported = reports.value.filter((_report, index) => reportTargetIDs.value[index] === null || reportTargetIDs.value[index] === undefined);
  if (imported.length > 0) groups.push(aggregateReports(imported, null));
  return groups;
}

function aggregateReports(sourceReports: readonly RawBenchmarkReport[], target: BenchmarkTarget | null): BenchmarkResultGroup {
  let groupedBaseline: BaselineBenchmarkResult[] = [];
  let groupedFailures: BaselineBenchmarkFailure[] = [];
  let groupedMutations: MutationBenchmarkResult[] = [];
  const groupedConditions: Partial<Record<BenchmarkRowProfile, BenchmarkRowProfileConditions>> = {};
  for (const report of sourceReports) {
    for (const result of report.baselineResults ?? []) {
      groupedFailures = groupedFailures.filter((failure) => baselineKey(failure) !== baselineKey(result));
      groupedBaseline = upsert(groupedBaseline, { ...result, runIds: result.runIds ?? [] }, baselineKey);
    }
    for (const failure of normalizeBaselineFailures(report)) {
      groupedBaseline = groupedBaseline.filter((result) => baselineKey(result) !== baselineKey(failure));
      groupedFailures = upsert(groupedFailures, failure, baselineKey);
    }
    for (const result of report.mutationResults ?? []) {
      groupedMutations = upsert(groupedMutations, normalizeMutation(result), mutationKey);
    }
    applyRowProfileConditions(report, groupedConditions);
  }
  return {
    target,
    baselineResults: groupedBaseline,
    baselineFailures: groupedFailures,
    mutationResults: groupedMutations,
    rowProfileConditions: groupedConditions,
  };
}

function resultSelection(group: BenchmarkResultGroup): string {
  const baseline = group.baselineResults[0];
  if (baseline !== undefined) return `${baseline.rowProfile}:mount:${baseline.mode}`;
  const mutation = group.mutationResults[0];
  return mutation === undefined
    ? 'uniform:mount:fixed'
    : `${mutation.rowProfile}:${mutation.operation}:${mutation.sizeMode}:${mutation.location}`;
}

function targetSummary(target: BenchmarkTarget): string {
  const libraryName = target.library === 'all'
    ? `${copy.value.library} ${copy.value.option.all}`
    : target.library;
  return `${libraryName} · ${copy.value.rowCount(target.rows)}`;
}

function selectionLabel(value: string): string {
  return copy.value.option[value as keyof typeof copy.value.option] ?? value;
}

function configurationSnapshot(): Readonly<Record<string, unknown>> {
  return { targets: targets.value };
}

async function copyRawJson(): Promise<void> {
  await navigator.clipboard.writeText(rawJson.value);
  feedback.value = copy.value.copied;
}

function downloadRawJson(): void {
  const blob = new Blob([`${rawJson.value}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sectile-virtual-benchmark-${new Date().toISOString().replaceAll(':', '-')}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function importRawJson(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (file === undefined) return;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    const imported = importedPayload(parsed);
    if (imported.reports.length === 0 && imported.partialResults === undefined) {
      throw new Error('The JSON does not contain benchmark results.');
    }
    reports.value = [...imported.reports];
    reportTargetIDs.value = imported.reportTargetIDs.length === imported.reports.length
      ? [...imported.reportTargetIDs]
      : imported.reports.map(() => null);
    if (imported.targets.length > 0) {
      targets.value = [...imported.targets];
      nextTargetID.value = Math.max(...imported.targets.map((target) => target.id)) + 1;
    }
    resetPartialResults();
    partialRun.value = imported.partialResults?.run ?? null;
    baselineSamples.value = imported.partialResults?.baselineSamples ?? {};
    for (const result of imported.partialResults?.baselineResults ?? []) upsertBaseline(result);
    for (const result of imported.partialResults?.baselineFailures ?? []) upsertBaselineFailureResult(result);
    for (const result of imported.partialResults?.mutationResults ?? []) upsertMutation(result);
    Object.assign(rowProfileConditions.value, imported.partialResults?.rowProfileConditions ?? {});
    status.value = imported.status ?? (imported.partialResults === undefined ? 'complete' : 'cancelled');
    viewingResults.value = true;
    feedback.value = copy.value.imported;
    errorMessage.value = '';
  } catch (error) {
    failRun(error instanceof Error ? error.message : String(error));
  } finally {
    input.value = '';
  }
}

function importedPayload(value: unknown): {
  readonly reports: readonly RawBenchmarkReport[];
  readonly reportTargetIDs: readonly (number | null)[];
  readonly targets: readonly BenchmarkTarget[];
  readonly status?: Extract<LabStatus, 'complete' | 'cancelled'>;
  readonly partialResults?: RawBenchmarkPartialResults;
} {
  if (isRawBenchmarkReport(value)) return { reports: [value], reportTargetIDs: [null], targets: [] };
  if (typeof value !== 'object' || value === null) return { reports: [], reportTargetIDs: [], targets: [] };
  const reports = 'reports' in value && Array.isArray(value.reports)
    ? value.reports.filter(isRawBenchmarkReport)
    : [];
  const reportTargetIDs = 'reportTargetIDs' in value && Array.isArray(value.reportTargetIDs)
    ? value.reportTargetIDs.map((id) => typeof id === 'number' ? id : null)
    : reports.map(() => null);
  const targets = 'configuration' in value && typeof value.configuration === 'object' && value.configuration !== null
    && 'targets' in value.configuration && Array.isArray(value.configuration.targets)
    ? value.configuration.targets.filter(isBenchmarkTarget)
    : [];
  const importedStatus = 'status' in value && (value.status === 'complete' || value.status === 'cancelled')
    ? value.status
    : undefined;
  const partialResults = 'partialResults' in value && isRawBenchmarkPartialResults(value.partialResults)
    ? value.partialResults
    : undefined;
  return {
    reports,
    reportTargetIDs,
    targets,
    ...(importedStatus === undefined ? {} : { status: importedStatus }),
    ...(partialResults === undefined ? {} : { partialResults }),
  };
}

function isBenchmarkTarget(value: unknown): value is BenchmarkTarget {
  if (typeof value !== 'object' || value === null) return false;
  const target = value as Partial<Record<keyof BenchmarkTarget, unknown>>;
  return isIntegerWithin(target.id, 1, Number.MAX_SAFE_INTEGER)
    && isAllowed(target.preset, ['quick', 'standard', 'custom'])
    && isAllowed(target.profile, ['all', 'uniform', 'heterogeneous'])
    && isAllowed(target.phase, ['both', 'baseline', 'mutations'])
    && isAllowed(target.library, ['all', ...libraries])
    && isAllowed(target.baselineMode, ['all', 'fixed', 'estimated', 'automatic'])
    && isAllowed(target.mutationMode, ['all', 'estimated', 'automatic'])
    && isAllowed(target.operation, ['all', 'insert', 'move', 'remove', 'resize'])
    && isAllowed(target.location, ['all', 'start', 'middle', 'end'])
    && isIntegerWithin(target.rows, 2, 1_000_000)
    && isIntegerWithin(target.baselineRounds, 1, 50)
    && isIntegerWithin(target.warmupScrolls, 0, 100)
    && isIntegerWithin(target.scrollSamples, 1, 200)
    && isIntegerWithin(target.mutationRounds, 1, 50)
    && isIntegerWithin(target.mutationSamples, 1, 50);
}

function isAllowed(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === 'string' && allowed.includes(value);
}

function isIntegerWithin(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function isRawBenchmarkReport(value: unknown): value is RawBenchmarkReport {
  return typeof value === 'object' && value !== null
    && 'benchmark' in value && typeof value.benchmark === 'string'
    && 'conditions' in value && typeof value.conditions === 'object' && value.conditions !== null
    && 'runs' in value && typeof value.runs === 'object' && value.runs !== null;
}

function isRawBenchmarkPartialResults(value: unknown): value is RawBenchmarkPartialResults {
  return typeof value === 'object' && value !== null
    && (!('baselineResults' in value) || Array.isArray(value.baselineResults))
    && (!('baselineFailures' in value) || Array.isArray(value.baselineFailures))
    && (!('mutationResults' in value) || Array.isArray(value.mutationResults))
    && (!('rowProfileConditions' in value) || (typeof value.rowProfileConditions === 'object' && value.rowProfileConditions !== null))
    && (!('run' in value) || (typeof value.run === 'object' && value.run !== null))
    && (!('baselineSamples' in value) || (typeof value.baselineSamples === 'object' && value.baselineSamples !== null));
}

function isRunnerMessage(value: unknown): value is RunnerMessage {
  return typeof value === 'object' && value !== null
    && (value as { channel?: unknown }).channel === 'sectile-virtual-benchmark'
    && typeof (value as { type?: unknown }).type === 'string';
}
</script>

<template>
  <!--
    THESIS: Benchmark work is a controlled run, not a growing data table; this surface keeps measurement quiet and reveals evidence only at checkpoints.
    OWN-WORLD: Sectile technical paper, ink hierarchy, violet actions, ruled panels, compact reusable controls, and measurement numerals.
    STORY: Configure one condition or the full matrix, watch bounded progress, inspect completed comparisons, then copy, download, or import the raw report.
    FIRST VIEWPORT: A compact workspace bar leads directly into dense configuration controls; running replaces them with one progress field and four cumulative counters.
    FORM: Dedicated benchmark workspace, user-pinned; no concept seed.
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
  -->
  <main class="benchmark-lab" :data-state="status">
    <header class="benchmark-workspace-bar">
      <div class="benchmark-workspace-bar__primary">
        <a :href="docsHref" class="benchmark-lab__back"><ArrowLeft :size="15" aria-hidden="true" /><span>{{ copy.back }}</span></a>
        <span class="benchmark-workspace-bar__divider" aria-hidden="true" />
        <h1>{{ copy.title }}</h1>
      </div>
      <a :href="localeHref" class="benchmark-locale" :hreflang="isKorean ? 'en' : 'ko'">
        <Languages :size="15" aria-hidden="true" />{{ copy.language }}
      </a>
    </header>

    <div class="benchmark-workspace">
      <section v-if="status === 'idle'" class="benchmark-config" aria-labelledby="benchmark-config-title">
        <header class="benchmark-config__heading">
          <div class="benchmark-config__title">
            <h2 id="benchmark-config-title">{{ copy.configure }}</h2>
            <output>{{ copy.targetCount(targets.length) }}</output>
          </div>

          <DemoPopover
            v-model="composerOpen"
            :title="copy.targetComposer"
            :submit="submitTarget"
            :cancel-label="copy.closeComposer"
            :submit-label="copy.addToQueue"
            align="end"
          >
            <template #trigger>
              <button type="button" class="benchmark-add-target">
                <Plus :size="16" aria-hidden="true" />{{ copy.addTarget }}
              </button>
            </template>

            <template #summary>{{ targetError }}</template>

            <VirtualBenchmarkTargetFields
              v-model:preset="preset"
              v-model:profile="profile"
              v-model:phase="phase"
              v-model:library="library"
              v-model:baseline-mode="baselineMode"
              v-model:mutation-mode="mutationMode"
              v-model:operation="operation"
              v-model:location="location"
              v-model:rows="rows"
              v-model:baseline-rounds="baselineRounds"
              v-model:warmup-scrolls="warmupScrolls"
              v-model:scroll-samples="scrollSamples"
              v-model:mutation-rounds="mutationRounds"
              v-model:mutation-samples="mutationSamples"
              :copy="copy"
              :preset-options="presetOptions"
              :profile-options="profileOptions"
              :phase-options="phaseOptions"
              :library-options="libraryOptions"
              :baseline-mode-options="baselineModeOptions"
              :mutation-mode-options="mutationModeOptions"
              :operation-options="operationOptions"
              :location-options="locationOptions"
            />
          </DemoPopover>
        </header>

        <ol v-if="targets.length > 0" class="benchmark-targets">
          <li v-for="(target, index) in targets" :key="target.id" class="benchmark-target">
            <div class="benchmark-target__index">{{ index + 1 }}</div>
            <div class="benchmark-target__body">
              <strong>{{ copy.target(index + 1) }}</strong>
              <p>{{ targetSummary(target) }}</p>
              <dl class="benchmark-target__facets">
                <div><dt>{{ copy.preset }}</dt><dd>{{ selectionLabel(target.preset) }}</dd></div>
                <div><dt>{{ copy.profile }}</dt><dd>{{ selectionLabel(target.profile) }}</dd></div>
                <div><dt>{{ copy.phase }}</dt><dd>{{ selectionLabel(target.phase) }}</dd></div>
                <div v-if="target.phase !== 'mutations'"><dt>{{ copy.baselineMode }}</dt><dd>{{ selectionLabel(target.baselineMode) }}</dd></div>
                <div v-if="target.phase !== 'baseline'"><dt>{{ copy.mutationMode }}</dt><dd>{{ selectionLabel(target.mutationMode) }}</dd></div>
                <div v-if="target.phase !== 'baseline'"><dt>{{ copy.operation }}</dt><dd>{{ selectionLabel(target.operation) }}</dd></div>
                <div v-if="target.phase !== 'baseline'"><dt>{{ copy.location }}</dt><dd>{{ selectionLabel(target.location) }}</dd></div>
              </dl>
            </div>
            <div class="benchmark-target__actions">
              <DemoPopover
                :model-value="editingTargetID === target.id"
                :title="copy.editTargetTitle(index + 1)"
                :submit="() => submitTargetEdit(target.id)"
                :cancel-label="copy.closeComposer"
                :submit-label="copy.saveTarget"
                align="end"
                @update:model-value="updateTargetEditor(target, $event)"
              >
                <template #trigger>
                  <button type="button" class="benchmark-target__edit">
                    <Pencil :size="14" aria-hidden="true" />{{ copy.editTarget }}
                  </button>
                </template>

                <template #summary>{{ targetError }}</template>

                <VirtualBenchmarkTargetFields
                  v-model:preset="preset"
                  v-model:profile="profile"
                  v-model:phase="phase"
                  v-model:library="library"
                  v-model:baseline-mode="baselineMode"
                  v-model:mutation-mode="mutationMode"
                  v-model:operation="operation"
                  v-model:location="location"
                  v-model:rows="rows"
                  v-model:baseline-rounds="baselineRounds"
                  v-model:warmup-scrolls="warmupScrolls"
                  v-model:scroll-samples="scrollSamples"
                  v-model:mutation-rounds="mutationRounds"
                  v-model:mutation-samples="mutationSamples"
                  :copy="copy"
                  :preset-options="presetOptions"
                  :profile-options="profileOptions"
                  :phase-options="phaseOptions"
                  :library-options="libraryOptions"
                  :baseline-mode-options="baselineModeOptions"
                  :mutation-mode-options="mutationModeOptions"
                  :operation-options="operationOptions"
                  :location-options="locationOptions"
                />
              </DemoPopover>
              <button type="button" class="benchmark-target__remove" :aria-label="copy.removeTarget" @click="removeTarget(target.id)">
                <Trash2 :size="15" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ol>
        <div v-else class="benchmark-targets-empty">
          <strong>{{ copy.emptyTargets }}</strong>
          <span>{{ copy.emptyTargetsHint }}</span>
        </div>

        <p v-if="errorMessage" class="benchmark-config__error" role="alert">{{ errorMessage }}</p>

        <section class="benchmark-plan-summary" aria-labelledby="benchmark-plan-summary-title">
          <header>
            <h3 id="benchmark-plan-summary-title">{{ copy.planTitle }}</h3>
            <p>{{ copy.durationNote }}</p>
          </header>
          <dl>
            <div><dt>{{ copy.profileRuns }}</dt><dd>{{ copy.number(planSummary.profileRuns) }}</dd></div>
            <div><dt>{{ copy.baselineConditions }}</dt><dd>{{ copy.number(planSummary.baselineConditions) }}</dd></div>
            <div><dt>{{ copy.mutationConditions }}</dt><dd>{{ copy.number(planSummary.mutationConditions) }}</dd></div>
            <div><dt>{{ copy.plannedSamples }}</dt><dd>{{ copy.number(planSummary.maximumSamples) }}</dd></div>
            <div class="benchmark-plan-summary__duration"><dt>{{ copy.estimatedDuration }}</dt><dd>{{ planDurationLabel }}</dd></div>
          </dl>
        </section>

        <footer class="benchmark-config__actions">
          <DocsButton as="label" large>
            <Upload :size="16" aria-hidden="true" />{{ copy.importJson }}
            <input class="benchmark-file-input" type="file" accept="application/json,.json" @change="importRawJson" />
          </DocsButton>
          <DocsButton large appearance="primary" :disabled="targets.length === 0" @click="startRun">
            <Gauge :size="17" aria-hidden="true" />{{ copy.run }}
          </DocsButton>
        </footer>
      </section>

      <div v-else-if="showRunWorkspace" class="benchmark-running-stack">
        <section class="benchmark-running" aria-labelledby="benchmark-running-title">
          <header>
            <div class="benchmark-running__status">
              <h2 id="benchmark-running-title">{{ runWorkspaceTitle }}</h2>
              <p :title="isRunning && progressMessage !== copy.running ? progressMessage : undefined">
                {{ runWorkspaceMessage }}
              </p>
            </div>
            <DocsButton v-if="isRunning" large @click="cancelRun">
              <X :size="16" aria-hidden="true" />{{ copy.cancel }}
            </DocsButton>
            <div v-else class="benchmark-running__actions">
              <DocsButton v-if="status === 'cancelled'" large @click="status = 'idle'">
                <RotateCcw :size="16" aria-hidden="true" />{{ copy.rerun }}
              </DocsButton>
              <DocsButton v-if="resultGroups.length > 0" large appearance="primary" @click="viewingResults = true">
                {{ copy.viewResults }}
              </DocsButton>
            </div>
          </header>
          <DemoProgress
            :value="overallProgress"
            :max="100"
            :label="copy.progress"
            :detail="copy.targetProgress(activeTargetPosition, targets.length)"
          />
          <div class="benchmark-library-totals" aria-live="polite">
            <table>
              <thead>
                <tr>
                  <th scope="col">{{ copy.accumulatedMetric }}</th>
                  <th v-for="total in libraryTotals" :key="total.library" scope="col">{{ total.library }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{{ copy.completedBaseline }}</th>
                  <td v-for="total in libraryTotals" :key="total.library">{{ total.baseline }}</td>
                </tr>
                <tr>
                  <th scope="row">{{ copy.completedMutations }}</th>
                  <td v-for="total in libraryTotals" :key="total.library">{{ total.mutations }}</td>
                </tr>
                <tr>
                  <th scope="row">{{ copy.totalSamples }}</th>
                  <td v-for="total in libraryTotals" :key="total.library">{{ total.samples }}</td>
                </tr>
                <tr>
                  <th scope="row">{{ copy.failures }}</th>
                  <td v-for="total in libraryTotals" :key="total.library" :class="{ 'is-critical': total.failures > 0 }">
                    {{ total.failures }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="benchmark-checkpoints" aria-labelledby="benchmark-checkpoints-title" aria-live="polite">
          <header>
            <h2 id="benchmark-checkpoints-title">{{ copy.checkpointTitle }}</h2>
            <p>{{ copy.checkpointDescription }}</p>
          </header>

          <div v-if="latestCheckpoint !== undefined" class="benchmark-checkpoints__body">
            <article class="benchmark-checkpoint-latest">
              <header>
                <span>{{ copy.latestCheckpoint }}</span>
                <strong :data-outcome="latestCheckpoint.outcome">{{ checkpointOutcome(latestCheckpoint) }}</strong>
              </header>
              <h3>{{ latestCheckpoint.library ?? selectionLabel(latestCheckpoint.phase) }}</h3>
              <p>{{ copy.target(latestCheckpoint.targetPosition) }}</p>
              <dl class="benchmark-checkpoint-latest__conditions">
                <div><dt>{{ copy.phase }}</dt><dd>{{ selectionLabel(latestCheckpoint.phase) }}</dd></div>
                <div><dt>{{ copy.profile }}</dt><dd>{{ selectionLabel(latestCheckpoint.profile) }}</dd></div>
                <div><dt>{{ latestCheckpoint.phase === 'mutations' ? copy.mutationMode : copy.baselineMode }}</dt><dd>{{ latestCheckpoint.mode === undefined ? '—' : selectionLabel(latestCheckpoint.mode) }}</dd></div>
                <div v-if="latestCheckpoint.operation !== undefined"><dt>{{ copy.operation }}</dt><dd>{{ selectionLabel(latestCheckpoint.operation) }}</dd></div>
                <div v-if="latestCheckpoint.location !== undefined"><dt>{{ copy.location }}</dt><dd>{{ selectionLabel(latestCheckpoint.location) }}</dd></div>
              </dl>
              <dl class="benchmark-checkpoint-latest__metrics">
                <div><dt>{{ copy.median }}</dt><dd>{{ milliseconds(latestCheckpoint.medianMs) }}</dd></div>
                <div><dt>{{ copy.p95 }}</dt><dd>{{ milliseconds(latestCheckpoint.p95Ms) }}</dd></div>
              </dl>
            </article>

            <section class="benchmark-checkpoint-history">
              <h3>{{ copy.recentCheckpoints }}</h3>
              <DemoVirtualList
                v-if="checkpoints.length > 0"
                ref="checkpointHistoryList"
                class="benchmark-checkpoint-history__list"
                :items="checkpoints"
                :get-key="checkpointKey"
                :item-size="46"
                :gap="6"
              >
                <template #default="{ value: checkpoint }">
                  <div class="benchmark-checkpoint-history__item">
                    <span>
                      <strong>{{ checkpointHeading(checkpoint) }}</strong>
                      <small>{{ checkpointContext(checkpoint) }}</small>
                    </span>
                    <em :data-outcome="checkpoint.outcome">{{ checkpointOutcome(checkpoint) }}</em>
                  </div>
                </template>
              </DemoVirtualList>
              <p v-else>{{ copy.nextCheckpointWaiting }}</p>
            </section>
          </div>

          <div v-else class="benchmark-checkpoints-empty">
            <strong>{{ copy.checkpointWaiting }}</strong>
            <span>{{ copy.checkpointWaitingHint }}</span>
          </div>
        </section>
      </div>

      <section v-else-if="status === 'error'" class="benchmark-state benchmark-state--error" role="alert">
      <X :size="22" aria-hidden="true" />
      <div><h2>{{ copy.failed }}</h2><p>{{ errorMessage }}</p></div>
      <DocsButton large class="benchmark-state__action" @click="status = 'idle'">{{ copy.rerun }}</DocsButton>
      </section>

      <section v-else class="benchmark-results" aria-labelledby="benchmark-results-title">
      <header class="benchmark-results__heading">
        <div>
          <h2 id="benchmark-results-title">{{ copy.resultTitle }}</h2>
          <p>{{ status === 'cancelled' ? copy.cancelled : copy.resultDescription }}</p>
        </div>
        <DocsButton large @click="status = 'idle'">
          <RotateCcw :size="16" aria-hidden="true" />{{ copy.rerun }}
        </DocsButton>
      </header>

      <div v-if="resultGroups.length > 0" class="benchmark-result-groups">
        <section v-for="(group, index) in resultGroups" :key="group.target?.id ?? `imported-${index}`" class="benchmark-result-group">
          <header v-if="group.target !== null">
            <strong>{{ copy.target(targets.findIndex((target) => target.id === group.target?.id) + 1) }}</strong>
            <span>{{ targetSummary(group.target) }}</span>
          </header>
          <VirtualBenchmarkReport
            :key="resultSelection(group)"
            :baseline-results="group.baselineResults"
            :baseline-failures="group.baselineFailures"
            :mutation-results="group.mutationResults"
            :row-profile-conditions="group.rowProfileConditions"
            :default-selection="resultSelection(group)"
            :show-heading="false"
            :show-criteria="false"
          />
        </section>
      </div>

      <section class="benchmark-raw" aria-labelledby="benchmark-raw-title">
        <header>
          <div><h3 id="benchmark-raw-title">{{ copy.rawTitle }}</h3><p>{{ copy.rawDescription }}</p></div>
          <div class="benchmark-raw__actions">
            <DocsButton large @click="copyRawJson">
              <Copy :size="15" aria-hidden="true" />{{ copy.copyJson }}
            </DocsButton>
            <DocsButton large @click="downloadRawJson">
              <Download :size="15" aria-hidden="true" />{{ copy.downloadJson }}
            </DocsButton>
            <DocsButton as="label" large>
              <Upload :size="15" aria-hidden="true" />{{ copy.importJson }}
              <input class="benchmark-file-input" type="file" accept="application/json,.json" @change="importRawJson" />
            </DocsButton>
          </div>
        </header>
        <p v-if="feedback" class="benchmark-raw__feedback"><Check :size="14" aria-hidden="true" />{{ feedback }}</p>
        <details>
          <summary>JSON · {{ rawByteSize.toLocaleString() }} bytes</summary>
          <pre>{{ rawJson }}</pre>
        </details>
      </section>
      </section>
    </div>

    <iframe
      v-if="runnerSource"
      :key="runnerKey"
      ref="runnerFrame"
      :src="runnerSource"
      class="benchmark-runner-frame"
      title="Isolated virtualization benchmark runner"
      aria-hidden="true"
    />
  </main>
</template>

<style scoped>
.benchmark-lab {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  color: var(--sectile-content-primary);
  background: var(--sectile-canvas);
}

.benchmark-workspace-bar {
  position: sticky;
  z-index: 30;
  top: 0;
  display: flex;
  min-height: 3.5rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--sectile-border-subtle);
  padding: 0 clamp(1rem, 2.5vw, 2rem);
  background: color-mix(in srgb, var(--sectile-canvas) 94%, transparent);
  backdrop-filter: blur(12px);
}

.benchmark-workspace-bar__primary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: .75rem;
}

.benchmark-workspace-bar__divider {
  width: 1px;
  height: 1.15rem;
  background: var(--sectile-border-subtle);
}

.benchmark-workspace-bar h1 {
  overflow: hidden;
  margin: 0;
  font-size: .92rem;
  font-weight: 750;
  letter-spacing: -.01em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benchmark-workspace {
  display: flex;
  width: min(96rem, 100%);
  min-width: 0;
  flex: 1;
  margin-inline: auto;
  padding: clamp(1rem, 2.5vw, 2rem);
}

.benchmark-config,
.benchmark-running,
.benchmark-results,
.benchmark-state {
  width: 100%;
}

.benchmark-config {
  flex: 1;
  flex-direction: column;
}

.benchmark-lab__back {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: .4rem;
  color: var(--sectile-content-secondary);
  font-size: .75rem;
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
}

.benchmark-lab__back:hover { color: var(--sectile-action); }

.benchmark-locale {
  display: inline-flex;
  min-height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  gap: .4rem;
  border: 1px solid var(--sectile-border-control);
  border-radius: .5rem;
  padding: 0 .65rem;
  color: var(--sectile-content-secondary);
  background: var(--sectile-surface);
  font-size: .74rem;
  font-weight: 700;
  text-decoration: none;
}

.benchmark-locale:hover { color: var(--sectile-content-primary); background: var(--sectile-surface-hover); }
.benchmark-locale:active { background: var(--sectile-surface-selected); }

.benchmark-lab__back:focus-visible,
.benchmark-locale:focus-visible {
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 2px;
}

.benchmark-lab h1,
.benchmark-lab h2,
.benchmark-lab h3,
.benchmark-lab p { margin: 0; }

.benchmark-config,
.benchmark-running,
.benchmark-results,
.benchmark-state {
  border: 1px solid var(--sectile-border-subtle);
  border-radius: .8rem;
  padding: clamp(1rem, 2vw, 1.5rem);
  background: var(--sectile-surface);
}

.benchmark-config { display: flex; }

.benchmark-config > header,
.benchmark-running > header,
.benchmark-results__heading,
.benchmark-raw > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}

.benchmark-config > header h2,
.benchmark-running > header h2,
.benchmark-results__heading h2 {
  font-size: 1rem;
  line-height: 1.35;
}

.benchmark-config__heading output {
  color: var(--sectile-content-secondary);
  font-size: .76rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.benchmark-config__title {
  display: flex;
  align-items: baseline;
  gap: .6rem;
}

.benchmark-config__heading { align-items: center !important; }

.benchmark-config > header p,
.benchmark-running > header p,
.benchmark-results__heading p,
.benchmark-raw header p {
  max-width: 68ch;
  margin-top: .35rem;
  color: var(--sectile-content-secondary);
  font-size: .82rem;
  line-height: 1.55;
}

.benchmark-targets {
  display: grid;
  gap: .65rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.benchmark-target {
  display: grid;
  min-width: 0;
  grid-template-columns: 1.75rem minmax(0, 1fr) auto;
  align-items: start;
  gap: .75rem;
  border: 1px solid var(--sectile-border-subtle);
  border-radius: .65rem;
  padding: .9rem;
  background: var(--sectile-surface);
  box-shadow: 0 4px 14px rgb(20 27 45 / .06);
}

.benchmark-target__index {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  place-items: center;
  border: 1px solid var(--sectile-border-control);
  border-radius: .45rem;
  color: var(--sectile-content-secondary);
  font-size: .7rem;
  font-variant-numeric: tabular-nums;
  font-weight: 750;
}

.benchmark-target__body {
  display: grid;
  min-width: 0;
  gap: .25rem;
}

.benchmark-target__body strong { font-size: .82rem; line-height: 1.4; }
.benchmark-target__body p { color: var(--sectile-content-secondary); font-size: .76rem; line-height: 1.45; }

.benchmark-target__facets {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: .45rem 1rem;
  margin: .45rem 0 0;
}

.benchmark-target__facets > div {
  display: grid;
  min-width: 0;
  gap: .12rem;
}

.benchmark-target__facets dt {
  color: var(--sectile-content-tertiary);
  font-size: .64rem;
  font-weight: 650;
}

.benchmark-target__facets dd {
  margin: 0;
  color: var(--sectile-content-secondary);
  font-size: .7rem;
  font-weight: 680;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.benchmark-target__actions {
  display: flex;
  align-items: center;
  gap: .25rem;
}

.benchmark-target__edit,
.benchmark-target__remove {
  min-height: 2.25rem;
  border: 0;
  border-radius: .5rem;
  padding: 0;
  color: var(--sectile-content-tertiary);
  background: transparent;
  cursor: pointer;
}

.benchmark-target__edit {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  padding-inline: .55rem;
  font: inherit;
  font-size: .68rem;
  font-weight: 700;
}

.benchmark-target__remove {
  display: grid;
  width: 2.25rem;
  place-items: center;
}

.benchmark-target__edit:hover { color: var(--sectile-content-primary); background: var(--sectile-surface-hover); }
.benchmark-target__edit:active { background: var(--sectile-surface-selected); }
.benchmark-target__remove:hover { color: var(--sectile-feedback-critical); background: var(--sectile-surface-hover); }
.benchmark-target__remove:active { background: var(--sectile-surface-selected); }
.benchmark-target__edit:focus-visible,
.benchmark-target__remove:focus-visible { outline: 2px solid var(--sectile-focus-ring); outline-offset: 2px; }

.benchmark-targets-empty {
  display: grid;
  min-height: 7.5rem;
  place-content: center;
  gap: .3rem;
  margin-top: 1rem;
  color: var(--sectile-content-secondary);
  text-align: center;
}

.benchmark-targets-empty strong { color: var(--sectile-content-primary); font-size: .82rem; }
.benchmark-targets-empty span { font-size: .74rem; }

.benchmark-add-target {
  display: inline-flex;
  min-height: 2.5rem;
  flex: 0 0 auto;
  align-items: center;
  gap: .45rem;
  margin: 0;
  border: 1px dashed var(--sectile-border-control);
  border-radius: .6rem;
  padding: .5rem .75rem;
  color: var(--sectile-content-secondary);
  background: transparent;
  font: inherit;
  font-size: .76rem;
  font-weight: 700;
  cursor: pointer;
}

.benchmark-add-target:hover { color: var(--sectile-content-primary); background: var(--sectile-surface-hover); }
.benchmark-add-target:active { background: var(--sectile-surface-selected); }
.benchmark-add-target:focus-visible { outline: 2px solid var(--sectile-focus-ring); outline-offset: 2px; }

.benchmark-config__error {
  margin-top: .85rem !important;
  color: var(--sectile-feedback-critical);
  font-size: .74rem;
  font-weight: 680;
  line-height: 1.45;
}

.benchmark-plan-summary {
  display: grid;
  gap: .75rem;
  margin-top: auto;
  padding-top: 1.25rem;
}

.benchmark-plan-summary > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.benchmark-plan-summary h3 {
  flex: 0 0 auto;
  font-size: .78rem;
  line-height: 1.35;
}

.benchmark-plan-summary > header p {
  color: var(--sectile-content-tertiary);
  font-size: .68rem;
  line-height: 1.4;
  text-align: right;
}

.benchmark-plan-summary dl {
  display: grid;
  overflow: hidden;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  border: 1px solid var(--sectile-border-subtle);
  border-radius: .65rem;
  background: var(--sectile-border-subtle);
}

.benchmark-plan-summary dl > div {
  display: grid;
  min-width: 0;
  gap: .25rem;
  padding: .75rem .85rem;
  background: var(--sectile-surface);
}

.benchmark-plan-summary dt {
  color: var(--sectile-content-tertiary);
  font-size: .64rem;
  font-weight: 650;
  line-height: 1.35;
}

.benchmark-plan-summary dd {
  margin: 0;
  color: var(--sectile-content-primary);
  font-size: .86rem;
  font-variant-numeric: tabular-nums;
  font-weight: 750;
  line-height: 1.35;
}

.benchmark-plan-summary__duration dd { color: var(--sectile-action); }

.benchmark-config__actions,
.benchmark-raw__actions {
  display: flex;
  flex-wrap: wrap;
  gap: .65rem;
}

.benchmark-config__actions {
  justify-content: space-between;
  margin-top: 1.25rem;
}

.benchmark-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.benchmark-running {
  display: grid;
  flex: 0 0 auto;
  gap: 2rem;
}

.benchmark-running__status {
  min-width: 0;
  flex: 1;
}

.benchmark-running__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: .65rem;
}

.benchmark-running__status > p {
  overflow: hidden;
  min-height: 1.55em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benchmark-running-stack {
  display: flex;
  width: 100%;
  height: calc(100dvh - 3.5rem - 2 * clamp(1rem, 2.5vw, 2rem));
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 1rem;
}

.benchmark-library-totals {
  overflow-x: auto;
  min-width: 0;
  border-block: 1px solid var(--sectile-border-subtle);
  scrollbar-color: var(--sectile-border-control) transparent;
  scrollbar-width: thin;
}

.benchmark-library-totals table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  color: var(--sectile-content-secondary);
  font-variant-numeric: tabular-nums;
}

.benchmark-library-totals thead {
  border-bottom: 1px solid var(--sectile-border-strong);
  background: var(--sectile-surface-subtle);
}

.benchmark-library-totals th,
.benchmark-library-totals td {
  min-width: 7.75rem;
  border-left: 1px solid var(--sectile-border-subtle);
  padding: .42rem .6rem;
  text-align: right;
  white-space: nowrap;
}

.benchmark-library-totals th:first-child,
.benchmark-library-totals td:first-child {
  position: sticky;
  z-index: 1;
  left: 0;
  min-width: 7rem;
  border-left: 0;
  background: var(--sectile-surface);
  text-align: left;
}

.benchmark-library-totals thead th {
  padding-block: .55rem;
  color: var(--sectile-content-secondary);
  font-size: .61rem;
  font-weight: 760;
  line-height: 1.3;
}

.benchmark-library-totals thead th:first-child { background: var(--sectile-surface-subtle); }

.benchmark-library-totals tbody th {
  color: var(--sectile-content-secondary);
  font-size: .61rem;
  font-weight: 650;
}

.benchmark-library-totals tbody td {
  color: var(--sectile-content-primary);
  font-size: .72rem;
  font-weight: 740;
}

.benchmark-library-totals tbody tr + tr { border-top: 1px solid var(--sectile-border-subtle); }
.benchmark-library-totals td.is-critical { color: var(--sectile-feedback-critical); }

.benchmark-checkpoints {
  display: grid;
  overflow: hidden;
  min-width: 0;
  min-height: 22rem;
  flex: 1;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
  border: 1px solid var(--sectile-border-subtle);
  border-radius: .8rem;
  padding: clamp(1rem, 2vw, 1.5rem);
  background: var(--sectile-surface);
}

.benchmark-checkpoints > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.benchmark-checkpoints > header h2 {
  font-size: 1rem;
  line-height: 1.35;
}

.benchmark-checkpoints > header p {
  color: var(--sectile-content-tertiary);
  font-size: .72rem;
  line-height: 1.4;
  text-align: right;
}

.benchmark-checkpoints__body {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(0, .9fr) minmax(22rem, 1.1fr);
  gap: 1rem;
}

.benchmark-checkpoint-latest,
.benchmark-checkpoint-history {
  min-width: 0;
  min-height: 12rem;
  border: 1px solid var(--sectile-border-subtle);
  border-radius: .7rem;
  padding: 1rem;
  background: var(--sectile-surface);
  box-shadow: 0 4px 14px rgb(20 27 45 / .06);
}

.benchmark-checkpoints__body > .benchmark-checkpoint-latest,
.benchmark-checkpoints__body > .benchmark-checkpoint-history { height: 100%; }

.benchmark-checkpoint-latest {
  display: grid;
  align-content: start;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  gap: .55rem;
}

.benchmark-checkpoint-latest > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.benchmark-checkpoint-latest > header span,
.benchmark-checkpoint-history > h3 {
  color: var(--sectile-content-tertiary);
  font-size: .66rem;
  font-weight: 700;
  line-height: 1.35;
}

.benchmark-checkpoint-latest > header strong,
.benchmark-checkpoint-history em {
  border-radius: 999px;
  padding: .2rem .45rem;
  color: var(--sectile-content-secondary);
  background: var(--sectile-surface-subtle);
  font-size: .62rem;
  font-style: normal;
  font-weight: 750;
  line-height: 1.3;
}

.benchmark-checkpoint-latest > header strong[data-outcome='complete'],
.benchmark-checkpoint-history em[data-outcome='complete'] { color: var(--sectile-feedback-success); }
.benchmark-checkpoint-latest > header strong[data-outcome='failed'],
.benchmark-checkpoint-history em[data-outcome='failed'] { color: var(--sectile-feedback-critical); }

.benchmark-checkpoint-latest > h3 {
  overflow: hidden;
  margin-top: .25rem;
  font-size: .9rem;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benchmark-checkpoint-latest > p {
  overflow: hidden;
  color: var(--sectile-content-secondary);
  font-size: .72rem;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benchmark-checkpoint-latest__conditions,
.benchmark-checkpoint-latest__metrics {
  display: grid;
  gap: .5rem;
  margin: 0;
}

.benchmark-checkpoint-latest__conditions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  padding-top: .75rem;
}

.benchmark-checkpoint-latest__metrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-self: end;
  padding-top: 1rem;
  border-top: 1px solid var(--sectile-border-subtle);
}

.benchmark-checkpoint-latest dl > div { display: grid; min-width: 0; gap: .2rem; }
.benchmark-checkpoint-latest dt { color: var(--sectile-content-tertiary); font-size: .62rem; }
.benchmark-checkpoint-latest dd { overflow: hidden; margin: 0; font-size: .78rem; font-variant-numeric: tabular-nums; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }

.benchmark-checkpoint-history {
  display: grid;
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr);
  gap: .65rem;
}

.benchmark-checkpoint-history__list {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  scrollbar-color: var(--sectile-border-control) transparent;
  scrollbar-width: thin;
}

.benchmark-checkpoint-history__item {
  display: flex;
  box-sizing: border-box;
  height: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  border-radius: .45rem;
  padding: .35rem .45rem;
  background: var(--sectile-surface-subtle);
}

.benchmark-checkpoint-history__item > span { display: grid; min-width: 0; gap: .08rem; }
.benchmark-checkpoint-history__item strong,
.benchmark-checkpoint-history__item small { overflow: hidden; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.benchmark-checkpoint-history__item strong { font-size: .7rem; }
.benchmark-checkpoint-history__item small { color: var(--sectile-content-secondary); font-size: .62rem; }
.benchmark-checkpoint-history em { flex: 0 0 auto; }
.benchmark-checkpoint-history > p { color: var(--sectile-content-tertiary); font-size: .7rem; }

.benchmark-checkpoints-empty {
  display: grid;
  min-height: 100%;
  place-content: center;
  gap: .3rem;
  border: 1px dashed var(--sectile-border-control);
  border-radius: .7rem;
  color: var(--sectile-content-secondary);
  text-align: center;
}

.benchmark-checkpoints-empty strong { color: var(--sectile-content-primary); font-size: .8rem; }
.benchmark-checkpoints-empty span { font-size: .7rem; }

.benchmark-results { display: grid; min-width: 0; gap: 2.5rem; }
.benchmark-results :deep(.virtual-benchmark-report) { margin-top: 0; }

.benchmark-result-groups { display: grid; min-width: 0; gap: 2.25rem; }
.benchmark-result-group { display: grid; min-width: 0; gap: 1rem; }
.benchmark-result-group + .benchmark-result-group { padding-top: 2rem; border-top: 1px solid var(--sectile-border-strong); }
.benchmark-result-group > header { display: grid; min-width: 0; gap: .2rem; }
.benchmark-result-group > header strong { font-size: .86rem; }
.benchmark-result-group > header span { overflow: hidden; color: var(--sectile-content-secondary); font-size: .74rem; text-overflow: ellipsis; white-space: nowrap; }

.benchmark-raw {
  display: grid;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--sectile-border-strong);
}

.benchmark-raw__feedback {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  color: var(--sectile-feedback-success);
  font-size: .76rem;
  font-weight: 700;
}

.benchmark-raw details {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid var(--sectile-border-subtle);
  border-radius: .75rem;
  background: var(--sectile-surface);
}

.benchmark-raw summary {
  padding: .9rem 1rem;
  color: var(--sectile-content-secondary);
  font-size: .74rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  cursor: pointer;
}

.benchmark-raw pre {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  max-height: 34rem;
  overflow: auto;
  margin: 0;
  border-top: 1px solid var(--sectile-border-subtle);
  padding: 1rem;
  color: var(--sectile-content-primary);
  background: var(--sectile-surface-subtle);
  font: .72rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre;
}

.benchmark-state {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 1rem;
}

.benchmark-state--error > svg,
.benchmark-state--error h2 { color: var(--sectile-feedback-critical); }
.benchmark-state p { margin-top: .4rem; color: var(--sectile-content-secondary); }

.benchmark-runner-frame {
  position: fixed;
  top: 0;
  left: -200vw;
  width: 720px;
  height: 480px;
  border: 0;
  pointer-events: none;
}

@media (max-width: 620px) {
  .benchmark-workspace-bar { padding-inline: .75rem; }
  .benchmark-workspace { padding: .75rem; }
  .benchmark-lab__back span { display: none; }
  .benchmark-workspace-bar__primary { gap: .55rem; }
  .benchmark-workspace-bar h1 { font-size: .86rem; }
  .benchmark-config > header,
  .benchmark-running > header,
  .benchmark-results__heading,
  .benchmark-raw > header { display: grid; gap: 1rem; }
  .benchmark-config > .benchmark-config__heading { display: flex; gap: 1rem; }
  .benchmark-target { grid-template-columns: 1.75rem minmax(0, 1fr); }
  .benchmark-target__actions { grid-column: 2; justify-content: flex-end; }
  .benchmark-target__body p { white-space: normal; }
  .benchmark-plan-summary > header { display: grid; gap: .3rem; }
  .benchmark-plan-summary > header p { text-align: left; }
  .benchmark-plan-summary dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .benchmark-plan-summary__duration { grid-column: 1 / -1; }
  .benchmark-running-stack {
    height: auto;
    min-height: calc(100dvh - 5rem);
  }
  .benchmark-checkpoints > header { display: grid; gap: .3rem; }
  .benchmark-checkpoints > header p { text-align: left; }
  .benchmark-checkpoints__body { grid-template-columns: minmax(0, 1fr); }
  .benchmark-checkpoint-history__list { height: 18rem; }
  .benchmark-checkpoint-latest dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .benchmark-state { grid-template-columns: auto minmax(0, 1fr); }
  .benchmark-state__action { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; }
}
</style>
