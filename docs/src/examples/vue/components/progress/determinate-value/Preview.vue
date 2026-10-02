<script setup lang="ts">
import { ref } from 'vue';
import { ProgressIndicator, ProgressRoot, ProgressTrack } from '@sectile/vue/progress';
const completed = ref(25);
</script>

<template>
  <div data-example-range><ProgressRoot :value="completed" :max="100" label="Upload progress"><ProgressTrack><ProgressIndicator /></ProgressTrack></ProgressRoot><div data-example-control-row><button type="button" :disabled="completed === 100" @click="completed = Math.min(100, completed + 25)">Advance upload</button><button type="button" @click="completed = 0">Restart</button></div><output aria-live="polite">Uploaded: {{ completed }}%</output><p>This demonstration advances manually; no file is uploaded.</p></div>
</template>
