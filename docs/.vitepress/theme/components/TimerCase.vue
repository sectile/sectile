<script setup lang="ts">
import { CheckCircle2, Pause, Play, RotateCcw } from '@lucide/vue';
import { computed, ref } from 'vue';
import { NumberField } from '@sectile/vue/number-field';
import {
  TimerActionTrigger,
  TimerArea,
  TimerControl,
  TimerItem,
  TimerRoot,
  TimerSeparator,
} from '@sectile/vue/timer';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly title: string;
  readonly description: string;
  readonly countdown?: boolean;
  readonly startMs?: number;
  readonly targetMs?: number;
  readonly autoStart?: boolean;
}>(), {
  countdown: false,
  startMs: 0,
  autoStart: false,
});

type TimerMode = 'stopwatch' | 'countdown' | 'target';

const mode = computed<TimerMode>(() => props.countdown ? 'countdown' : props.targetMs === undefined ? 'stopwatch' : 'target');
const initialDurationMs = computed(() => mode.value === 'countdown' ? props.startMs : props.targetMs ?? 0);
const activeDurationMs = ref(initialDurationMs.value);
const draftMinutes = ref(String(Math.floor(initialDurationMs.value / 60_000)));
const draftSeconds = ref(String(Math.floor(initialDurationMs.value / 1_000) % 60));
const autoStartOnMount = ref(props.autoStart);
const timerKey = ref(0);
const revision = ref(0);
const valueMs = ref(mode.value === 'countdown' ? activeDurationMs.value : 0);
const completed = ref(false);
const entries = ref<EventEntry[]>([]);

const state = computed(() => ({
  mode: mode.value,
  durationMs: activeDurationMs.value,
  valueMs: Math.floor(valueMs.value),
  completed: completed.value,
}));
const targetBinding = computed(() => mode.value === 'target' ? { targetMs: activeDurationMs.value } : {});
const code = computed(() => `<TimerRoot${mode.value === 'countdown' ? ' countdown' : ''}${mode.value === 'target' ? ' :target-ms="targetMs"' : ''}>…</TimerRoot>`);

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function normalizeDuration(): number {
  const parsedMinutes = Number(draftMinutes.value);
  const parsedSeconds = Number(draftSeconds.value);
  const minutes = Number.isFinite(parsedMinutes) ? Math.max(0, Math.floor(parsedMinutes)) : 0;
  const seconds = Number.isFinite(parsedSeconds) ? Math.max(0, Math.floor(parsedSeconds)) : 0;
  const totalSeconds = Math.min(5_999, Math.max(1, (minutes * 60) + seconds));
  draftMinutes.value = String(Math.floor(totalSeconds / 60));
  draftSeconds.value = String(totalSeconds % 60);
  return totalSeconds * 1_000;
}

function applyDuration(): void {
  activeDurationMs.value = normalizeDuration();
  valueMs.value = mode.value === 'countdown' ? activeDurationMs.value : 0;
  completed.value = false;
  autoStartOnMount.value = true;
  timerKey.value += 1;
  note('apply-duration', ['timer-restarted']);
}

function tick(next: number): void {
  valueMs.value = next;
  revision.value += 1;
}

function complete(next: number): void {
  valueMs.value = next;
  completed.value = true;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'complete',
    accepted: true,
    effects: ['timer-completed'],
  }, ...entries.value].slice(0, 12);
}

function note(action: string, effects: readonly string[] = []): void {
  completed.value = false;
  entries.value = [{
    revision: revision.value,
    event: action,
    accepted: true,
    effects,
  }, ...entries.value].slice(0, 12);
}

function isPristine(liveValueMs: number): boolean {
  return mode.value === 'countdown'
    ? liveValueMs >= activeDurationMs.value
    : liveValueMs <= 0;
}
</script>

