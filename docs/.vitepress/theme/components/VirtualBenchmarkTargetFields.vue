<script setup lang="ts">
import type {
  BenchmarkHeightMode,
  BenchmarkLocation,
  BenchmarkOperation,
  BenchmarkRowProfile,
} from '../virtual-benchmark-data.js';
import DemoFormField from './DemoFormField.vue';
import DemoSelect, { type DemoSelectOption } from './DemoSelect.vue';
import DemoSpinButton from './DemoSpinButton.vue';

type Preset = 'quick' | 'standard' | 'custom';
type ProfileSelection = BenchmarkRowProfile | 'all';
type PhaseSelection = 'both' | 'baseline' | 'mutations';
type LibrarySelection = string | 'all';
type HeightModeSelection = BenchmarkHeightMode | 'all';
type MutationModeSelection = Exclude<BenchmarkHeightMode, 'fixed'> | 'all';
type OperationSelection = BenchmarkOperation | 'all';
type LocationSelection = BenchmarkLocation | 'all';

interface BenchmarkTargetFieldCopy {
  readonly preset: string;
  readonly profile: string;
  readonly phase: string;
  readonly library: string;
  readonly baselineMode: string;
  readonly mutationMode: string;
  readonly operation: string;
  readonly location: string;
  readonly rows: string;
  readonly baselineRounds: string;
  readonly warmupScrolls: string;
  readonly scrollSamples: string;
  readonly mutationRounds: string;
  readonly mutationSamples: string;
  readonly rowsHelp: string;
  readonly baselineRoundsHelp: string;
  readonly warmupScrollsHelp: string;
  readonly scrollSamplesHelp: string;
  readonly mutationRoundsHelp: string;
  readonly mutationSamplesHelp: string;
  readonly minimum: string;
  readonly maximum: string;
  readonly number: (value: number) => string;
  readonly decrease: (label: string) => string;
  readonly increase: (label: string) => string;
  readonly help: (label: string) => string;
}

defineProps<{
  readonly copy: BenchmarkTargetFieldCopy;
  readonly presetOptions: readonly DemoSelectOption[];
  readonly profileOptions: readonly DemoSelectOption[];
  readonly phaseOptions: readonly DemoSelectOption[];
  readonly libraryOptions: readonly DemoSelectOption[];
  readonly baselineModeOptions: readonly DemoSelectOption[];
  readonly mutationModeOptions: readonly DemoSelectOption[];
  readonly operationOptions: readonly DemoSelectOption[];
  readonly locationOptions: readonly DemoSelectOption[];
}>();

const preset = defineModel<Preset>('preset', { required: true });
const profile = defineModel<ProfileSelection>('profile', { required: true });
const phase = defineModel<PhaseSelection>('phase', { required: true });
const library = defineModel<LibrarySelection>('library', { required: true });
const baselineMode = defineModel<HeightModeSelection>('baselineMode', { required: true });
const mutationMode = defineModel<MutationModeSelection>('mutationMode', { required: true });
const operation = defineModel<OperationSelection>('operation', { required: true });
const location = defineModel<LocationSelection>('location', { required: true });
const rows = defineModel<number>('rows', { required: true });
const baselineRounds = defineModel<number>('baselineRounds', { required: true });
const warmupScrolls = defineModel<number>('warmupScrolls', { required: true });
const scrollSamples = defineModel<number>('scrollSamples', { required: true });
const mutationRounds = defineModel<number>('mutationRounds', { required: true });
const mutationSamples = defineModel<number>('mutationSamples', { required: true });

function applyPreset(next: string | null): void {
  if (next !== 'quick' && next !== 'standard' && next !== 'custom') return;
  preset.value = next;
  if (next === 'quick') {
    rows.value = 10_000;
    baselineRounds.value = 1;
    warmupScrolls.value = 1;
    scrollSamples.value = 2;
    mutationRounds.value = 1;
    mutationSamples.value = 1;
  } else if (next === 'standard') {
    rows.value = 100_000;
    baselineRounds.value = 5;
    warmupScrolls.value = 5;
    scrollSamples.value = 20;
    mutationRounds.value = 5;
    mutationSamples.value = 10;
  }
}
</script>

