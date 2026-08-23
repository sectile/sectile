<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import type { AnatomyPreviewNode } from '../component-anatomy.js';

const props = defineProps<{
  node: AnatomyPreviewNode;
  selectedPart: string;
  activePart: string;
  previewValues: Readonly<Record<string, string>>;
}>();

const emit = defineEmits<{
  select: [part: string];
  hover: [part: string | null];
  updateValue: [part: string, value: string];
}>();

const value = ref(props.node.text ?? (props.node.part === 'native-input' ? '#5e6ff2' : '42'));
const areaPosition = ref({ x: 68, y: 36 });
const isTextInput = computed(() => props.node.kind === 'input' && props.node.part !== 'native-input');
const isColorInput = computed(() => props.node.part === 'native-input');
const isFormatSelect = computed(() => props.node.part === 'format-trigger');
const isUnitSelect = computed(() => props.node.part === 'unit-select');
const isNativeSelect = computed(() => isFormatSelect.value || isUnitSelect.value);
const isRangeInput = computed(() => props.node.part?.endsWith('-slider') === true);
const isButton = computed(() => !isNativeSelect.value && (props.node.kind === 'button' || props.node.kind === 'icon-button'));
const formatOptions = ['HEX', 'RGB', 'HSL', 'HSV', 'CMYK', 'OKLCH'] as const;
const unitOptions = ['mm', 'cm', 'm', 'km', 'in', 'ft'] as const;
const selectOptions = computed(() => isUnitSelect.value ? unitOptions : formatOptions);
const effectiveValue = computed({
  get: () => props.node.part === undefined
    ? value.value
    : props.previewValues[props.node.part] ?? value.value,
  set: (next: string) => {
    value.value = next;
    if (props.node.part !== undefined) emit('updateValue', props.node.part, next);
  },
});
const displayText = computed(() => props.node.part === 'value'
  && props.previewValues['input'] !== undefined
  && props.previewValues['unit-select'] !== undefined
  ? `${props.previewValues['input']} ${props.previewValues['unit-select']}`
  : props.node.text);
const nodeStyle = computed(() => props.node.part === 'area'
  ? { '--anatomy-area-x': `${areaPosition.value.x}%`, '--anatomy-area-y': `${areaPosition.value.y}%` }
  : undefined);

watch(() => props.node.text, (next) => {
  if (next !== undefined) value.value = next;
});

function select(node: AnatomyPreviewNode, event: Event): void {
  if (!node.part) return;
  event.stopPropagation();
  emit('select', node.part);
}

function hover(node: AnatomyPreviewNode, event: PointerEvent): void {
  if (!node.part) return;
  event.stopPropagation();
  emit('hover', node.part);
}

function leave(event: PointerEvent): void {
  event.stopPropagation();
  const next = event.relatedTarget instanceof Element
    ? event.relatedTarget.closest<HTMLElement>('.anatomy-node[data-part-name]')?.dataset['partName'] ?? null
    : null;
  emit('hover', next);
}

function adjustArea(node: AnatomyPreviewNode, event: PointerEvent): void {
  if (node.part !== 'area' || event.button !== 0) return;
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  areaPosition.value = {
    x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
    y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
  };
}

function forwardValue(part: string, next: string): void {
  emit('updateValue', part, next);
}
</script>

<template>
  <div
    class="anatomy-node"
    :class="[
      `anatomy-node--${node.kind}`,
      node.className?.split(' ').map((name) => `anatomy-node--${name}`),
      {
        'anatomy-node--selectable': node.part,
        'anatomy-node--selected-part': node.part === activePart,
        'anatomy-node--native-select': isNativeSelect,
      },
    ]"
    :style="nodeStyle"
    :data-part-name="node.part"
    @click="select(node, $event)"
    @focusin="select(node, $event)"
    @pointerdown="adjustArea(node, $event)"
    @pointerover="hover(node, $event)"
    @pointerout="leave"
  >
    <span v-if="isNativeSelect" class="anatomy-node__select-shell">
      <select v-model="effectiveValue" class="anatomy-node__select" :aria-label="node.detail ?? node.part">
        <option v-for="option in selectOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <ChevronDown class="anatomy-node__select-icon" aria-hidden="true" :stroke-width="2" />
    </span>
    <input v-else-if="isColorInput" v-model="effectiveValue" class="anatomy-node__input" type="color" :aria-label="node.detail ?? node.part">
    <input v-else-if="isRangeInput" v-model="effectiveValue" class="anatomy-node__range-input" type="range" min="0" max="100" :aria-label="node.detail ?? node.part">
    <template v-else-if="isTextInput">
      <span v-if="node.detail" class="anatomy-node__detail">{{ node.detail }}</span>
      <input v-model="effectiveValue" class="anatomy-node__input" type="text" :aria-label="node.detail ?? node.part">
    </template>
    <button v-else-if="isButton" type="button" class="anatomy-node__button">
      <span v-if="node.icon" class="anatomy-node__icon" aria-hidden="true">{{ node.icon }}</span>
      <span v-if="node.text" class="anatomy-node__text">{{ node.text }}</span>
    </button>
    <span v-else-if="node.icon" class="anatomy-node__icon" aria-hidden="true">{{ node.icon }}</span>
    <span v-if="!isTextInput && !isButton && !isNativeSelect && !isColorInput && !isRangeInput && displayText" class="anatomy-node__text">{{ displayText }}</span>
    <span v-if="!isTextInput && node.detail" class="anatomy-node__detail">{{ node.detail }}</span>
    <AnatomyPreviewNode
      v-for="(child, index) in isRangeInput ? [] : node.children"
      :key="`${child.part ?? child.kind}-${index}`"
      :node="child"
      :selected-part="selectedPart"
      :active-part="activePart"
      :preview-values="previewValues"
      @select="emit('select', $event)"
      @hover="emit('hover', $event)"
      @update-value="forwardValue"
    />
    <span v-if="node.part === activePart" class="anatomy-node__part-label">{{ node.part }}</span>
  </div>
</template>
