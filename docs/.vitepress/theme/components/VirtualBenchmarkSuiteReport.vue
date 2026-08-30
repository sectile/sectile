<script setup lang="ts">
import { computed } from 'vue';
import { useDocsLocale } from '../locale.js';
import {
  layoutBaselineBenchmarkFailures,
  layoutBaselineBenchmarkResults,
  layoutMutationBenchmarkResults,
  type BenchmarkFamily,
} from '../virtual-benchmark-data.js';
import VirtualBenchmarkLayoutReport from './VirtualBenchmarkLayoutReport.vue';
import VirtualBenchmarkReport from './VirtualBenchmarkReport.vue';

type LayoutFamily = Exclude<BenchmarkFamily, 'list'>;

const { isKorean } = useDocsLocale();
const families: readonly LayoutFamily[] = Object.freeze(['flow-grid', 'masonry', 'track-grid', 'spatial']);
const copy = computed(() => isKorean.value ? {
  list: '목록',
  family: {
    'flow-grid': '흐름 격자',
    masonry: '메이슨리',
    'track-grid': '트랙 격자',
    spatial: '자유 좌표 배치',
  } as Record<LayoutFamily, string>,
} : {
  list: 'List',
  family: {
    'flow-grid': 'Flow grid',
    masonry: 'Masonry',
    'track-grid': 'Track grid',
    spatial: 'Spatial',
  } as Record<LayoutFamily, string>,
});
</script>

<template>
  <div class="benchmark-suite-report">
    <section>
      <h2>{{ copy.list }}</h2>
      <VirtualBenchmarkReport :show-heading="false" />
    </section>

    <section v-for="family in families" :key="family">
      <h2>{{ copy.family[family] }}</h2>
      <VirtualBenchmarkLayoutReport
        :baseline-results="layoutBaselineBenchmarkResults.filter((result) => result.family === family)"
        :baseline-failures="layoutBaselineBenchmarkFailures.filter((failure) => failure.family === family)"
        :mutation-results="layoutMutationBenchmarkResults.filter((result) => result.family === family)"
      />
    </section>
  </div>
</template>

<style scoped>
.benchmark-suite-report { display: grid; min-width: 0; gap: 48px; }
.benchmark-suite-report > section { min-width: 0; }
.benchmark-suite-report h2 { margin: 0 0 18px; }
</style>