<template>
  <div class="benchmark-target-fields__grid">
    <DemoFormField name="preset" :label="copy.preset">
      <DemoSelect :model-value="preset" :options="presetOptions" :label="copy.preset" @update:model-value="applyPreset" />
    </DemoFormField>
    <DemoFormField name="profile" :label="copy.profile">
      <DemoSelect v-model="profile" :options="profileOptions" :label="copy.profile" />
    </DemoFormField>
    <DemoFormField name="phase" :label="copy.phase">
      <DemoSelect v-model="phase" :options="phaseOptions" :label="copy.phase" />
    </DemoFormField>
    <DemoFormField name="library" :label="copy.library">
      <DemoSelect v-model="library" :options="libraryOptions" :label="copy.library" />
    </DemoFormField>
    <DemoFormField v-if="phase !== 'mutations'" name="baselineMode" :label="copy.baselineMode">
      <DemoSelect v-model="baselineMode" :options="baselineModeOptions" :label="copy.baselineMode" />
    </DemoFormField>
    <DemoFormField v-if="phase !== 'baseline'" name="mutationMode" :label="copy.mutationMode">
      <DemoSelect v-model="mutationMode" :options="mutationModeOptions" :label="copy.mutationMode" />
    </DemoFormField>
    <DemoFormField v-if="phase !== 'baseline'" name="operation" :label="copy.operation">
      <DemoSelect v-model="operation" :options="operationOptions" :label="copy.operation" />
    </DemoFormField>
    <DemoFormField v-if="phase !== 'baseline'" name="location" :label="copy.location">
      <DemoSelect v-model="location" :options="locationOptions" :label="copy.location" />
    </DemoFormField>
  </div>

  <div class="benchmark-target-fields__numbers">
    <DemoFormField
      name="rows"
      :label="copy.rows"
      :hint="copy.rowsHelp"
      :help-label="copy.help(copy.rows)"
      :minimum="copy.number(2)"
      :maximum="copy.number(1000000)"
      :minimum-label="copy.minimum"
      :maximum-label="copy.maximum"
      :readonly="preset !== 'custom'"
    >
      <DemoSpinButton v-model="rows" :label="copy.rows" :decrement-label="copy.decrease(copy.rows)" :increment-label="copy.increase(copy.rows)" :min="2" :max="1000000" :readonly="preset !== 'custom'" />
    </DemoFormField>
    <DemoFormField
      v-if="phase !== 'mutations'"
      name="baselineRounds"
      :label="copy.baselineRounds"
      :hint="copy.baselineRoundsHelp"
      :help-label="copy.help(copy.baselineRounds)"
      :minimum="copy.number(1)"
      :maximum="copy.number(50)"
      :minimum-label="copy.minimum"
      :maximum-label="copy.maximum"
      :readonly="preset !== 'custom'"
    >
      <DemoSpinButton v-model="baselineRounds" :label="copy.baselineRounds" :decrement-label="copy.decrease(copy.baselineRounds)" :increment-label="copy.increase(copy.baselineRounds)" :min="1" :max="50" :readonly="preset !== 'custom'" />
    </DemoFormField>
    <DemoFormField
      v-if="phase !== 'mutations'"
      name="warmupScrolls"
      :label="copy.warmupScrolls"
      :hint="copy.warmupScrollsHelp"
      :help-label="copy.help(copy.warmupScrolls)"
      :minimum="copy.number(0)"
      :maximum="copy.number(100)"
      :minimum-label="copy.minimum"
      :maximum-label="copy.maximum"
      :readonly="preset !== 'custom'"
    >
      <DemoSpinButton v-model="warmupScrolls" :label="copy.warmupScrolls" :decrement-label="copy.decrease(copy.warmupScrolls)" :increment-label="copy.increase(copy.warmupScrolls)" :min="0" :max="100" :readonly="preset !== 'custom'" />
    </DemoFormField>
    <DemoFormField
      v-if="phase !== 'mutations'"
      name="scrollSamples"
      :label="copy.scrollSamples"
      :hint="copy.scrollSamplesHelp"
      :help-label="copy.help(copy.scrollSamples)"
      :minimum="copy.number(1)"
      :maximum="copy.number(200)"
      :minimum-label="copy.minimum"
      :maximum-label="copy.maximum"
      :readonly="preset !== 'custom'"
    >
      <DemoSpinButton v-model="scrollSamples" :label="copy.scrollSamples" :decrement-label="copy.decrease(copy.scrollSamples)" :increment-label="copy.increase(copy.scrollSamples)" :min="1" :max="200" :readonly="preset !== 'custom'" />
    </DemoFormField>
    <DemoFormField
      v-if="phase !== 'baseline'"
      name="mutationRounds"
      :label="copy.mutationRounds"
      :hint="copy.mutationRoundsHelp"
      :help-label="copy.help(copy.mutationRounds)"
      :minimum="copy.number(1)"
      :maximum="copy.number(50)"
      :minimum-label="copy.minimum"
      :maximum-label="copy.maximum"
      :readonly="preset !== 'custom'"
    >
      <DemoSpinButton v-model="mutationRounds" :label="copy.mutationRounds" :decrement-label="copy.decrease(copy.mutationRounds)" :increment-label="copy.increase(copy.mutationRounds)" :min="1" :max="50" :readonly="preset !== 'custom'" />
    </DemoFormField>
    <DemoFormField
      v-if="phase !== 'baseline'"
      name="mutationSamples"
      :label="copy.mutationSamples"
      :hint="copy.mutationSamplesHelp"
      :help-label="copy.help(copy.mutationSamples)"
      :minimum="copy.number(1)"
      :maximum="copy.number(50)"
      :minimum-label="copy.minimum"
      :maximum-label="copy.maximum"
      :readonly="preset !== 'custom'"
    >
      <DemoSpinButton v-model="mutationSamples" :label="copy.mutationSamples" :decrement-label="copy.decrease(copy.mutationSamples)" :increment-label="copy.increase(copy.mutationSamples)" :min="1" :max="50" :readonly="preset !== 'custom'" />
    </DemoFormField>
  </div>
</template>

<style scoped>
.benchmark-target-fields__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.benchmark-target-fields__numbers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 16rem));
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--sectile-border-subtle);
}

@media (max-width: 980px) {
  .benchmark-target-fields__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .benchmark-target-fields__numbers { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 620px) {
  .benchmark-target-fields__grid,
  .benchmark-target-fields__numbers { grid-template-columns: minmax(0, 1fr); }
}
</style>
