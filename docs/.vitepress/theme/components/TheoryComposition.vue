<script setup lang="ts">
import { computed } from 'vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();
const rows = computed(() => isKorean.value ? [
  { component: '목록 상자', structure: '순서', state: '현재 위치 + 선택', policy: '사용 가능 여부 + 이동에 따른 선택' },
  { component: '슬라이더', structure: '범위', state: '단계값', policy: '증감 간격 + 큰 폭 이동' },
  { component: '달력', structure: '격자', state: '현재 위치 + 선택', policy: '날짜 계산 + 사용 가능 여부' },
  { component: '계층 보기', structure: '계층', state: '펼침 + 현재 위치 + 선택', policy: '보이는 항목 계산' },
  { component: '콤보박스', structure: '순서 | 격자 | 계층', state: '텍스트 + 팝업 + 현재 위치 + 선택', policy: '검색 + 확정' },
  { component: '계층 격자', structure: '계층 + 격자', state: '펼침 + 현재 위치 + 선택 + 편집 상태', policy: '행과 칸 연결' },
] as const : [
  { component: 'Listbox', structure: 'sequence', state: 'cursor + selection', policy: 'eligibility + selection follows focus' },
  { component: 'Slider', structure: 'range', state: 'tick', policy: 'increment + page step' },
  { component: 'Calendar', structure: 'grid', state: 'cursor + selection', policy: 'date arithmetic + eligibility' },
  { component: 'Tree view', structure: 'tree', state: 'expansion + cursor + selection', policy: 'visible projection' },
  { component: 'Combobox', structure: 'sequence | grid | tree', state: 'text + popup + cursor + selection', policy: 'filter + acceptance' },
  { component: 'Tree grid', structure: 'tree + grid', state: 'expansion + cursor + selection + edit mode', policy: 'row/cell mapping' },
] as const);
</script>

<template>
  <div class="composition-map">
    <article v-for="row in rows" :key="row.component" class="composition-map__item">
      <h3>{{ row.component }}</h3>
      <dl>
        <div><dt>{{ isKorean ? '구조' : 'Structure' }}</dt><dd>{{ row.structure }}</dd></div>
        <div><dt>{{ isKorean ? '상태' : 'State' }}</dt><dd>{{ row.state }}</dd></div>
        <div><dt>{{ isKorean ? '규칙' : 'Policy' }}</dt><dd>{{ row.policy }}</dd></div>
      </dl>
    </article>
  </div>
</template>
