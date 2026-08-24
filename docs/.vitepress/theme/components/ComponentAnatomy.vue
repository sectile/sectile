<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useDocsLocale } from '../locale.js';
import {
  anatomyPartContract,
  componentAnatomy,
  type AnatomyPreviewNode as AnatomyPreviewNodeDefinition,
} from '../component-anatomy.js';
import {
  activateAnatomyInteraction,
  initializeAnatomyInteraction,
  type AnatomyActivation,
} from '../anatomy-interaction.js';
import AnatomyPreviewNode from './AnatomyPreviewNode.vue';
import CalendarAnatomy from './CalendarAnatomy.vue';
import DateTimePickerAnatomy from './DateTimePickerAnatomy.vue';
import MenubarAnatomy from './MenubarAnatomy.vue';
import MultiThumbSliderAnatomy from './MultiThumbSliderAnatomy.vue';
import SliderAnatomy from './SliderAnatomy.vue';

const props = defineProps<{ component: string }>();
const { isKorean } = useDocsLocale();
const definition = computed(() => componentAnatomy[props.component]);
const selectedPart = ref('root');
const hoveredPart = ref<string | null>(null);
const selectedPath = ref('0');
const hoveredPath = ref<string | null>(null);
type AnatomyAttributes = readonly (readonly [name: string, value: string])[];
const selectedAttributes = ref<AnatomyAttributes | null>(null);
const hoveredAttributes = ref<AnatomyAttributes | null>(null);
const previewValues = reactive<Record<string, string>>({});
const previewState = reactive<Record<string, string>>({});
const activePart = computed(() => hoveredPart.value ?? selectedPart.value);
const activePath = computed(() => hoveredPath.value ?? selectedPath.value);
const pickerComponents = new Set(['date-picker', 'date-range-picker', 'date-time-picker', 'date-time-range-picker']);
const usesCalendarAnatomy = computed(() => props.component === 'calendar');
const usesPickerAnatomy = computed(() => pickerComponents.has(props.component));
const usesMenubarAnatomy = computed(() => props.component === 'menubar');
const usesMultiThumbSliderAnatomy = computed(() => props.component === 'multi-thumb-slider');
const usesSliderAnatomy = computed(() => props.component === 'slider');

watch(() => props.component, () => {
  const initialPart = definition.value === undefined
    ? 'root'
    : definition.value.parts.find((part) => part !== 'provider' && findPartPath(definition.value!.preview, part) !== undefined)
      ?? 'root';
  selectedPart.value = initialPart;
  selectedPath.value = definition.value === undefined
    ? '0'
    : findPartPath(definition.value.preview, initialPart) ?? '0';
  hoveredPart.value = null;
  hoveredPath.value = null;
  selectedAttributes.value = null;
  hoveredAttributes.value = null;
  initializeAnatomyInteraction(props.component, previewValues, previewState);
}, { immediate: true });

function findPartPath(node: AnatomyPreviewNodeDefinition, part: string, path = '0'): string | undefined {
  if (node.part === part) return path;
  for (const [index, child] of (node.children ?? []).entries()) {
    const match = findPartPath(child, part, `${path}.${index}`);
    if (match !== undefined) return match;
  }
  return undefined;
}

const selectedLabel = computed(() => partTitle(activePart.value));
const attributes = computed<AnatomyAttributes>(() => {
  const override = hoveredPart.value === null ? selectedAttributes.value : hoveredAttributes.value;
  if (override !== null) return override;
  return definition.value === undefined
    ? [['data-scope', props.component], ['data-part', activePart.value]]
    : anatomyPartContract(definition.value, activePart.value).attributes;
});
const selectedDescription = computed(() => description(activePart.value, isKorean.value, attributes.value));

function selectPart(part: string, nextAttributes?: AnatomyAttributes): void {
  selectedPart.value = part;
  selectedAttributes.value = nextAttributes ?? null;
}

function hoverPart(part: string | null, nextAttributes?: AnatomyAttributes): void {
  hoveredPart.value = part;
  hoveredAttributes.value = part === null ? null : nextAttributes ?? null;
}