<template>
  <DemoCard
    :title="title"
    :revision="revision"
    :state="state"
    :entries="entries"
    interaction="enabled"
    :code="code"
  >
    <TimerRoot
      :key="timerKey"
      v-slot="{ running, completed: timerCompleted, progress, valueMs: liveValueMs }"
      class="timer-demo"
      :countdown="countdown"
      :start-ms="countdown ? activeDurationMs : 0"
      :auto-start="autoStartOnMount"
      :interval-ms="100"
      v-bind="targetBinding"
      @tick="tick"
      @complete="complete"
    >
      <div class="timer-heading">
        <div>
          <strong>{{ mode === 'stopwatch' ? 'Elapsed time' : mode === 'countdown' ? 'Focus session' : 'Target timer' }}</strong>
          <span v-if="mode === 'stopwatch'">Session timer</span>
          <span v-else>{{ mode === 'countdown' ? 'Duration' : 'Goal' }} {{ formatDuration(activeDurationMs) }}</span>
        </div>
        <span
          class="timer-status"
          :data-state="timerCompleted ? 'complete' : running ? 'running' : 'idle'"
        >
          {{ timerCompleted ? (mode === 'countdown' ? 'Session complete' : 'Target reached') : running ? 'Running' : isPristine(liveValueMs) ? 'Ready' : 'Paused' }}
        </span>
      </div>

      <form
        v-if="mode !== 'stopwatch'"
        class="timer-setting"
        @submit.prevent="applyDuration"
      >
        <fieldset>
          <legend>{{ mode === 'countdown' ? 'Session length' : 'Target time' }}</legend>
          <label>
            <span>Minutes</span>
            <NumberField v-model="draftMinutes" :policies="{ min: '0', max: '99' }" label="Minutes" />
          </label>
          <span aria-hidden="true">:</span>
          <label>
            <span>Seconds</span>
            <NumberField v-model="draftSeconds" :policies="{ min: '0', max: '59' }" label="Seconds" />
          </label>
        </fieldset>
        <button type="submit" class="secondary">
          Apply &amp; start
        </button>
      </form>

      <TimerArea class="timer-area">
        <TimerItem type="minutes" />
        <TimerSeparator>:</TimerSeparator>
        <TimerItem type="seconds" />
      </TimerArea>

      <template v-if="mode !== 'stopwatch'">
        <div class="timer-progress-meta">
          <span>{{ mode === 'countdown' ? 'Session progress' : 'Target progress' }}</span>
          <strong>{{ Math.round(progress ?? 0) }}%</strong>
        </div>
        <div class="timer-progress" aria-hidden="true">
          <span :style="{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }" />
        </div>
      </template>

      <p
        v-if="timerCompleted"
        class="timer-feedback timer-feedback--complete"
        role="status"
      >
        <CheckCircle2 :size="17" aria-hidden="true" />
        {{ mode === 'countdown' ? 'Focus session finished.' : `Target of ${formatDuration(activeDurationMs)} reached.` }}
      </p>

      <TimerControl class="timer-controls">
        <TimerActionTrigger
          v-if="timerCompleted"
          key="restart"
          action="restart"
          class="timer-primary"
          @click="note('restart')"
        >
          <RotateCcw :size="16" aria-hidden="true" />
          Run again
        </TimerActionTrigger>
        <TimerActionTrigger
          v-else-if="running"
          key="pause"
          action="pause"
          class="secondary"
          @click="note('pause')"
        >
          <Pause :size="16" aria-hidden="true" />
          Pause
        </TimerActionTrigger>
        <TimerActionTrigger
          v-else-if="isPristine(liveValueMs)"
          key="start"
          action="start"
          class="timer-primary"
          @click="note('start')"
        >
          <Play :size="16" aria-hidden="true" />
          Start timer
        </TimerActionTrigger>
        <TimerActionTrigger
          v-else
          key="resume"
          action="resume"
          class="timer-primary"
          @click="note('resume')"
        >
          <Play :size="16" aria-hidden="true" />
          Resume
        </TimerActionTrigger>
        <TimerActionTrigger
          v-if="!isPristine(liveValueMs) || timerCompleted"
          key="reset"
          action="reset"
          class="timer-quiet"
          @click="note('reset')"
        >
          <RotateCcw :size="16" aria-hidden="true" />
          Reset
        </TimerActionTrigger>
      </TimerControl>
    </TimerRoot>
  </DemoCard>
</template>
