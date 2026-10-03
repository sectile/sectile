<script setup lang="ts">
import { TimerActionTrigger, TimerControl, TimerItem, TimerRoot } from '@sectile/vue/timer';
</script>

<template>
  <div>
    <TimerRoot v-slot="timer" countdown :start-ms="10000" :target-ms="0" :interval-ms="100">
      <p data-example-timer-face>
        <TimerItem type="minutes" />
        :
        <TimerItem type="seconds" />
      </p>
      <TimerControl data-example-control-row>
        <TimerActionTrigger action="start">Start</TimerActionTrigger>
        <TimerActionTrigger action="pause">Pause</TimerActionTrigger>
        <TimerActionTrigger action="resume">Resume</TimerActionTrigger>
        <TimerActionTrigger action="reset">Reset</TimerActionTrigger>
      </TimerControl>
      <output aria-live="polite">
        {{ timer.completed ? 'Complete' : timer.running ? 'Running' : 'Paused' }}
      </output>
    </TimerRoot>
    <p>The countdown does not start automatically. Reset returns it to ten seconds.</p>
  </div>
</template>