function partTitle(part: string): string {
  return part.split('-').map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`).join(' ');
}

function description(part: string, korean: boolean, currentAttributes: AnatomyAttributes): string {
  if (part === 'root') return korean ? '컴포넌트 전체가 차지하는 경계와 상호작용 범위입니다.' : 'The boundary and interaction area of the entire component.';
  if (props.component === 'menubar' && part === 'item') {
    const level = currentAttributes.find(([name]) => name === 'data-level')?.[1] ?? '<depth>';
    return korean
      ? `최상위 메뉴와 팝업 명령은 같은 item 파트를 공유하며 data-level="${level}"로 계층을 구분합니다.`
      : `Top-level menus and popup commands share the item part; data-level="${level}" distinguishes their hierarchy.`;
  }
  if (props.component === 'menubar' && part === 'sub-content') {
    return korean
      ? '열린 명령 목록의 경계입니다. 공유 Menu 프리미티브이므로 data-scope="menu"를 사용합니다.'
      : 'The opened command-list boundary. It uses data-scope="menu" because Menubar reuses the shared Menu primitive.';
  }
  if (props.component === 'navigation-menu' && part === 'viewport') {
    return korean
      ? '열린 하위 메뉴를 같은 위치에서 표시하고 전환하는 팝업 영역입니다.'
      : 'The popup region that presents and switches open navigation content in one stable position.';
  }
  return korean
    ? '강조된 화면 영역이 이 공개 파트에 해당합니다. 아래 속성을 선택자로 사용해 스타일을 적용할 수 있습니다.'
    : 'The highlighted region belongs to this public part. Use the attributes below as stable styling selectors.';
}

function updatePreviewValue(part: string, value: string): void {
  previewValues[part] = value;
}

function activatePreview(node: AnatomyActivation): void {
  activateAnatomyInteraction(props.component, node, previewValues, previewState);
}
</script>

<template>
  <section v-if="definition" class="component-anatomy" :aria-label="isKorean ? `${component} 구성 살펴보기` : `Explore ${component} anatomy`">
    <header class="component-anatomy__intro">
      <p>
        {{ isKorean
          ? '영역에 마우스를 올리거나 직접 조작하면 해당 파트의 경계와 스타일 속성을 확인할 수 있습니다.'
          : 'Hover or interact with a region to inspect its boundary and styling attributes.' }}
      </p>
    </header>

    <div
      class="component-anatomy__stage"
      :class="{ 'component-anatomy__stage--picker': usesPickerAnatomy }"
    >
      <CalendarAnatomy
        v-if="usesCalendarAnatomy"
        :active-part="activePart"
        :korean="isKorean"
        @select="selectPart"
        @hover="hoverPart"
      />
      <DateTimePickerAnatomy
        v-else-if="usesPickerAnatomy"
        :component="component as 'date-picker' | 'date-range-picker' | 'date-time-picker' | 'date-time-range-picker'"
        :active-part="activePart"
        :korean="isKorean"
        @select="selectPart"
        @hover="hoverPart"
      />
      <MenubarAnatomy
        v-else-if="usesMenubarAnatomy"
        :active-part="activePart"
        :korean="isKorean"
        @select="selectPart"
        @hover="hoverPart"
      />
      <MultiThumbSliderAnatomy
        v-else-if="usesMultiThumbSliderAnatomy"
        :active-part="activePart"
        :korean="isKorean"
        @select="selectPart"
        @hover="hoverPart"
      />
      <SliderAnatomy
        v-else-if="usesSliderAnatomy"
        :active-part="activePart"
        :korean="isKorean"
        @select="selectPart"
        @hover="hoverPart"
      />
      <AnatomyPreviewNode
        v-else
        :node="definition.preview"
        node-path="0"
        :selected-part="selectedPart"
        :active-part="activePart"
        :selected-path="selectedPath"
        :active-path="activePath"
        :preview-values="previewValues"
        :preview-state="previewState"
        :component="component"
        @select="selectPart"
        @hover="hoverPart"
        @select-path="selectedPath = $event"
        @hover-path="hoveredPath = $event"
        @update-value="updatePreviewValue"
        @activate="activatePreview"
      />
    </div>

    <aside class="component-anatomy__inspector" aria-live="polite">
      <div>
        <span>{{ isKorean ? '선택한 영역' : 'Selected area' }}</span>
        <strong>{{ selectedLabel }}</strong>
        <p>{{ selectedDescription }}</p>
      </div>
      <dl v-if="attributes.length > 0">
        <template v-for="([name, value]) in attributes" :key="name">
          <dt>{{ name }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
      <p v-else class="component-anatomy__non-visual">
        {{ isKorean ? '이 파트는 DOM 영역을 만들지 않습니다.' : 'This part does not create a DOM area.' }}
      </p>
    </aside>
  </section>
</template>

<style>
.component-anatomy {
  --vp-c-bg: #fff;
  --vp-c-bg-soft: #f6f6f7;
  --vp-c-bg-alt: #f0f0f2;
  --vp-c-divider: #e3e3e7;
  --vp-c-border: #d8d8de;
  --vp-c-text-1: #3c3c43;
  --vp-c-text-2: #5b5b64;
  --vp-c-text-3: #85858d;
  --vp-c-brand-1: #5368eb;
  --vp-c-brand-soft: #e8eaff;

  margin: 18px 0 34px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-alt);
}

.component-anatomy__intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.component-anatomy__intro p,
.component-anatomy__inspector p { margin: 0; }
.component-anatomy__intro p { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.55; }
.component-anatomy button { font: inherit; }

.component-anatomy__stage {
  --anatomy-control-height: 44px;

  display: grid;
  min-height: 0;
  padding: clamp(36px, 6vw, 56px) clamp(22px, 5vw, 48px);
  place-items: center;
  background: var(--vp-c-bg-soft);
}

.component-anatomy__stage--picker {
  min-height: 620px;
  padding: 36px 32px;
}

.component-anatomy__stage .anatomy-node {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  color: var(--vp-c-text-1);
}

.component-anatomy__stage .anatomy-node--selectable { cursor: default; }
.component-anatomy__stage .anatomy-node--interactive { cursor: pointer; }
.component-anatomy__stage .anatomy-part-active {
  position: relative;
  z-index: 4;
  overflow: visible !important;
  outline: 0 !important;
  box-shadow: inset 0 0 0 2px var(--vp-c-brand-1) !important;
}
.component-anatomy__stage .anatomy-node:has(.anatomy-part-active) { overflow: visible; }
.component-anatomy__stage .anatomy-node--preview-hidden { display: none; }
.component-anatomy__stage .anatomy-node--item.anatomy-node--preview-active,
.component-anatomy__stage .anatomy-node--tab.anatomy-node--preview-active,
.component-anatomy__stage .anatomy-node--button.anatomy-node--preview-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.component-anatomy__stage .anatomy-node--indicator.anatomy-node--preview-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: white;
}
.component-anatomy__stage .anatomy-node--switch-root .anatomy-node--thumb {
  transition: transform 160ms ease, background-color 160ms ease;
}
.component-anatomy__stage .anatomy-node--switch-root.anatomy-node--preview-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.component-anatomy__stage .anatomy-node--switch-root.anatomy-node--preview-active .anatomy-node--thumb {
  background: var(--vp-c-brand-1);
  transform: none;
}
.component-anatomy__stage .anatomy-node--switch-root.anatomy-node--preview-active > .anatomy-node--thumb::after { transform: translateX(20px); }

.component-anatomy__stage .anatomy-part-label {
  position: absolute;
  z-index: 12;
  top: -11px;
  left: 12px;
  padding: 2px 7px 3px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font: 700 10px/1.4 var(--vp-font-family-mono);
  white-space: nowrap;
  pointer-events: none;
}

.component-anatomy__stage .anatomy-node__icon {
  display: block;
  flex: none;
  width: 16px;
  height: 16px;
  vertical-align: middle;
}
.component-anatomy__stage .anatomy-node__text { min-width: 0; line-height: 1.4; }
.component-anatomy__stage .anatomy-node__detail { color: var(--vp-c-text-3); font-size: 11px; line-height: 1.4; }
.component-anatomy__stage .anatomy-node__button,
.component-anatomy__stage .anatomy-node__input,
.component-anatomy__stage .anatomy-node__select {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.component-anatomy__stage .anatomy-node__button {
  display: inline-flex;
  width: 100%;
  min-height: inherit;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0;
  cursor: pointer;
}

.component-anatomy__stage .anatomy-node__input { width: 100%; padding: 0; }
.component-anatomy__stage .anatomy-node__input:focus-visible,
.component-anatomy__stage .anatomy-node__range-input:focus-visible,
.component-anatomy__stage .anatomy-node__select:focus-visible,
.component-anatomy__stage .anatomy-node__button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 4px; }
.component-anatomy__stage .anatomy-part-active > :is(
  .anatomy-node__input,
  .anatomy-node__range-input,
  .anatomy-node__select,
  .anatomy-node__button
):focus-visible { outline: 0; }

.component-anatomy__stage .anatomy-node__range-input {
  position: absolute;
  inset: -8px 0;
  width: 100%;
  height: 24px;
  appearance: none;
  margin: 0;
  background: transparent;
  cursor: ew-resize;
}
.component-anatomy__stage .anatomy-node__range-input::-webkit-slider-runnable-track { height: 8px; background: transparent; }
.component-anatomy__stage .anatomy-node__range-input::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  appearance: none;
  margin-top: -6px;
  border: 3px solid var(--vp-c-brand-1);
  border-radius: 50%;
  background: var(--vp-c-bg);
}
.component-anatomy__stage .anatomy-node__range-input::-moz-range-track { height: 8px; background: transparent; }
.component-anatomy__stage .anatomy-node__range-input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 3px solid var(--vp-c-brand-1);
  border-radius: 50%;
  background: var(--vp-c-bg);
}

.component-anatomy__stage .anatomy-node--root {
  width: min(100%, 680px);
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
}

.component-anatomy__stage .anatomy-node--row { display: flex; align-items: center; gap: 10px; }
.component-anatomy__stage .anatomy-node--stack { display: grid; gap: 3px; }
.component-anatomy__stage .anatomy-node--form-stack { display: grid; gap: 12px; width: min(100%, 520px); }
.component-anatomy__stage .anatomy-node--editable-root { display: grid; gap: 16px; }
.component-anatomy__stage .anatomy-node--editor-actions { flex-wrap: wrap; gap: 12px; }
.component-anatomy__stage .anatomy-node--field-preview { width: min(100%, 520px); }
.component-anatomy__stage .anatomy-node--field-row,
.component-anatomy__stage .anatomy-node--picker-inputs { align-items: end; }
.component-anatomy__stage .anatomy-node--picker-inputs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }

.component-anatomy__stage .anatomy-node--label { font-size: 13px; font-weight: 650; }
.component-anatomy__stage .anatomy-node--text { font-weight: 650; }
.component-anatomy__stage .anatomy-node--muted { color: var(--vp-c-text-2); font-size: 12px; }

.component-anatomy__stage .anatomy-node--button,
.component-anatomy__stage .anatomy-node--icon-button {
  display: inline-flex;
  min-height: var(--anatomy-control-height);
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.component-anatomy__stage .anatomy-node--icon-button { width: var(--anatomy-control-height); padding: 0; font-size: 20px; }
.component-anatomy__stage .anatomy-node--icon-button > .anatomy-node__detail { display: none; }
.component-anatomy__stage .anatomy-node--danger { border-color: #dc5f62; background: #dc5f62; color: white; }
.component-anatomy__stage .anatomy-node--input {
  display: grid;
  flex: 1;
  min-height: var(--anatomy-control-height);
  align-content: center;
  gap: 1px;
  padding: 7px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.component-anatomy__stage .anatomy-node--input .anatomy-node__detail { order: -1; font-family: var(--vp-font-family-base); font-size: 9px; text-transform: uppercase; }
.component-anatomy__stage .anatomy-node--native-select {
  position: relative;
  min-width: 90px;
  padding: 0;
}
.component-anatomy__stage .anatomy-node__select-shell { position: relative; width: 100%; }
.component-anatomy__stage .anatomy-node__select {
  width: 100%;
  min-height: var(--anatomy-control-height);
  appearance: none;
  padding: 0 38px 0 13px;
  cursor: pointer;
}
.component-anatomy__stage .anatomy-node__select-icon {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 16px;
  height: 16px;
  color: var(--vp-c-text-2);
  pointer-events: none;
  transform: translateY(-50%);
}
.component-anatomy__stage .anatomy-node--textarea { display: grid; min-height: 92px; gap: 10px; padding: 14px; border: 1px solid var(--vp-c-divider); border-radius: 10px; }

.component-anatomy__stage .anatomy-node--choice { display: flex; width: min(100%, 520px); align-items: center; gap: 14px; box-shadow: none; }
.component-anatomy__stage .anatomy-node--choice > .anatomy-node--indicator {
  width: 28px;
  height: 28px;
  border: 2px solid var(--vp-c-border);
  border-radius: 7px;
  background: var(--vp-c-bg);
  color: transparent;
  transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease;
}
.component-anatomy__stage .anatomy-node--choice > .anatomy-node--indicator.anatomy-node--preview-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: white;
}
.component-anatomy__stage .anatomy-node--item.anatomy-node--choice > .anatomy-node--indicator { margin-left: 0; }

.component-anatomy__stage .anatomy-node--panel,
.component-anatomy__stage .anatomy-node--list,
.component-anatomy__stage .anatomy-node--viewport { border: 1px solid var(--vp-c-divider); border-radius: 11px; background: var(--vp-c-bg); }
.component-anatomy__stage .anatomy-node--panel { padding: 14px; }
.component-anatomy__stage .anatomy-node--list { display: grid; overflow: hidden; }
.component-anatomy__stage .anatomy-node--indicator {
  display: inline-grid;
  flex: none;
  place-items: center;
  line-height: 0;
}
.component-anatomy__stage .anatomy-node--item { display: flex; min-height: 46px; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--vp-c-divider); }
.component-anatomy__stage .anatomy-node--item:last-child { border-bottom: 0; }
.component-anatomy__stage .anatomy-node--item > .anatomy-node--indicator { margin-left: auto; }
.component-anatomy__stage .anatomy-node--separator { height: 1px; margin: 5px 0; background: var(--vp-c-divider); }

.component-anatomy__stage .anatomy-node--picker-root { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.component-anatomy__stage .anatomy-node--picker-root > :is(.anatomy-node--calendar, .anatomy-node--picker-inputs) { grid-column: 1 / -1; }
.component-anatomy__stage .anatomy-node--calendar { width: min(100%, 520px); padding: 16px; border: 1px solid var(--vp-c-divider); border-radius: 14px; background: var(--vp-c-bg); }
.component-anatomy__stage .anatomy-node--view-switch { justify-content: center; margin-bottom: 10px; }
.component-anatomy__stage .anatomy-node--view-switch .anatomy-node--button { min-height: 30px; padding: 0 10px; border-radius: 7px; font-size: 11px; }
.component-anatomy__stage .anatomy-node--calendar-header { justify-content: space-between; margin-bottom: 8px; }
.component-anatomy__stage .anatomy-node--calendar-title { flex: 1; text-align: center; }
.component-anatomy__stage .anatomy-node--week-controls { justify-content: center; margin-bottom: 10px; }
.component-anatomy__stage .anatomy-node--week-controls .anatomy-node--icon-button { width: 30px; min-height: 28px; font-size: 14px; }
.component-anatomy__stage .anatomy-node--calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
.component-anatomy__stage .anatomy-node--period-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: 10px; }
.component-anatomy__stage .anatomy-node--period-grid > .anatomy-node--cell { min-height: 48px; border-right: 1px solid var(--vp-c-divider); border-bottom: 1px solid var(--vp-c-divider); border-radius: 0; }
.component-anatomy__stage .anatomy-node--period-grid > .anatomy-node--cell:nth-child(3n) { border-right: 0; }
.component-anatomy__stage .anatomy-node--period-grid > .anatomy-node--cell:nth-last-child(-n + 3) { border-bottom: 0; }
.component-anatomy__stage .anatomy-node--weekday { padding: 5px 0; color: var(--vp-c-text-3); font-size: 9px; font-weight: 700; text-align: center; }
.component-anatomy__stage .anatomy-node--cell { display: grid; min-height: 36px; place-items: center; border-radius: 8px; font-size: 12px; }
.component-anatomy__stage .anatomy-node--cell:hover { background: var(--vp-c-bg-soft); }
.component-anatomy__stage .anatomy-node--selected { background: var(--vp-c-brand-1); color: white; }
.component-anatomy__stage .anatomy-node--outside { color: var(--vp-c-text-3); }
.component-anatomy__stage .anatomy-node--month-row { justify-content: center; margin-top: 10px; }
.component-anatomy__stage .anatomy-node--month-cell { min-width: 72px; border: 1px solid var(--vp-c-divider); }

.component-anatomy__stage .anatomy-node--slider-root { display: grid; gap: 30px; }
.component-anatomy__stage .anatomy-node--split-label { justify-content: space-between; }
.component-anatomy__stage .anatomy-node--track { position: relative; height: 8px; border-radius: 999px; background: var(--vp-c-bg-alt); }
.component-anatomy__stage .anatomy-node--range { position: absolute; inset: 0 58% 0 0; border-radius: inherit; background: var(--vp-c-brand-1); }
.component-anatomy__stage .anatomy-node--range:hover,
.component-anatomy__stage .anatomy-node--range.anatomy-part-active { background-color: var(--vp-c-brand-1) !important; }
.component-anatomy__stage .anatomy-node--thumb { position: absolute; top: 50%; left: 40%; display: grid; width: 24px; height: 24px; place-items: center; border: 3px solid var(--vp-c-brand-1); border-radius: 50%; background: var(--vp-c-bg); font-size: 8px; transform: translate(-50%, -50%); }
.component-anatomy__stage .anatomy-node--second-thumb { left: 72%; }

.component-anatomy__stage .anatomy-node--dialog-root,
.component-anatomy__stage .anatomy-node--popover-root { min-height: 300px; }
.component-anatomy__stage .anatomy-node--tooltip-root { display: grid; min-height: 260px; place-items: center; }
.component-anatomy__stage .anatomy-node--overlay { position: absolute; inset: 72px 22px 22px; display: grid; padding: 24px; place-items: center; border-radius: 12px; background: color-mix(in srgb, var(--vp-c-text-1) 18%, transparent); }
.component-anatomy__stage .anatomy-node--dialog-panel { display: grid; width: min(100%, 360px); gap: 13px; box-shadow: 0 20px 50px color-mix(in srgb, var(--vp-c-text-1) 18%, transparent); }
.component-anatomy__stage .anatomy-node--dialog-actions { justify-content: flex-end; }
.component-anatomy__stage .anatomy-node--floating-panel,
.component-anatomy__stage .anatomy-node--tooltip-panel { position: absolute; top: 84px; left: 50%; display: grid; width: min(80%, 330px); gap: 10px; transform: translateX(-50%); box-shadow: 0 18px 42px color-mix(in srgb, var(--vp-c-text-1) 15%, transparent); }
.component-anatomy__stage .anatomy-node--popover-root > .anatomy-node--floating-panel { top: 76px; left: 28px; transform: none; }
.component-anatomy__stage .anatomy-node--popover-root > .anatomy-node--floating-panel > .anatomy-node--arrow { left: 54px; }
.component-anatomy__stage .anatomy-node--floating-panel > .anatomy-node--icon-button { position: absolute; top: 10px; right: 10px; width: 28px; min-height: 28px; }
.component-anatomy__stage .anatomy-node--popover-anchor { position: relative; width: max-content; padding: 0; border: 0; background: transparent; }
.component-anatomy__stage .anatomy-node--tooltip-anchor { position: relative; display: inline-grid; width: max-content; max-width: 100%; margin-top: 36px; }
.component-anatomy__stage .anatomy-node--tooltip-panel { top: auto; bottom: calc(100% + 12px); width: max-content; max-width: min(330px, calc(100vw - 80px)); padding: 9px 12px; font-size: 12px; white-space: nowrap; }
.component-anatomy__stage .anatomy-node--arrow { position: absolute; top: -7px; left: 50%; width: 14px; height: 14px; border: 1px solid var(--vp-c-divider); border-right: 0; border-bottom: 0; background: var(--vp-c-bg); transform: rotate(45deg); }
.component-anatomy__stage .anatomy-node--tooltip-arrow { top: auto; bottom: -7px; border: 1px solid var(--vp-c-divider); border-top: 0; border-left: 0; }

.component-anatomy__stage .anatomy-node--listbox-root,
.component-anatomy__stage .anatomy-node--select-root,
.component-anatomy__stage .anatomy-node--combobox-root,
.component-anatomy__stage .anatomy-node--cascade-root { display: grid; width: min(100%, 520px); gap: 10px; }
.component-anatomy__stage .anatomy-node--cascade-root { width: min(100%, 680px); }
.component-anatomy__stage .anatomy-node--cascade-root > [data-part-name='value'] { padding-inline: 2px; color: var(--vp-c-text-2); font-size: 12px; }
.component-anatomy__stage .anatomy-node--cascade-root > .anatomy-node--list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.component-anatomy__stage .anatomy-node--cascade-root > .anatomy-node--list > .anatomy-node--panel { min-width: 0; padding: 8px; border-width: 0 1px 0 0; border-radius: 0; }
.component-anatomy__stage .anatomy-node--cascade-root > .anatomy-node--list > .anatomy-node--panel:last-child { border-right: 0; }
.component-anatomy__stage .anatomy-node--cascade-root .anatomy-node--item { min-width: 0; border-bottom: 0; border-radius: 8px; }
.component-anatomy__stage .anatomy-node--cascade-root .anatomy-node--item:hover { background: var(--vp-c-bg-soft); }
.component-anatomy__stage .anatomy-node--cascade-root .anatomy-node__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.component-anatomy__stage :is(
  .anatomy-node--select-root,
  .anatomy-node--cascade-root,
  .anatomy-node--menu-button-root,
  .anatomy-node--navigation-root,
  .anatomy-node--accordion-root,
  .anatomy-node--disclosure-root
) [data-part-name='trigger'] > .anatomy-node__button {
  flex-direction: row-reverse;
  justify-content: space-between;
  text-align: left;
}

.component-anatomy__stage .anatomy-node--menu-root,
.component-anatomy__stage .anatomy-node--menu-button-root,
.component-anatomy__stage .anatomy-node--navigation-root { min-height: 300px; }
.component-anatomy__stage .anatomy-node--navigation-root { position: relative; display: grid; width: min(100%, 580px); min-height: 0; gap: 10px; }
.component-anatomy__stage .anatomy-node--menu-panel { position: relative; width: 240px; }
.component-anatomy__stage .anatomy-node--submenu { position: absolute; top: 90px; left: calc(100% - 8px); width: 170px; }
.component-anatomy__stage .anatomy-node--menu-panel > .anatomy-node--item,
.component-anatomy__stage .anatomy-node--submenu > .anatomy-node--item { border-bottom: 0; border-radius: 8px; }
.component-anatomy__stage .anatomy-node--menubar { padding: 5px; border: 1px solid var(--vp-c-divider); border-radius: 10px; }
.component-anatomy__stage .anatomy-node--navigation-root > .anatomy-node--list { position: relative; display: flex; overflow: visible; padding: 4px; border: 1px solid var(--vp-c-divider); border-radius: 10px; }
.component-anatomy__stage .anatomy-node--navigation-root > .anatomy-node--list > [data-part-name='item-container'] { min-height: 0; flex: none; padding: 0; border: 0; }
.component-anatomy__stage .anatomy-node--navigation-root > .anatomy-node--list > [data-part-name='item-container'] > [data-part-name='item'] { min-height: 40px; padding: 7px 12px; border: 0; border-radius: 7px; }
.component-anatomy__stage .anatomy-node--navigation-root > .anatomy-node--list > .anatomy-node--indicator { position: absolute; bottom: 0; left: 12px; width: 88px; height: 2px; background: var(--vp-c-brand-1); }
.component-anatomy__stage .anatomy-node--navigation-root > .anatomy-node--navigation-viewport {
  position: static;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 12px 28px color-mix(in srgb, var(--vp-c-text-1) 10%, transparent);
}
.component-anatomy__stage .anatomy-node--navigation-viewport > .anatomy-node--navigation-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 6px;
  border: 0;
  border-radius: inherit;
}
.component-anatomy__stage .anatomy-node--navigation-panel > .anatomy-node--item {
  display: grid;
  min-height: 68px;
  align-content: center;
  gap: 2px;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
}

.component-anatomy__stage .anatomy-node--data-grid {
  display: grid;
  width: min(100%, 560px);
  overflow: visible;
  padding: 0;
  border-radius: 12px;
  isolation: isolate;
}
.component-anatomy__stage .anatomy-node--data-grid.anatomy-part-active {
  box-shadow: none !important;
}
.component-anatomy__stage .anatomy-node--data-grid.anatomy-part-active::after {
  position: absolute;
  z-index: 10;
  inset: -1px;
  border: 2px solid var(--vp-c-brand-1);
  border-radius: 12px;
  content: '';
  pointer-events: none;
}
.component-anatomy__stage .anatomy-node--grid-header,
.component-anatomy__stage .anatomy-node--data-grid .anatomy-node--row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
}
.component-anatomy__stage .anatomy-node--grid-header {
  border-radius: 11px 11px 0 0;
  background: var(--vp-c-bg-soft);
}
.component-anatomy__stage .anatomy-node--grid-body { display: grid; }
.component-anatomy__stage .anatomy-node--data-grid .anatomy-node--cell {
  min-height: 44px;
  align-items: center;
  justify-items: start;
  padding: 0 14px;
  border-right: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  border-radius: 0;
  background: var(--vp-c-bg);
  font-size: 12px;
}
.component-anatomy__stage .anatomy-node--grid-header .anatomy-node--cell { background: transparent; color: var(--vp-c-text-2); font-size: 11px; font-weight: 650; }
.component-anatomy__stage .anatomy-node--data-grid .anatomy-node--row > .anatomy-node--cell:last-child { border-right: 0; }
.component-anatomy__stage .anatomy-node--grid-body > .anatomy-node--row:last-child > .anatomy-node--cell { border-bottom: 0; }
.component-anatomy__stage .anatomy-node--grid-header > .anatomy-node--cell:first-child { border-radius: 11px 0 0; }
.component-anatomy__stage .anatomy-node--grid-header > .anatomy-node--cell:last-child { border-radius: 0 11px 0 0; }
.component-anatomy__stage .anatomy-node--grid-body > .anatomy-node--row:last-child > .anatomy-node--cell:first-child { border-radius: 0 0 0 11px; }
.component-anatomy__stage .anatomy-node--grid-body > .anatomy-node--row:last-child > .anatomy-node--cell:last-child { border-radius: 0 0 11px; }
.component-anatomy__stage .anatomy-node--data-grid .anatomy-node--cell.anatomy-part-active {
  z-index: 6;
  box-shadow: inset 0 0 0 2px var(--vp-c-brand-1) !important;
}
.component-anatomy__stage .anatomy-node--data-grid .anatomy-node--cell > .anatomy-node--indicator {
  position: absolute;
  top: 50%;
  left: 12px;
  width: 16px;
  height: 16px;
  margin: 0;
  transform: translateY(-50%);
}
.component-anatomy__stage .anatomy-node--data-grid .anatomy-node--cell:has(> [data-part-name='disclosure']) { padding-left: 36px; }
.component-anatomy__stage .anatomy-node--tree-grid-root { width: min(100%, 680px); }
.component-anatomy__stage .anatomy-node--tree-grid-header,
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-row {
  grid-template-columns: minmax(15rem, 1.5fr) minmax(8rem, 0.8fr) minmax(6.5rem, 0.65fr);
}
.component-anatomy__stage .anatomy-node--tree-grid-parent { background: color-mix(in srgb, var(--vp-c-brand-soft) 35%, var(--vp-c-bg)); }
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-resource {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 54px;
  align-items: center;
  gap: 8px;
}
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-resource::before {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--vp-c-divider);
  content: '';
}
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-level-1 { padding-left: 12px; }
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-level-1::before { display: none; }
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-level-2 { padding-left: 36px; }
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-level-2::before { left: 24px; }
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-level-3 { padding-left: 60px; }
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-level-3::before { left: 48px; }
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-resource > .anatomy-node--indicator {
  position: static;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  margin: 0;
  color: var(--vp-c-text-2);
  transform: none;
}
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--tree-grid-resource > .anatomy-node--spacer {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
}
.component-anatomy__stage .anatomy-node--tree-grid-resource .anatomy-node--stack { min-width: 0; gap: 1px; }
.component-anatomy__stage .anatomy-node--tree-grid-resource .anatomy-node--text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 650; }
.component-anatomy__stage .anatomy-node--tree-grid-resource .anatomy-node--muted { font-size: 10px; }
.component-anatomy__stage .anatomy-node--tree-grid-root .anatomy-node--cell:has(.anatomy-node--tree-grid-editor) { padding: 6px; }
.component-anatomy__stage .anatomy-node--tree-grid-editor { width: 100%; height: 36px; border-color: var(--vp-c-brand-1); }
.component-anatomy__stage .anatomy-node--tree-grid-status { min-height: 25px; padding-inline: 8px; border-radius: 6px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.component-anatomy__stage .anatomy-node--tree-grid-status-success { color: #1e665d; background: #e2f4f0; }
.component-anatomy__stage .anatomy-node--tree-grid-status-review { color: #82500e; background: #fff1d6; }
.component-anatomy__stage .anatomy-node--tree-grid-status-neutral { color: var(--vp-c-text-2); background: var(--vp-c-bg-soft); }
.component-anatomy__stage .anatomy-node--tree-root { display: grid; width: min(100%, 540px); gap: 2px; padding: 8px; overflow: visible; border-radius: 14px; background: var(--vp-c-bg); }
.component-anatomy__stage .anatomy-node--tree-root [data-part-name='disclosure'] { margin-left: 0; }
.component-anatomy__stage .anatomy-node--tree-view-row { display: grid; grid-template-columns: 18px 20px minmax(0, 1fr) auto; min-height: 40px; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid transparent; border-radius: 9px; }
.component-anatomy__stage .anatomy-node--tree-view-level-2 { padding-left: 30px; }
.component-anatomy__stage .anatomy-node--tree-view-level-3 { padding-left: 52px; }
.component-anatomy__stage .anatomy-node--tree-view-row > .anatomy-node--text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.component-anatomy__stage .anatomy-node--tree-view-row > .anatomy-node--muted { font-size: 10px; white-space: nowrap; }
.component-anatomy__stage .anatomy-node--tree-view-row > [data-part-name='disclosure'] { width: 18px; height: 18px; margin: 0; }
.component-anatomy__stage .anatomy-node--tree-view-row > .anatomy-node--spacer { width: 18px; height: 18px; }
.component-anatomy__stage .anatomy-node--tree-view-children { display: grid; gap: 2px; }
.component-anatomy__stage .anatomy-node--tree-view-row.anatomy-node--preview-active { color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.component-anatomy__stage .anatomy-node--feed-root {
  display: grid;
  width: min(100%, 560px);
  gap: 0;
  padding: 0;
  overflow: visible;
  border-radius: 14px;
  background: var(--vp-c-bg);
}
.component-anatomy__stage .anatomy-node--feed-anatomy-header {
  display: flex;
  min-height: 70px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.component-anatomy__stage .anatomy-node--feed-anatomy-header > .anatomy-node--stack { align-items: flex-start; gap: 2px; }
.component-anatomy__stage .anatomy-node--feed-anatomy-header .anatomy-node--text { font-weight: 700; }
.component-anatomy__stage .anatomy-node--feed-anatomy-header .anatomy-node--badge { min-height: 0; padding: 4px 8px; border: 0; border-radius: 6px; color: #28786f; background: #e5f4f1; font-size: 11px; font-weight: 700; }
.component-anatomy__stage .anatomy-node--feed-anatomy-load { justify-self: center; margin: 10px 16px; }
.component-anatomy__stage .anatomy-node--feed-anatomy-load > .anatomy-node__button { min-height: 36px; padding: 7px 12px; border-color: color-mix(in srgb, var(--vp-c-brand-1) 28%, var(--vp-c-divider)); color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font-size: 12px; font-weight: 700; }
.component-anatomy__stage .anatomy-node--feed-anatomy-load-earlier { margin-top: 4px; }
.component-anatomy__stage .anatomy-node--feed-anatomy-list { display: grid; padding: 0 18px; }
.component-anatomy__stage .anatomy-node--feed-anatomy-event {
  display: grid;
  min-height: 0;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 12px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.component-anatomy__stage .anatomy-node--feed-anatomy-event + .anatomy-node--feed-anatomy-event { border-top: 1px solid var(--vp-c-divider); }
.component-anatomy__stage .anatomy-node--feed-anatomy-event > .anatomy-node--indicator { display: grid; width: 32px; height: 32px; margin: 0; place-items: center; border: 0; border-radius: 9px; color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.component-anatomy__stage .anatomy-node--feed-anatomy-event > .anatomy-node--stack { min-width: 0; align-items: flex-start; gap: 2px; }
.component-anatomy__stage .anatomy-node--feed-anatomy-event .anatomy-node--text { font-size: 13px; font-weight: 700; }
.component-anatomy__stage .anatomy-node--feed-anatomy-event .anatomy-node--muted { font-size: 11px; line-height: 1.4; }
.component-anatomy__stage .anatomy-node--feed-anatomy-event > .anatomy-node--badge { min-height: 0; padding: 3px 6px; border: 0; border-radius: 5px; background: var(--vp-c-bg-soft); font-size: 10px; font-weight: 700; }
.component-anatomy__stage .anatomy-node--feed-anatomy-note { padding: 10px 18px; border-top: 1px solid var(--vp-c-divider); font-size: 11px; text-align: center; }

.component-anatomy__stage .anatomy-node--rating-root { display: grid; width: min(100%, 440px); gap: 16px; padding: 24px; }
.component-anatomy__stage .anatomy-node--radio-root { display: grid; width: min(100%, 520px); gap: 14px; }
.component-anatomy__stage .anatomy-node--rating-value { color: var(--vp-c-text-2); font-size: 14px; font-weight: 600; }
.component-anatomy__stage .anatomy-node--rating-row { justify-content: flex-start; gap: 4px; }
.component-anatomy__stage .anatomy-node--rating-row .anatomy-node--item {
  display: grid;
  width: 44px;
  min-height: 44px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 10px;
  color: var(--vp-c-text-3);
}
.component-anatomy__stage .anatomy-node--rating-row .anatomy-node--item.anatomy-node--preview-active { background: transparent; color: var(--vp-c-brand-1); }
.component-anatomy__stage .anatomy-node--rating-row .anatomy-node--item:hover { background: var(--vp-c-bg-soft); }
.component-anatomy__stage .anatomy-node--rating-row .anatomy-node__icon--star { width: 28px; height: 28px; }
.component-anatomy__stage .anatomy-node--rating-row .anatomy-node--indicator {
  position: absolute;
  inset: 2px;
  width: auto;
  height: auto;
  margin: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
}
.component-anatomy__stage .anatomy-node--rating-row .anatomy-node--indicator.anatomy-node--preview-active { border-color: var(--vp-c-brand-1); background: transparent; }
.component-anatomy__stage .anatomy-node--rating-clear { width: fit-content; min-height: 38px; padding: 0 14px; border-radius: 9px; color: var(--vp-c-text-2); }
.component-anatomy__stage .anatomy-node--radio-root .anatomy-node--indicator { order: -1; width: 18px; height: 18px; margin-left: 0; border: 2px solid var(--vp-c-divider); border-radius: 50%; }
.component-anatomy__stage .anatomy-node--radio-root .anatomy-node--selected { border: 5px solid var(--vp-c-brand-1); background: var(--vp-c-bg); }
.component-anatomy__stage .anatomy-node--switch-root { display: flex; width: min(100%, 500px); align-items: center; gap: 16px; }
.component-anatomy__stage .anatomy-node--switch-root > .anatomy-node--thumb { position: relative; top: auto; left: auto; width: 48px; height: 28px; border: 0; border-radius: 999px; background: var(--vp-c-bg-alt); transform: none; }
.component-anatomy__stage .anatomy-node--switch-root > .anatomy-node--thumb::after { position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 50%; background: white; box-shadow: 0 1px 3px color-mix(in srgb, var(--vp-c-text-1) 25%, transparent); content: ''; transition: transform 160ms ease; }
.component-anatomy__stage .anatomy-node--toggle-group,
.component-anatomy__stage .anatomy-node--pagination-root,
.component-anatomy__stage .anatomy-node--toolbar-root { display: flex; width: auto; gap: 6px; }
.component-anatomy__stage .anatomy-node--pagination-root { max-width: 100%; flex-wrap: nowrap; justify-content: center; overflow: visible; }
.component-anatomy__stage .anatomy-node--pagination-ellipsis { display: grid; width: 32px; flex: 0 0 32px; place-items: center; color: var(--vp-c-text-3); }
.component-anatomy__stage .anatomy-node--toggle-group .anatomy-node--item,
.component-anatomy__stage .anatomy-node--pagination-root .anatomy-node--item { min-width: 40px; justify-content: center; border: 1px solid var(--vp-c-divider); border-radius: 9px; }
.component-anatomy__stage .anatomy-node--pressed,
.component-anatomy__stage .anatomy-node--current { background: var(--vp-c-brand-1); color: white; }

.component-anatomy__stage .anatomy-node--tags-root { display: flex; width: min(100%, 600px); min-height: 54px; flex-wrap: wrap; align-items: center; gap: 6px; padding: 7px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg); }
.component-anatomy__stage .anatomy-node--tags-root > .anatomy-node--item { display: inline-flex; min-height: 36px; align-items: center; gap: 3px; padding: 4px 4px 4px 10px; border: 1px solid var(--vp-c-divider); border-radius: 9px; color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.component-anatomy__stage .anatomy-node--tags-root > .anatomy-node--item > .anatomy-node--text { min-height: 0; padding: 0; border: 0; background: transparent; }
.component-anatomy__stage .anatomy-node--tags-root [data-part-name='item-delete'] { width: 28px; min-width: 28px; min-height: 28px; padding: 0; border: 0; border-radius: 7px; background: transparent; }
.component-anatomy__stage .anatomy-node--tags-root > [data-part-name='input'] { min-width: 120px; min-height: 36px; flex: 1 1 150px; padding: 0; border: 0; background: transparent; box-shadow: none; }
.component-anatomy__stage .anatomy-node--tags-root > [data-part-name='input'] > .anatomy-node__input { width: 100%; min-width: 0; min-height: 36px; padding: 6px 8px; border: 0; outline: 0; background: transparent; }
.component-anatomy__stage .anatomy-node--tags-root > .anatomy-node--tags-clear { min-height: 36px; padding: 0 10px; border: 0; border-radius: 9px; color: var(--vp-c-text-2); background: transparent; }
.component-anatomy__stage .anatomy-node--pin-root { display: flex; width: min(100%, 600px); align-items: center; gap: 8px; }
.component-anatomy__stage .anatomy-node--pin-cell { flex: none; width: 54px; justify-items: center; font-size: 18px; }

.component-anatomy__stage .anatomy-node--number-stepper { align-items: stretch; }
.component-anatomy__stage .anatomy-node--number-stepper .anatomy-node--input { max-width: 160px; text-align: center; }
.component-anatomy__stage .anatomy-node--color-root { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.component-anatomy__stage .anatomy-node--color-root > [data-part-name='label'],
.component-anatomy__stage .anatomy-node--color-root > [data-part-name='control'],
.component-anatomy__stage .anatomy-node--color-area,
.component-anatomy__stage .anatomy-node--hue-track,
.component-anatomy__stage .anatomy-node--alpha-track,
.component-anatomy__stage .anatomy-node--color-channels,
.component-anatomy__stage .anatomy-node--color-root > .anatomy-node--split-label { grid-column: 1 / -1; }
.component-anatomy__stage .anatomy-node--color-root > [data-part-name='control'] { display: flex; align-items: center; gap: 10px; padding: 8px; }
.component-anatomy__stage .anatomy-node--swatch { width: 42px; height: 42px; border: 1px solid var(--vp-c-divider); border-radius: 10px; background: #5e6ff2; }
.component-anatomy__stage .anatomy-node--accent-swatch { position: relative; flex: none; }
.component-anatomy__stage .anatomy-node--native-color-input {
  position: absolute;
  inset: 3px;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: inherit;
  opacity: 0;
  cursor: pointer;
}
.component-anatomy__stage .anatomy-node--native-color-input > .anatomy-node__input {
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.component-anatomy__stage .anatomy-node--color-area { min-height: 150px; background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, #5e6ff2); }
.component-anatomy__stage .anatomy-node--color-area { cursor: crosshair; }
.component-anatomy__stage .anatomy-node--color-area > .anatomy-node--thumb { top: var(--anatomy-area-y, 36%); left: var(--anatomy-area-x, 68%); pointer-events: none; }
.component-anatomy__stage .anatomy-node--hue-track { background: linear-gradient(90deg, red, #ff0, #0f0, #0ff, #00f, #f0f, red); }
.component-anatomy__stage .anatomy-node--alpha-track { background: linear-gradient(90deg, transparent, #5e6ff2), repeating-conic-gradient(#ddd 0 25%, white 0 50%) 0 / 12px 12px; }
.component-anatomy__stage .anatomy-node--color-channels { display: grid; grid-template-columns: 1fr 1fr; }
.component-anatomy__stage .anatomy-node--coordinate-track { grid-column: 1 / -1; width: 100%; }

.component-anatomy__stage .anatomy-node--carousel-root { display: grid; gap: 14px; }
.component-anatomy__stage .anatomy-node--carousel-root > .anatomy-node--viewport { overflow: hidden; padding: 14px; }
.component-anatomy__stage .anatomy-node--carousel-root .anatomy-node--track { display: flex; height: auto; gap: 12px; background: transparent; }
.component-anatomy__stage .anatomy-node--slide { display: grid; flex: 0 0 72%; min-height: 150px; align-content: end; gap: 5px; padding: 22px; border-radius: 13px; background: var(--vp-c-brand-soft); font-size: 22px; font-weight: 700; }
.component-anatomy__stage .anatomy-node--carousel-actions { justify-content: center; }
.component-anatomy__stage .anatomy-node--carousel-dots { justify-content: center; }
.component-anatomy__stage .anatomy-node--carousel-dots .anatomy-node--indicator { width: 9px; height: 9px; overflow: hidden; border-radius: 50%; background: var(--vp-c-divider); color: transparent; }
.component-anatomy__stage .anatomy-node--carousel-dots .anatomy-node--selected { background: var(--vp-c-brand-1); }

.component-anatomy__stage .anatomy-node--tabs-root,
.component-anatomy__stage .anatomy-node--stepper-root { display: grid; gap: 16px; }
.component-anatomy__stage .anatomy-node--tabs-root { width: min(100%, 580px); padding: 18px; }
.component-anatomy__stage .anatomy-node--tab-list { position: relative; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border: 1px solid var(--vp-c-divider); border-radius: 10px; background: var(--vp-c-bg-soft); }
.component-anatomy__stage .anatomy-node--tab-list .anatomy-node--button { position: relative; z-index: 1; justify-content: center; border: 0; border-radius: 7px; background: transparent; }
.component-anatomy__stage .anatomy-node--tab-list .anatomy-node--button.anatomy-node--preview-active { color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.component-anatomy__stage .anatomy-node--tab-list > .anatomy-node--indicator { position: absolute; right: 50%; bottom: -7px; left: 4px; height: 2px; background: var(--vp-c-brand-1); transition: transform 140ms ease; }
.component-anatomy__stage .anatomy-node--tab-list:has(.anatomy-node--button:nth-child(2).anatomy-node--preview-active) > .anatomy-node--indicator { transform: translateX(calc(100% + 4px)); }
.component-anatomy__stage .anatomy-node--tabs-root > .anatomy-node--panel { min-height: 84px; align-content: center; padding: 18px; }
.component-anatomy__stage .anatomy-node--stepper-root { width: min(100%, 620px); gap: 22px; padding: 24px; }
.component-anatomy__stage .anatomy-node--stepper-root > .anatomy-node--list {
  position: relative;
  display: grid;
  width: 100%;
  overflow: visible;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  padding: 0;
}
.component-anatomy__stage .anatomy-node--stepper-root > .anatomy-node--list::before {
  position: absolute;
  top: 17px;
  right: 16.666%;
  left: 16.666%;
  height: 2px;
  background: var(--vp-c-divider);
  content: '';
}
.component-anatomy__stage .anatomy-node--stepper-root .anatomy-node--stepper-step {
  display: grid;
  min-height: 70px;
  justify-items: center;
  align-content: start;
  gap: 9px;
  padding: 0 8px;
  border: 0;
  color: var(--vp-c-text-2);
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}
.component-anatomy__stage .anatomy-node--stepper-root .anatomy-node--stepper-step.anatomy-node--preview-active { border: 0; color: var(--vp-c-brand-1); background: transparent; }
.component-anatomy__stage .anatomy-node--stepper-root .anatomy-node--stepper-step > .anatomy-node--indicator {
  z-index: 1;
  order: -1;
  display: grid;
  width: 36px;
  height: 36px;
  margin: 0;
  place-items: center;
  border: 2px solid var(--vp-c-divider);
  border-radius: 50%;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  font-size: 13px;
  font-weight: 700;
}
.component-anatomy__stage .anatomy-node--stepper-root .anatomy-node--stepper-step > .anatomy-node--indicator.anatomy-node--preview-active {
  border-color: var(--vp-c-brand-1);
  color: white;
  background: var(--vp-c-brand-1);
}
.component-anatomy__stage .anatomy-node--stepper-root > .anatomy-node--panel { min-height: 76px; align-content: center; padding: 18px 20px; }
.component-anatomy__stage .anatomy-node--stepper-root .anatomy-node--indicator.anatomy-node--selected-part { outline: 0; box-shadow: inset 0 0 0 2px var(--vp-c-brand-1); }

@media (max-width: 560px) {
  .component-anatomy__stage .anatomy-node--stepper-root { padding: 20px 14px; }
  .component-anatomy__stage .anatomy-node--stepper-root .anatomy-node--stepper-step { padding-inline: 3px; font-size: 12px; }
}

.component-anatomy__stage .anatomy-node--accordion-root,
.component-anatomy__stage .anatomy-node--disclosure-root { display: grid; width: min(100%, 580px); overflow: hidden; padding: 0; }
.component-anatomy__stage .anatomy-node--accordion-root > .anatomy-node--item { display: grid; padding: 0; border-bottom: 1px solid var(--vp-c-divider); border-radius: 0; }
.component-anatomy__stage .anatomy-node--accordion-root > .anatomy-node--item:last-child { border-bottom: 0; }
.component-anatomy__stage .anatomy-node--accordion-root .anatomy-node--button,
.component-anatomy__stage .anatomy-node--disclosure-root > .anatomy-node--button { width: 100%; min-height: 52px; justify-content: space-between; padding-inline: 16px; border: 0; border-radius: 0; background: var(--vp-c-bg); font-weight: 650; }
.component-anatomy__stage .anatomy-node--accordion-root .anatomy-node--panel,
.component-anatomy__stage .anatomy-node--disclosure-root .anatomy-node--panel { padding: 14px 16px; border-width: 1px 0 0; border-radius: 0; background: var(--vp-c-bg-soft); }

.component-anatomy__stage .anatomy-node--toolbar-root { padding: 8px; }
.component-anatomy__stage .anatomy-node--timer-root { display: grid; width: min(100%, 500px); justify-items: stretch; gap: 18px; padding: 20px; }
.component-anatomy__stage .anatomy-node--timer-anatomy-heading { width: 100%; align-items: start; justify-content: space-between; }
.component-anatomy__stage .anatomy-node--timer-anatomy-heading .anatomy-node--text { font-size: 14px; }
.component-anatomy__stage .anatomy-node--timer-anatomy-status { padding: 5px 9px; border-radius: 999px; color: var(--vp-c-text-2); background: var(--vp-c-bg-soft); font-size: 11px; font-weight: 700; }
.component-anatomy__stage .anatomy-node--timer-root > .anatomy-node--timer-anatomy-area { display: flex; align-items: baseline; justify-content: center; gap: 2px; padding: 12px 0 6px; border: 0; background: transparent; font: 720 clamp(44px, 9vw, 68px)/1 var(--vp-font-family-mono); letter-spacing: -0.07em; font-variant-numeric: tabular-nums; }
.component-anatomy__stage .anatomy-node--timer-anatomy-area > .anatomy-node--item { min-height: 0; padding: 2px 4px; border: 0; }
.component-anatomy__stage .anatomy-node--timer-anatomy-area > .anatomy-node--separator { height: auto; margin: 0; background: transparent; }
.component-anatomy__stage .anatomy-node--timer-root .anatomy-node--timer-anatomy-actions { display: flex; justify-content: center; gap: 8px; }
.component-anatomy__stage .anatomy-node--timer-anatomy-actions > .anatomy-node--button:first-child { border-color: var(--vp-c-brand-1); color: white; background: var(--vp-c-brand-1); }
.component-anatomy__stage .anatomy-node--toast-viewport { display: grid; width: min(100%, 560px); min-height: 260px; align-items: end; justify-items: end; padding: 20px; }
.component-anatomy__stage .anatomy-node--toast-card { display: grid; width: 330px; gap: 5px; }
.component-anatomy__stage .anatomy-node--toast-card > .anatomy-node--icon-button { position: absolute; top: 10px; right: 10px; }
.component-anatomy__stage .anatomy-node--splitter-root { display: grid; grid-template-columns: minmax(0, var(--anatomy-split, 35%)) 1px minmax(0, 1fr); min-height: 240px; padding: 0; overflow: visible; }
.component-anatomy__stage .anatomy-node--splitter-pane { display: grid; min-width: 0; align-content: center; gap: 5px; padding: 22px; overflow: hidden; }
.component-anatomy__stage .anatomy-node--splitter-pane-navigation { background: var(--vp-c-bg-soft); border-radius: 13px 0 0 13px; }
.component-anatomy__stage .anatomy-node--splitter-pane-editor { background: var(--vp-c-bg); border-radius: 0 13px 13px 0; }
.component-anatomy__stage .anatomy-node--handle { position: relative; z-index: 2; display: block; width: 1px; min-height: 100%; border: 0; border-radius: 0; padding: 0; background: transparent; cursor: col-resize; touch-action: none; }
.component-anatomy__stage .anatomy-node--handle::before,
.component-anatomy__stage .anatomy-node--handle::after { position: absolute; top: 0; bottom: 0; left: 50%; content: ''; transform: translateX(-50%); }
.component-anatomy__stage .anatomy-node--handle::before { width: 13px; }
.component-anatomy__stage .anatomy-node--handle::after { width: 1px; background: var(--vp-c-divider); }
.component-anatomy__stage .anatomy-node--handle:hover::after,
.component-anatomy__stage .anatomy-node--handle:focus-visible::after { background: var(--vp-c-brand-1); }

.component-anatomy__inspector {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, auto);
  gap: 22px;
  align-items: start;
  padding: 18px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.component-anatomy__inspector > div { display: grid; gap: 5px; }
.component-anatomy__inspector > div > span { color: var(--vp-c-text-3); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.component-anatomy__inspector > div > strong { font-size: 16px; }
.component-anatomy__inspector p { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.55; }
.component-anatomy__inspector dl { display: grid; grid-template-columns: auto auto; margin: 0; overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: 9px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.component-anatomy__inspector dt,
.component-anatomy__inspector dd { margin: 0; padding: 7px 10px; }
.component-anatomy__inspector dt { border-right: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); }
.component-anatomy__inspector dd { color: var(--vp-c-brand-1); }
.component-anatomy__non-visual { align-self: center; }

@media (max-width: 720px) {
  .component-anatomy__intro { align-items: flex-start; flex-direction: column; }
  .component-anatomy__stage { min-height: 0; padding: 44px 20px; }
  .component-anatomy__stage .anatomy-node--picker-inputs { grid-template-columns: 1fr; }
  .component-anatomy__stage .anatomy-node--calendar { padding: 10px; }
  .component-anatomy__stage .anatomy-node--week-controls,
  .component-anatomy__stage .anatomy-node--month-row { display: none; }
  .component-anatomy__stage .anatomy-node--submenu { position: static; width: auto; }
  .component-anatomy__stage .anatomy-node--color-root { grid-template-columns: 1fr; }
  .component-anatomy__inspector { grid-template-columns: 1fr; }
}
</style>
