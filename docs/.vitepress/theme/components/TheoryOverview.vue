<script setup lang="ts">
import { computed } from 'vue';
import { Boxes, Braces, Cable, GitCommitHorizontal, SlidersHorizontal } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  aria: 'Sectile 의미 조합 구조',
  ingredients: '의미를 이루는 요소', structures: '구조', state: '상태', policies: '규칙',
  sequence: '순서', range: '범위', grid: '격자', tree: '계층', cursor: '현재 위치',
  selection: '선택', expansion: '펼침', text: '텍스트', eligibility: '사용 가능 여부',
  boundary: '경계 처리', activation: '실행', parsing: '입력 해석', transition: '상태 전이',
  guarantees: '결정적 · 순수 · 원자적 · 변경 차수 검증', behavior: '조합된 동작',
  commands: '순서가 보장된 명령', projection: '실행 환경 연결', future: '그 밖의 환경',
} : {
  aria: 'Sectile semantic composition model',
  ingredients: 'Semantic ingredients', structures: 'Structures', state: 'State', policies: 'Policies',
  sequence: 'sequence', range: 'range', grid: 'grid', tree: 'tree', cursor: 'cursor', selection: 'selection',
  expansion: 'expansion', text: 'text', eligibility: 'eligibility', boundary: 'boundary', activation: 'activation',
  parsing: 'parsing', transition: 'Semantic transition', guarantees: 'Deterministic · pure · atomic · revision-aware',
  behavior: 'Composite behavior', commands: 'Ordered commands', projection: 'Host projection', future: 'future hosts',
});
</script>

<template>
  <div class="theory-map" :aria-label="copy.aria">
    <section class="theory-map__layer theory-map__layer--inputs">
      <div class="theory-map__heading">
        <Boxes :size="18" aria-hidden="true" />
        <span>{{ copy.ingredients }}</span>
      </div>
      <div class="theory-map__groups">
        <div class="theory-map__group">
          <strong>{{ copy.structures }}</strong>
          <span>{{ copy.sequence }}</span><span>{{ copy.range }}</span><span>{{ copy.grid }}</span><span>{{ copy.tree }}</span>
        </div>
        <div class="theory-map__group">
          <strong>{{ copy.state }}</strong>
          <span>{{ copy.cursor }}</span><span>{{ copy.selection }}</span><span>{{ copy.expansion }}</span><span>{{ copy.text }}</span>
        </div>
        <div class="theory-map__group">
          <strong>{{ copy.policies }}</strong>
          <span>{{ copy.eligibility }}</span><span>{{ copy.boundary }}</span><span>{{ copy.activation }}</span><span>{{ copy.parsing }}</span>
        </div>
      </div>
    </section>

    <div class="theory-map__connector" aria-hidden="true">↓</div>

    <section class="theory-map__layer theory-map__layer--transition">
      <div class="theory-map__heading">
        <GitCommitHorizontal :size="18" aria-hidden="true" />
        <span>{{ copy.transition }}</span>
      </div>
      <code>State × Event → Result&lt;State × OrderedCommand*&gt;</code>
      <p>{{ copy.guarantees }}</p>
    </section>

    <div class="theory-map__connector" aria-hidden="true">↓</div>

    <section class="theory-map__layer theory-map__layer--outputs">
      <div class="theory-map__output">
        <Braces :size="18" aria-hidden="true" />
        <div><strong>{{ copy.behavior }}</strong><span>listbox · slider · calendar · combobox · tree grid</span></div>
      </div>
      <div class="theory-map__output">
        <SlidersHorizontal :size="18" aria-hidden="true" />
        <div><strong>{{ copy.commands }}</strong><span>focus · scroll · announce · activate · request</span></div>
      </div>
      <div class="theory-map__output">
        <Cable :size="18" aria-hidden="true" />
        <div><strong>{{ copy.projection }}</strong><span>DOM · terminal · Vue · {{ copy.future }}</span></div>
      </div>
    </section>
  </div>
</template>
