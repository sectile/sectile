<script setup lang="ts">
import { computed } from 'vue';
import { AppWindow, CalendarDays, Rows3, SquareTerminal, Workflow } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  aria: 'Sectile 패키지 책임 경계',
  core: '상호작용', coreRole: '사용자의 입력을 다음 상태와 실행 명령으로 바꿉니다.', coreExamples: '현재 항목 · 선택 · 편집 · 명령 순서',
  temporal: '날짜와 시각', temporalRole: '달력 날짜와 하루 안의 시각을 계산하고 선택 규칙을 적용합니다.', temporalExamples: '날짜 입력란 · 달력 · 날짜 선택기',
  virtual: '큰 화면의 배치', virtualRole: '수많은 항목의 크기와 위치를 관리하고 화면 영역에 맞는 배치 결과를 계산합니다.', virtualExamples: '목록 · 격자 · 카드 모음 · 자유 좌표',
  adapters: '계산 결과를 실제 화면과 입력에 연결',
  dom: '브라우저', domRole: '키보드와 포인터 입력, 포커스, 스크롤, 크기 측정',
  terminal: '터미널', terminalRole: '키 입력, 커서 이동, 문자 폭, 텍스트 출력',
  vue: 'Vue', vueRole: '반응형 상태, 슬롯, 컴포넌트 수명 주기',
} : {
  aria: 'Sectile package responsibility boundaries',
  core: 'Core', coreRole: 'Interaction state and rules', coreExamples: 'selection · cursor · editing · commands',
  temporal: 'Temporal', temporalRole: 'Civil dates and wall-clock time', temporalExamples: 'date fields · calendars · pickers',
  virtual: 'Virtual', virtualRole: 'Layout state and viewport plans for large, dynamic surfaces', virtualExamples: 'linear · grid · masonry · spatial',
  adapters: 'Connect calculated results to real input and output',
  dom: 'Browser', domRole: 'keyboard and pointer input, focus, scrolling, measurement',
  terminal: 'Terminal', terminalRole: 'keys, cursor movement, character width, text output',
  vue: 'Vue', vueRole: 'reactive state, slots, and component lifecycle',
});
</script>

<template>
  <figure class="package-boundary" :aria-label="copy.aria">
    <div class="package-boundary__domains">
      <section class="package-boundary__domain package-boundary__domain--core">
        <Workflow :size="20" aria-hidden="true" />
        <div class="package-boundary__identity">
          <strong>@sectile/core</strong>
          <h3>{{ copy.core }}</h3>
        </div>
        <div class="package-boundary__description">
          <p>{{ copy.coreRole }}</p>
          <span>{{ copy.coreExamples }}</span>
        </div>
      </section>
      <section class="package-boundary__domain package-boundary__domain--temporal">
        <CalendarDays :size="20" aria-hidden="true" />
        <div class="package-boundary__identity">
          <strong>@sectile/temporal</strong>
          <h3>{{ copy.temporal }}</h3>
        </div>
        <div class="package-boundary__description">
          <p>{{ copy.temporalRole }}</p>
          <span>{{ copy.temporalExamples }}</span>
        </div>
      </section>
      <section class="package-boundary__domain package-boundary__domain--virtual">
        <Rows3 :size="20" aria-hidden="true" />
        <div class="package-boundary__identity">
          <strong>@sectile/virtual</strong>
          <h3>{{ copy.virtual }}</h3>
        </div>
        <div class="package-boundary__description">
          <p>{{ copy.virtualRole }}</p>
          <span>{{ copy.virtualExamples }}</span>
        </div>
      </section>
    </div>
    <figcaption>{{ copy.adapters }}</figcaption>
    <div class="package-boundary__adapters">
      <section><AppWindow :size="19" aria-hidden="true" /><div><strong>{{ copy.dom }}</strong><span>{{ copy.domRole }}</span></div></section>
      <section><SquareTerminal :size="19" aria-hidden="true" /><div><strong>{{ copy.terminal }}</strong><span>{{ copy.terminalRole }}</span></div></section>
      <section><Workflow :size="19" aria-hidden="true" /><div><strong>{{ copy.vue }}</strong><span>{{ copy.vueRole }}</span></div></section>
    </div>
  </figure>
</template>
