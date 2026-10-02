<script setup lang="ts">
import { ref } from 'vue';
import { MeterIndicator, MeterRoot, MeterTrack } from '@sectile/vue/meter';
const capacity = ref(40);
</script>

<template>
  <div data-example-range><MeterRoot v-slot="meter" :value="capacity" :min="0" :max="100" :low="50" :high="80" :optimum="20" label="Storage used"><MeterTrack><MeterIndicator /></MeterTrack><output aria-live="polite">Storage: {{ capacity }}% · {{ meter.zone }}</output></MeterRoot><div data-example-control-row><button type="button" @click="capacity = 40">40% used</button><button type="button" @click="capacity = 70">70% used</button><button type="button" @click="capacity = 90">90% used</button></div><p>Lower usage is preferable. The indicator and text change together at the configured thresholds.</p></div>
</template>
