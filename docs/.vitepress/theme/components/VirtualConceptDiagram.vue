<script setup lang="ts">
import { computed } from 'vue';
import { Box, Database, Maximize2, Rows3, ScanSearch, Waypoints } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  aria: '가상화의 ID, 크기, 배치 입력이 배치 결과와 화면 출력으로 이어지고 자료 적재는 분리되는 흐름',
  identity: 'ID와 순서', identityValue: 'Core Sequence',
  extent: '동적 크기 근거', extentValue: 'Virtual ExtentIndex',
  geometry: '배치 조건', geometryValue: '간격 · 축 · 열 · 좌표',
  strategy: '배치 방식', strategyValue: '선형 · 트랙 격자 · 벽돌형 · 자유 배치',
  plan: '배치 결과', planValue: 'VirtualLayoutPlan',
  output: '화면 출력', outputValue: '현재 그릴 항목과 좌표만 전달',
  loading: '자료 적재는 별도 흐름', window: 'Core CollectionWindow', windowValue: '비동기 적재 범위와 요청 차수 관리',
} : {
  aria: 'Virtual identity, extents, and geometry flow into a layout plan while data loading stays separate',
  identity: 'Identity and order', identityValue: 'Core Sequence',
  extent: 'Dynamic extent evidence', extentValue: 'Virtual ExtentIndex',
  geometry: 'Layout conditions', geometryValue: 'gap · axis · lanes · coordinates',
  strategy: 'Layout strategy', strategyValue: 'linear · track grid · masonry · spatial',
  plan: 'Layout result', planValue: 'VirtualLayoutPlan',
  output: 'Host renderer', outputValue: 'receives only current placements and coordinates',
  loading: 'Data loading stays separate', window: 'Core CollectionWindow', windowValue: 'owns async loaded ranges and request generations',
});
</script>

<template>
  <figure class="virtual-contract" role="img" :aria-label="copy.aria">
    <div class="virtual-contract__main">
      <section class="virtual-contract__inputs">
        <div><Waypoints :size="18" aria-hidden="true" /><span><strong>{{ copy.identity }}</strong><small>{{ copy.identityValue }}</small></span></div>
        <div><Maximize2 :size="18" aria-hidden="true" /><span><strong>{{ copy.extent }}</strong><small>{{ copy.extentValue }}</small></span></div>
        <div><Rows3 :size="18" aria-hidden="true" /><span><strong>{{ copy.geometry }}</strong><small>{{ copy.geometryValue }}</small></span></div>
      </section>

      <div class="diagram-connector diagram-connector--horizontal" aria-hidden="true"><i /></div>

      <section class="virtual-contract__strategy">
        <ScanSearch :size="20" aria-hidden="true" />
        <strong>{{ copy.strategy }}</strong>
        <span>{{ copy.strategyValue }}</span>
      </section>

      <div class="diagram-connector diagram-connector--horizontal" aria-hidden="true"><i /></div>

      <section class="virtual-contract__plan">
        <Box :size="20" aria-hidden="true" />
        <strong>{{ copy.plan }}</strong>
        <code>{{ copy.planValue }}</code>
      </section>

      <div class="diagram-connector diagram-connector--horizontal" aria-hidden="true"><i /></div>

      <section class="virtual-contract__output">
        <strong>{{ copy.output }}</strong>
        <span>{{ copy.outputValue }}</span>
      </section>
    </div>

    <figcaption class="virtual-contract__loading">
      <Database :size="18" aria-hidden="true" />
      <span><strong>{{ copy.loading }}</strong><code>{{ copy.window }}</code><small>{{ copy.windowValue }}</small></span>
    </figcaption>
  </figure>
</template>
