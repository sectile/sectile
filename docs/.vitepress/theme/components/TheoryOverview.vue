<script setup lang="ts">
import { computed } from 'vue';
import {
  Cable,
  Check,
  Database,
  GitCommitHorizontal,
  Layers3,
  ListChecks,
  MousePointer2,
  ShieldCheck,
} from '@lucide/vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  aria: '코어 의미 모델이 상태 전이를 거쳐 동작과 명령으로 이어지는 흐름',
  ingredients: 'Core가 한 번의 입력을 처리하는 과정', inputsStage: '상태를 설명하는 값', structures: '항목의 관계', state: '기억할 값', policies: '판단 규칙',
  structuresDescription: '항목이 어떤 모양으로 이어지는지 정합니다.',
  stateDescription: '사용자가 지금 보고 고른 값을 저장합니다.',
  policiesDescription: '입력을 받아들일 조건과 이동 방법을 정합니다.',
  sequence: '한 줄 순서', range: '연속 범위', grid: '행과 열', tree: '부모와 자식', cursor: '현재 항목',
  selection: '고른 항목', expansion: '펼친 항목', text: '입력한 글자', eligibility: '입력 허용',
  boundary: '목록 끝 이동', activation: '항목 실행', parsing: '문자 해석', transition: '입력에 규칙 적용', rule: '아래 방향 이동 규칙',
  current: '현재 상태와 사건', currentDescription: '예: 두 번째 항목을 보고 있을 때 아래 방향키를 누름',
  result: '다음 상태와 명령 목록', resultDescription: '예: 세 번째 항목으로 이동하고 해당 요소에 포커스를 요청',
  guarantees: ['같은 입력에서 같은 결과', '현재 상태 원본 보존', '관련 변경을 한 번에 확정', '도착 순서가 어긋난 변경 식별'],
  outputsStage: '계산 결과', nextState: '다음 상태', nextStateItems: '현재 항목 · 선택 · 펼침 · 입력한 글자',
  commands: '실행할 명령', commandItems: '포커스 이동 · 스크롤 · 알림 · 항목 실행',
  projection: '실행 환경에 연결', projectionItems: 'DOM · 터미널 · Vue가 명령을 실제 동작으로 바꿈',
  examples: '이 과정을 조합하면 목록 상자, 슬라이더, 달력, 콤보박스, 계층 격자의 동작이 됩니다.',
} : {
  aria: 'Core semantic models flow through a transition into behavior and commands',
  ingredients: 'How Core processes one input', inputsStage: 'Values that describe the state', structures: 'Item relationships', state: 'Remembered values', policies: 'Decision rules',
  structuresDescription: 'Defines how items relate to one another.', stateDescription: 'Stores what the user is viewing and choosing.', policiesDescription: 'Defines accepted input and movement.',
  sequence: 'Ordered list', range: 'Continuous range', grid: 'Rows and columns', tree: 'Parent and child', cursor: 'Current item', selection: 'Selected items',
  expansion: 'Expanded items', text: 'Entered text', eligibility: 'Accepted input', boundary: 'Boundary movement', activation: 'Activation', parsing: 'Text parsing',
  transition: 'Apply rules to the input', rule: 'Arrow Down movement rule', current: 'Current state and event', currentDescription: 'Example: Arrow Down while the second item is current',
  result: 'Next state and command list', resultDescription: 'Example: move to the third item and request DOM focus',
  guarantees: ['Same input, same result', 'Keep the previous state intact', 'Commit the change once', 'Distinguish out-of-order updates'],
  outputsStage: 'Calculated result', nextState: 'Next state', nextStateItems: 'current item · selection · expansion · entered text',
  commands: 'Commands to run', commandItems: 'move focus · scroll · announce · activate',
  projection: 'Run in a host', projectionItems: 'DOM · terminal · Vue turn commands into host actions',
  examples: 'Combining these steps produces the behavior of a listbox, slider, calendar, combobox, or tree grid.',
});

const groups = computed(() => [
  { label: copy.value.structures, description: copy.value.structuresDescription, icon: Layers3, values: [copy.value.sequence, copy.value.range, copy.value.grid, copy.value.tree] },
  { label: copy.value.state, description: copy.value.stateDescription, icon: MousePointer2, values: [copy.value.cursor, copy.value.selection, copy.value.expansion, copy.value.text] },
  { label: copy.value.policies, description: copy.value.policiesDescription, icon: ShieldCheck, values: [copy.value.eligibility, copy.value.boundary, copy.value.activation, copy.value.parsing] },
]);
</script>

<template>
  <figure class="theory-diagram" role="img" :aria-label="copy.aria">
    <figcaption>{{ copy.ingredients }}</figcaption>

    <section class="theory-diagram__inputs">
      <h3 class="theory-diagram__stage-title"><span>1</span>{{ copy.inputsStage }}</h3>
      <div class="theory-diagram__groups">
        <div v-for="group in groups" :key="group.label" class="theory-diagram__group">
          <header><component :is="group.icon" :size="16" aria-hidden="true" /><strong>{{ group.label }}</strong></header>
          <p>{{ group.description }}</p>
          <ul><li v-for="value in group.values" :key="value">{{ value }}</li></ul>
        </div>
      </div>
    </section>

    <section class="theory-diagram__transition">
      <div class="theory-diagram__transition-label">
        <span>2</span>
        <GitCommitHorizontal :size="18" aria-hidden="true" />
        <strong>{{ copy.transition }}</strong>
      </div>
      <code>
        <span><small>{{ copy.current }}</small><strong>{{ copy.currentDescription }}</strong></span>
        <b>{{ copy.rule }}</b>
        <span><small>{{ copy.result }}</small><strong>{{ copy.resultDescription }}</strong></span>
      </code>
      <ul><li v-for="guarantee in copy.guarantees" :key="guarantee"><Check :size="13" aria-hidden="true" />{{ guarantee }}</li></ul>
    </section>

    <section class="theory-diagram__outputs">
      <h3 class="theory-diagram__stage-title"><span>3</span>{{ copy.outputsStage }}</h3>
      <div><Database :size="18" aria-hidden="true" /><strong>{{ copy.nextState }}</strong><span>{{ copy.nextStateItems }}</span></div>
      <div><ListChecks :size="18" aria-hidden="true" /><strong>{{ copy.commands }}</strong><span>{{ copy.commandItems }}</span></div>
    </section>

    <section class="theory-diagram__host">
      <span>4</span><Cable :size="18" aria-hidden="true" /><div><strong>{{ copy.projection }}</strong><span>{{ copy.projectionItems }}</span></div>
    </section>
    <p class="theory-diagram__examples">{{ copy.examples }}</p>
  </figure>
</template>
