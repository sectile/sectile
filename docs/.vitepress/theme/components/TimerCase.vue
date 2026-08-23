<script setup lang="ts">
import { computed, ref } from 'vue';
import { TimerActionTrigger, TimerArea, TimerControl, TimerItem, TimerRoot, TimerSeparator } from '@sectile/vue/timer';
import DemoCard from './DemoCard.vue'; import type { EventEntry } from '../types.js';
const props = withDefaults(defineProps<{ readonly title: string; readonly description: string; readonly countdown?: boolean; readonly startMs?: number; readonly targetMs?: number; readonly autoStart?: boolean }>(), { countdown: false, startMs: 0, autoStart: false });
const revision = ref(0); const valueMs = ref(props.startMs); const completed = ref(false); const entries = ref<EventEntry[]>([]); const state = computed(() => ({ valueMs: Math.floor(valueMs.value), countdown: props.countdown, completed: completed.value }));
const code = `<script setup lang="ts">
import { TimerActionTrigger, TimerArea, TimerItem, TimerRoot, TimerSeparator } from '@sectile/vue/timer'
<\/script>
<template>
  <TimerRoot countdown :start-ms="60_000" auto-start>
    <TimerArea><TimerItem type="minutes" /><TimerSeparator>:</TimerSeparator><TimerItem type="seconds" /></TimerArea>
    <TimerActionTrigger action="pause">Pause</TimerActionTrigger>
    <TimerActionTrigger action="restart">Restart</TimerActionTrigger>
  </TimerRoot>
</template>`;
function tick(next: number): void { valueMs.value = next; revision.value += 1; }
function complete(next: number): void { valueMs.value = next; completed.value = true; revision.value += 1; entries.value = [{ revision: revision.value, event: 'complete', accepted: true, effects: ['timer-completed'] }, ...entries.value].slice(0, 12); }
function note(action: string): void { completed.value = false; entries.value = [{ revision: revision.value, event: action, accepted: true, effects: [] }, ...entries.value].slice(0, 12); }
</script>
<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <TimerRoot class="timer-demo" :countdown="countdown" :start-ms="startMs" :auto-start="autoStart" :interval-ms="100" v-bind="targetMs === undefined ? {} : { targetMs }" @tick="tick" @complete="complete">
      <p class="demo-copy">{{ description }}</p>
      <TimerArea class="timer-area"><TimerItem type="minutes" /><TimerSeparator>:</TimerSeparator><TimerItem type="seconds" /></TimerArea>
      <TimerControl class="timer-controls"><TimerActionTrigger action="start" class="secondary" @click="note('start')">Start</TimerActionTrigger><TimerActionTrigger action="pause" class="secondary" @click="note('pause')">Pause</TimerActionTrigger><TimerActionTrigger action="reset" class="secondary" @click="note('reset')">Reset</TimerActionTrigger><TimerActionTrigger action="restart" class="secondary" @click="note('restart')">Restart</TimerActionTrigger></TimerControl>
    </TimerRoot>
  </DemoCard>
</template>
