<script setup lang="ts">
import { computed } from 'vue';
import {
  AlertTriangle,
  ArrowRight,
  Cable,
  Database,
  GitCommitHorizontal,
  Layers3,
  ListChecks,
  MousePointer2,
  SlidersHorizontal,
} from '@lucide/vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();

const copy = computed(() => isKorean.value ? {
  aria: '모델, 현재 상태, 사건과 정책을 받아 다음 상태 또는 오류와 순서 있는 명령을 계산하는 Core 상태 전이',
  title: 'Core는 효과를 실행하지 않고 결과를 계산합니다',
  summary: '현재 상태와 의미 사건을 넘기면, 순수한 전이가 다음 상태와 실행 환경에 요청할 명령을 반환합니다.',
  inputs: '전이가 읽는 값',
  model: '모델', modelDetail: '항목의 관계와 유효한 값', modelExample: 'Sequence · Range · Grid · Tree',
  state: '현재 상태', stateDetail: '상호작용이 기억하는 사실', stateExample: 'Cursor · Selection · Expansion · Text',
  event: '의미 사건', eventDetail: '사용자가 의도한 변화', eventExample: 'Move · Select · Expand · Edit',
  policy: '정책', policyDetail: '허용 조건과 경계 동작', policyExample: 'Eligibility · Boundary · Activation',
  transition: '결정적 상태 전이', transitionTraits: '같은 입력 · 같은 결과 · 외부 효과 없음',
  result: '전이가 돌려주는 결과',
  nextState: '다음 상태', nextStateDetail: '새 불변 스냅샷',
  commands: '순서 있는 명령', commandsDetail: '포커스 · 스크롤 · 알림 · 실행',
  failure: '형식이 있는 오류', failureDetail: '실패하면 원래 상태와 빈 명령을 유지',
  example: '한 번의 입력',
  currentExample: 'current = item:2', eventExampleValue: 'event = move-next',
  nextExample: 'current = item:3', commandExample: 'focus(item:3)',
  boundary: 'Core의 경계',
  boundaryDetail: '명령은 데이터입니다. 호스트가 명령을 실행하고 다음 사건을 다시 Core에 전달합니다.',
  hosts: '@sectile/dom · @sectile/terminal · @sectile/vue',
} : {
  aria: 'A Core transition reads a model, current state, event, and policies, then computes the next state or a typed error and ordered commands',
  title: 'Core calculates results without running effects',
  summary: 'Give a pure transition the current state and a semantic event; it returns the next state and commands for a host to interpret.',
  inputs: 'Values read by the transition',
  model: 'Model', modelDetail: 'Item relationships and valid values', modelExample: 'Sequence · Range · Grid · Tree',
  state: 'Current state', stateDetail: 'Facts remembered by the interaction', stateExample: 'Cursor · Selection · Expansion · Text',
  event: 'Semantic event', eventDetail: 'The change the user intends', eventExample: 'Move · Select · Expand · Edit',
  policy: 'Policies', policyDetail: 'Eligibility and boundary behavior', policyExample: 'Eligibility · Boundary · Activation',
  transition: 'Deterministic transition', transitionTraits: 'same input · same result · no external effects',
  result: 'Values returned by the transition',
  nextState: 'Next state', nextStateDetail: 'A new immutable snapshot',
  commands: 'Ordered commands', commandsDetail: 'focus · scroll · announce · activate',
  failure: 'Typed failure', failureDetail: 'A failure preserves the old state and empty commands',
  example: 'One input trace',
  currentExample: 'current = item:2', eventExampleValue: 'event = move-next',
  nextExample: 'current = item:3', commandExample: 'focus(item:3)',
  boundary: 'Core boundary',
  boundaryDetail: 'Commands are data. A host executes them and sends the next semantic event back to Core.',
  hosts: '@sectile/dom · @sectile/terminal · @sectile/vue',
});

const inputs = computed(() => [
  { label: copy.value.model, detail: copy.value.modelDetail, example: copy.value.modelExample, icon: Layers3 },
  { label: copy.value.state, detail: copy.value.stateDetail, example: copy.value.stateExample, icon: Database },
  { label: copy.value.event, detail: copy.value.eventDetail, example: copy.value.eventExample, icon: MousePointer2 },
  { label: copy.value.policy, detail: copy.value.policyDetail, example: copy.value.policyExample, icon: SlidersHorizontal },
]);

const results = computed(() => [
  { label: copy.value.nextState, detail: copy.value.nextStateDetail, icon: Database, kind: 'state' },
  { label: copy.value.commands, detail: copy.value.commandsDetail, icon: ListChecks, kind: 'commands' },
  { label: copy.value.failure, detail: copy.value.failureDetail, icon: AlertTriangle, kind: 'failure' },
]);
</script>

<template>
  <figure class="theory-overview" role="img" :aria-label="copy.aria">
    <figcaption>
      <strong>{{ copy.title }}</strong>
      <span>{{ copy.summary }}</span>
    </figcaption>

    <div class="theory-overview__flow">
      <section class="theory-overview__inputs">
        <header>{{ copy.inputs }}</header>
        <dl>
          <div v-for="input in inputs" :key="input.label">
            <dt><component :is="input.icon" :size="17" aria-hidden="true" /><strong>{{ input.label }}</strong></dt>
            <dd><span>{{ input.detail }}</span><code>{{ input.example }}</code></dd>
          </div>
        </dl>
      </section>

      <div class="theory-overview__operator">
        <GitCommitHorizontal :size="21" aria-hidden="true" />
        <code>applyEvent</code>
        <strong>{{ copy.transition }}</strong>
        <span>{{ copy.transitionTraits }}</span>
      </div>

      <section class="theory-overview__results">
        <header>{{ copy.result }}</header>
        <div
          v-for="item in results"
          :key="item.label"
          :class="['theory-overview__result', `theory-overview__result--${item.kind}`]"
        >
          <component :is="item.icon" :size="17" aria-hidden="true" />
          <span><strong>{{ item.label }}</strong><span>{{ item.detail }}</span></span>
        </div>
      </section>
    </div>

    <section class="theory-overview__trace">
      <strong>{{ copy.example }}</strong>
      <div>
        <code>{{ copy.currentExample }}</code>
        <span>+</span>
        <code>{{ copy.eventExampleValue }}</code>
        <ArrowRight :size="17" aria-hidden="true" />
        <code>{{ copy.nextExample }}</code>
        <span>+</span>
        <code>{{ copy.commandExample }}</code>
      </div>
    </section>

    <section class="theory-overview__boundary">
      <Cable :size="20" aria-hidden="true" />
      <span><strong>{{ copy.boundary }}</strong><span>{{ copy.boundaryDetail }}</span></span>
      <code>{{ copy.hosts }}</code>
    </section>
  </figure>
</template>
