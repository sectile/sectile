<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import {
  PopoverArrow,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from '@sectile/vue/popover';

type Align = 'start' | 'center' | 'end';
type AnchorPlacement = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
type Boundary = 'viewport' | 'stage';
type Side = 'top' | 'right' | 'bottom' | 'left';
type Strategy = 'absolute' | 'fixed';
type Tracking = 'events' | 'animation-frame';

const props = withDefaults(defineProps<{ readonly locale?: 'en' | 'ko' }>(), { locale: 'en' });
const collisionBox = shallowRef<HTMLElement>();
const position = ref(true);
const side = ref<Side>('bottom');
const align = ref<Align>('center');
const sideOffset = ref(12);
const collisionPadding = ref(12);
const arrowPadding = ref(12);
const boundary = ref<Boundary>('stage');
const avoidCollisions = ref(true);
const hideWhenDetached = ref(false);
const strategy = ref<Strategy>('absolute');
const tracking = ref<Tracking>('events');
const anchorPlacement = ref<AnchorPlacement>('center');
const anchorVisible = ref(true);

const copy = computed(() => props.locale === 'ko' ? {
  automatic: '자동 위치', manual: '문서 흐름', side: '방향', align: '정렬', anchor: '기준 위치',
  boundary: '충돌 경계', offset: '간격', collisionPadding: '경계 여백', arrowPadding: '화살표 여백',
  strategy: '전략', tracking: '추적', collisions: '충돌 회피', detached: '분리 시 숨김',
  anchorVisible: '기준 요소 표시', anchorButton: '기준 요소', floatingTitle: 'Floating content',
  floatingBody: 'prop을 바꾸면 계산된 위치가 즉시 갱신됩니다.', actual: '실제', manualState: '문서 흐름 배치',
  placementGroup: '배치', collisionGroup: '충돌', spacingGroup: '간격', engineGroup: '엔진',
  demoArea: '충돌 테스트 영역', viewport: 'viewport', stage: '내부 경계', events: 'events', frame: 'animation-frame',
} : {
  automatic: 'Automatic', manual: 'Document flow', side: 'Side', align: 'Align', anchor: 'Anchor',
  boundary: 'Collision boundary', offset: 'Offset', collisionPadding: 'Collision padding', arrowPadding: 'Arrow padding',
  strategy: 'Strategy', tracking: 'Tracking', collisions: 'Avoid collisions', detached: 'Hide when detached',
  anchorVisible: 'Show anchor', anchorButton: 'Anchor', floatingTitle: 'Floating content',
  floatingBody: 'Change a prop to update the calculated placement immediately.', actual: 'Actual', manualState: 'Document flow',
  placementGroup: 'Placement', collisionGroup: 'Collision', spacingGroup: 'Spacing', engineGroup: 'Engine',
  demoArea: 'Collision test area', viewport: 'Viewport', stage: 'Internal boundary', events: 'Events', frame: 'Animation frame',
});

const collisionBoundary = computed(() => boundary.value === 'stage' ? collisionBox.value ?? 'viewport' : 'viewport');
const sides: readonly Side[] = ['top', 'right', 'bottom', 'left'];
const aligns: readonly Align[] = ['start', 'center', 'end'];
const anchors: readonly AnchorPlacement[] = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'];
</script>

<template>
  <section class="floating-example">
    <form class="floating-example__controls" @submit.prevent>
      <section class="floating-example__control-group">
        <h3>{{ copy.placementGroup }}</h3>
        <fieldset>
          <legend>{{ copy.side }}</legend>
          <div class="floating-example__choices">
            <label v-for="value in sides" :key="value"><input v-model="side" type="radio" name="side" :value="value" />{{ value }}</label>
          </div>
        </fieldset>
        <fieldset>
          <legend>{{ copy.align }}</legend>
          <div class="floating-example__choices">
            <label v-for="value in aligns" :key="value"><input v-model="align" type="radio" name="align" :value="value" />{{ value }}</label>
          </div>
        </fieldset>
        <label class="floating-example__field">
          <span>{{ copy.anchor }}</span>
          <select v-model="anchorPlacement">
            <option v-for="value in anchors" :key="value" :value="value">{{ value }}</option>
          </select>
        </label>
      </section>

      <section class="floating-example__control-group">
        <h3>{{ copy.collisionGroup }}</h3>
        <label class="floating-example__field">
          <span>{{ copy.boundary }}</span>
          <select v-model="boundary">
            <option value="viewport">{{ copy.viewport }}</option>
            <option value="stage">{{ copy.stage }}</option>
          </select>
        </label>
        <label class="floating-example__range">
          <span>{{ copy.collisionPadding }} <output>{{ collisionPadding }}px</output></span>
          <input v-model.number="collisionPadding" type="range" min="0" max="40" />
        </label>
        <div class="floating-example__checks">
          <label><input v-model="avoidCollisions" type="checkbox" />{{ copy.collisions }}</label>
          <label><input v-model="hideWhenDetached" type="checkbox" />{{ copy.detached }}</label>
        </div>
      </section>

      <section class="floating-example__control-group">
        <h3>{{ copy.spacingGroup }}</h3>
        <label class="floating-example__range">
          <span>{{ copy.offset }} <output>{{ sideOffset }}px</output></span>
          <input v-model.number="sideOffset" type="range" min="0" max="40" />
        </label>
        <label class="floating-example__range">
          <span>{{ copy.arrowPadding }} <output>{{ arrowPadding }}px</output></span>
          <input v-model.number="arrowPadding" type="range" min="0" max="40" />
        </label>
      </section>

      <section class="floating-example__control-group">
        <h3>{{ copy.engineGroup }}</h3>
        <label class="floating-example__field">
          <span>{{ copy.strategy }}</span>
          <select v-model="strategy"><option value="absolute">absolute</option><option value="fixed">fixed</option></select>
        </label>
        <label class="floating-example__field">
          <span>{{ copy.tracking }}</span>
          <select v-model="tracking"><option value="events">{{ copy.events }}</option><option value="animation-frame">{{ copy.frame }}</option></select>
        </label>
        <div class="floating-example__checks">
          <label><input v-model="position" type="checkbox" />{{ position ? copy.automatic : copy.manual }}</label>
          <label><input v-model="anchorVisible" type="checkbox" />{{ copy.anchorVisible }}</label>
        </div>
      </section>
    </form>

    <div class="floating-example__stage">
      <header class="floating-example__stage-header">
        <strong>{{ copy.demoArea }}</strong>
        <code>{{ boundary === 'stage' ? copy.stage : copy.viewport }}</code>
      </header>
      <div ref="collisionBox" class="floating-example__boundary" :data-active="boundary === 'stage'">
        <PopoverRoot
          :key="`${anchorPlacement}:${anchorVisible}`"
          :open="true"
          :position="position"
          :side="side"
          :align="align"
          :side-offset="sideOffset"
          :collision-padding="collisionPadding"
          :collision-boundary="collisionBoundary"
          :avoid-collisions="avoidCollisions"
          :arrow-padding="arrowPadding"
          :hide-when-detached="hideWhenDetached"
          :strategy="strategy"
          :tracking="tracking"
          :auto-focus="false"
          :restore-focus="false"
          :close-on-interact-outside="false"
        >
          <div class="floating-example__reference" :data-anchor="anchorPlacement">
            <PopoverTrigger v-show="anchorVisible" class="floating-example__trigger">{{ copy.anchorButton }}</PopoverTrigger>
          </div>
          <PopoverPortal :disabled="!position">
            <PopoverContent
              class="floating-example__content"
              :data-mode="position ? 'automatic' : 'manual'"
              :data-actual-label="position ? copy.actual : copy.manualState"
            >
              <PopoverArrow class="floating-example__arrow" />
              <strong>{{ copy.floatingTitle }}</strong>
              <p>{{ copy.floatingBody }}</p>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </div>
    </div>
  </section>
</template>

<style scoped>
.floating-example { container-type: inline-size; display: grid; min-width: 0; color: var(--vp-c-text-1); background: var(--vp-c-bg); }
.floating-example__controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem 2rem; border-bottom: 1px solid var(--vp-c-divider); padding: 1.25rem; background: var(--vp-c-bg-soft); }
.floating-example__control-group { display: grid; min-width: 0; align-content: start; gap: .9rem; }
.floating-example__control-group h3 { margin: 0; color: var(--vp-c-text-1); font-size: .72rem; font-weight: 760; letter-spacing: .04em; line-height: 1.2; text-transform: uppercase; }
.floating-example fieldset { min-width: 0; margin: 0; border: 0; padding: 0; }
.floating-example legend, .floating-example__field > span, .floating-example__range > span { display: block; margin-bottom: .45rem; color: var(--vp-c-text-2); font-size: .72rem; font-weight: 700; }
.floating-example__choices { display: flex; flex-wrap: wrap; gap: .35rem; }
.floating-example__choices label, .floating-example__checks label { display: inline-flex; min-height: 2.5rem; align-items: center; gap: .4rem; border: 1px solid var(--vp-c-divider); border-radius: .55rem; padding: .35rem .55rem; background: var(--vp-c-bg); font-size: .72rem; cursor: pointer; }
.floating-example__choices label:has(input:checked) { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.floating-example__choices input { margin: 0; accent-color: var(--vp-c-brand-1); }
.floating-example__field select { width: 100%; min-height: 2.5rem; border: 1px solid var(--vp-c-divider); border-radius: .55rem; padding: 0 .65rem; color: var(--vp-c-text-1); background: var(--vp-c-bg); font: inherit; font-size: .76rem; }
.floating-example__range { display: grid; }
.floating-example__range > span { display: flex; justify-content: space-between; }
.floating-example__range output { color: var(--vp-c-brand-1); font-family: var(--vp-font-family-mono); font-variant-numeric: tabular-nums; }
.floating-example__range input { width: 100%; accent-color: var(--vp-c-brand-1); }
.floating-example__checks { display: flex; flex-wrap: wrap; gap: .35rem .75rem; }
.floating-example__checks label { border: 0; padding-inline: 0; background: transparent; }
.floating-example__checks input { accent-color: var(--vp-c-brand-1); }
.floating-example__stage { display: grid; min-width: 0; gap: .75rem; padding: 1.25rem; background: var(--vp-c-bg); }
.floating-example__stage-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.floating-example__stage-header strong { font-size: .78rem; }
.floating-example__stage-header code { color: var(--vp-c-text-2); font-size: .7rem; }
.floating-example__boundary { display: grid; box-sizing: border-box; min-width: 0; min-height: clamp(26rem, 65vw, 34rem); padding: clamp(3rem, 8vw, 5rem); border: 1px dashed var(--vp-c-divider); border-radius: .75rem; background: var(--vp-c-bg-soft); }
.floating-example__boundary[data-active='true'] { border-color: var(--vp-c-brand-1); }
.floating-example__reference { display: grid; place-self: center; }
.floating-example__reference[data-anchor='top-left'] { place-self: start; }
.floating-example__reference[data-anchor='top-right'] { align-self: start; justify-self: end; }
.floating-example__reference[data-anchor='bottom-left'] { align-self: end; justify-self: start; }
.floating-example__reference[data-anchor='bottom-right'] { place-self: end; }
.floating-example__trigger { min-height: 2.75rem; border: 1px solid var(--vp-c-brand-1); border-radius: .7rem; padding: 0 1rem; color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font: inherit; font-weight: 700; cursor: pointer; }
.floating-example__trigger:focus-visible, .floating-example select:focus-visible, .floating-example input:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.floating-example__content { z-index: 80; display: grid; box-sizing: border-box; width: min(15rem, var(--sectile-position-available-width, calc(100vw - 1rem))); max-height: var(--sectile-position-available-height, calc(100vh - 1rem)); overflow: auto; gap: .45rem; border: 1px solid var(--vp-c-divider); border-radius: .75rem; padding: .9rem; color: var(--vp-c-text-1); background: var(--vp-c-bg-elv); box-shadow: var(--vp-shadow-3); }
.floating-example__content::before { display: block; color: var(--vp-c-brand-1); content: attr(data-actual-label) ' ' attr(data-side) ' · ' attr(data-align); font-family: var(--vp-font-family-mono); font-size: .66rem; font-weight: 700; }
.floating-example__content[data-mode='manual'] { place-self: start center; }
.floating-example__content[data-mode='manual']::before { content: attr(data-actual-label); }
.floating-example__content[data-mode='manual'] .floating-example__arrow { display: none; }
.floating-example__content strong { font-size: .86rem; }
.floating-example__content p { margin: 0; color: var(--vp-c-text-2); font-size: .74rem; line-height: 1.5; }
.floating-example__arrow { width: .7rem; height: .7rem; rotate: 45deg; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-elv); }
.floating-example__content[data-side='bottom'] .floating-example__arrow { border-right: 0; border-bottom: 0; }
.floating-example__content[data-side='top'] .floating-example__arrow { border-left: 0; border-top: 0; }
.floating-example__content[data-side='right'] .floating-example__arrow { border-right: 0; border-top: 0; }
.floating-example__content[data-side='left'] .floating-example__arrow { border-left: 0; border-bottom: 0; }

@container (max-width: 36rem) {
  .floating-example__controls { grid-template-columns: 1fr; }
  .floating-example__stage { padding: 1rem; }
  .floating-example__boundary { padding: 3rem 2rem; }
}
</style>
