<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, BadgeCheck, Gauge, Search, Shapes, Workflow } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();

const copy = computed(() => isKorean.value ? {
  aria: 'Core 공개 명세를 값, 연산, 관찰, 법칙, 실패와 비용의 여섯 기준으로 읽는 방법',
  title: '공개 계약은 여섯 질문에 답합니다',
  summary: '구현 방식이 달라도 이 여섯 답이 같으면 외부에서 같은 모델로 관찰할 수 있습니다.',
  surface: '사용자가 다루는 표면',
  guarantees: '구현이 지켜야 할 경계',
  models: '어떤 값이 유효한가?', modelsLabel: '값', modelsDetail: '상태와 모델의 형태, 식별자와 허용 범위를 정의합니다.',
  operations: '무엇을 할 수 있는가?', operationsLabel: '연산', operationsDetail: '생성과 조회, 사건에 따른 상태 전이를 정의합니다.',
  observations: '밖에서 무엇을 볼 수 있는가?', observationsLabel: '관찰', observationsDetail: '상태, 명령, 조회 결과처럼 검증 가능한 결과를 정합니다.',
  laws: '항상 무엇이 참이어야 하는가?', lawsLabel: '법칙', lawsDetail: '모든 유효한 값과 전이가 지켜야 할 불변 조건입니다.',
  errors: '무엇이 왜 실패하는가?', errorsLabel: '실패', errorsDetail: '잘못된 입력과 정상적인 결과 없음은 서로 다른 값으로 구분합니다.',
  costs: '자원을 얼마나 쓰는가?', costsLabel: '비용', costsDetail: '시간, 메모리와 입력 크기의 상한도 계약에 포함합니다.',
} : {
  aria: 'Read a Core public specification through six questions about values, operations, observations, laws, failures, and costs',
  title: 'A public contract answers six questions',
  summary: 'Two implementations are observably equivalent when these six answers remain the same.',
  surface: 'Surface available to consumers',
  guarantees: 'Boundaries the implementation must keep',
  models: 'Which values are valid?', modelsLabel: 'Values', modelsDetail: 'Defines state and model shapes, identity, and allowed ranges.',
  operations: 'What can be done?', operationsLabel: 'Operations', operationsDetail: 'Defines construction, queries, and event-driven transitions.',
  observations: 'What can a consumer observe?', observationsLabel: 'Observations', observationsDetail: 'Names verifiable state, commands, and query results.',
  laws: 'What must always remain true?', lawsLabel: 'Laws', lawsDetail: 'States the invariants for every valid value and transition.',
  errors: 'What can fail, and why?', errorsLabel: 'Failures', errorsDetail: 'Keeps invalid input distinct from an ordinary absent result.',
  costs: 'How much resource may it use?', costsLabel: 'Costs', costsDetail: 'Makes time, memory, and input ceilings part of the contract.',
});

const groups = computed(() => [
  {
    label: copy.value.surface,
    items: [
      { question: copy.value.models, label: copy.value.modelsLabel, detail: copy.value.modelsDetail, icon: Shapes },
      { question: copy.value.operations, label: copy.value.operationsLabel, detail: copy.value.operationsDetail, icon: Workflow },
      { question: copy.value.observations, label: copy.value.observationsLabel, detail: copy.value.observationsDetail, icon: Search },
    ],
  },
  {
    label: copy.value.guarantees,
    items: [
      { question: copy.value.laws, label: copy.value.lawsLabel, detail: copy.value.lawsDetail, icon: BadgeCheck },
      { question: copy.value.errors, label: copy.value.errorsLabel, detail: copy.value.errorsDetail, icon: AlertTriangle },
      { question: copy.value.costs, label: copy.value.costsLabel, detail: copy.value.costsDetail, icon: Gauge },
    ],
  },
]);
</script>

<template>
  <figure class="theory-contract" role="img" :aria-label="copy.aria">
    <figcaption>
      <strong>{{ copy.title }}</strong>
      <span>{{ copy.summary }}</span>
    </figcaption>
    <div class="theory-contract__groups">
      <section v-for="group in groups" :key="group.label">
        <header>{{ group.label }}</header>
        <dl>
          <div v-for="item in group.items" :key="item.label">
            <dt>
              <component :is="item.icon" :size="18" aria-hidden="true" />
              <span><small>{{ item.label }}</small><strong>{{ item.question }}</strong></span>
            </dt>
            <dd>{{ item.detail }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </figure>
</template>
