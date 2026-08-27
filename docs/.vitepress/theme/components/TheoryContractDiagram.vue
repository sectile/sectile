<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, BadgeCheck, Gauge, Search, Shapes, Workflow } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  aria: '코어 명세에서 값이 연산을 거쳐 관찰 결과가 되고 법칙, 오류, 비용이 모든 단계를 제한하는 구조',
  models: '상태로 쓸 수 있는 값', modelsDetail: '값의 모양과 허용 범위를 먼저 정합니다.',
  operations: '값을 바꾸는 방법', operationsDetail: '사건을 받아 다음 상태와 명령을 계산합니다.',
  observations: '밖에서 확인할 결과', observationsDetail: '상태, 명령, 조회값으로 동작을 검증합니다.',
  laws: '항상 지킬 조건', lawsDetail: '어떤 유효한 상태에서도 같은 규칙을 지킵니다.',
  errors: '실패를 나누는 기준', errorsDetail: '입력 형식 오류와 빈 조회 결과를 서로 다른 종류로 표시합니다.',
  costs: '계산에 쓸 자원', costsDetail: '시간과 메모리의 최대 사용량을 함께 정합니다.',
  constraints: '세 단계에 모두 적용되는 기준',
} : {
  aria: 'Core specification values flow through operations into observations while laws, errors, and costs constrain every stage',
  models: 'Valid values', modelsDetail: 'sorts · models', operations: 'Operations', operationsDetail: 'construction · transitions',
  observations: 'Observations', observationsDetail: 'state · commands · queries',
  laws: 'Laws', lawsDetail: 'hold for every valid transition', errors: 'Errors', errorsDetail: 'separate invalid input from absence',
  costs: 'Costs', costsDetail: 'time and memory limits are contractual', constraints: 'Cross-cutting contract for every stage',
});
</script>

<template>
  <figure class="theory-contract" role="img" :aria-label="copy.aria">
    <ol class="theory-contract__flow">
      <li><section><Shapes :size="19" aria-hidden="true" /><div><small>1</small><strong>{{ copy.models }}</strong><span>{{ copy.modelsDetail }}</span></div></section></li>
      <li><section><Workflow :size="19" aria-hidden="true" /><div><small>2</small><strong>{{ copy.operations }}</strong><span>{{ copy.operationsDetail }}</span></div></section></li>
      <li><section><Search :size="19" aria-hidden="true" /><div><small>3</small><strong>{{ copy.observations }}</strong><span>{{ copy.observationsDetail }}</span></div></section></li>
    </ol>
    <figcaption><span>{{ copy.constraints }}</span></figcaption>
    <div class="theory-contract__constraints">
      <section><BadgeCheck :size="17" aria-hidden="true" /><strong>{{ copy.laws }}</strong><span>{{ copy.lawsDetail }}</span></section>
      <section><AlertTriangle :size="17" aria-hidden="true" /><strong>{{ copy.errors }}</strong><span>{{ copy.errorsDetail }}</span></section>
      <section><Gauge :size="17" aria-hidden="true" /><strong>{{ copy.costs }}</strong><span>{{ copy.costsDetail }}</span></section>
    </div>
  </figure>
</template>
