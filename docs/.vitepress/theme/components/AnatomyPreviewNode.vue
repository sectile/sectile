<script setup lang="ts">
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
  GripVertical,
  Italic,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Star,
  X,
} from '@lucide/vue';
import { computed, ref, watch, type Component } from 'vue';
import type { AnatomyIconName, AnatomyPreviewNode } from '../component-anatomy.js';
import {
  anatomyDisplayIcon,
  isAnatomyNodeActive,
  isAnatomyNodeHidden,
  isAnatomyNodeKeyboardInteractive,
} from '../anatomy-interaction.js';

const props = defineProps<{
  node: AnatomyPreviewNode;
  nodePath: string;
  selectedPart: string;
  activePart: string;
  selectedPath: string;
  activePath: string;
  previewValues: Readonly<Record<string, string>>;
  previewState: Readonly<Record<string, string>>;
  component: string;
}>();

const emit = defineEmits<{
  select: [part: string];
  hover: [part: string | null];
  selectPath: [path: string];
  hoverPath: [path: string | null];
  updateValue: [part: string, value: string];
  activate: [node: { readonly part?: string; readonly kind: string; readonly text?: string; readonly value?: string }];
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
const isKeyboardInteractive = computed(() => isAnatomyNodeKeyboardInteractive(props.component, props.node));
const formatOptions = ['HEX', 'RGB', 'HSL', 'HSV', 'CMYK', 'OKLCH'] as const;
const unitOptions = ['mm', 'cm', 'm', 'km', 'in', 'ft'] as const;
const selectOptions = computed(() => isUnitSelect.value ? unitOptions : formatOptions);
const iconComponents: Readonly<Record<AnatomyIconName, Component>> = Object.freeze({
  'align-left': AlignLeft,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  bold: Bold,
  calendar: CalendarDays,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevrons-left': ChevronsLeft,
  'chevrons-right': ChevronsRight,
  ellipsis: Ellipsis,
  'grip-vertical': GripVertical,
  italic: Italic,
  minus: Minus,
  pause: Pause,
  play: Play,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  star: Star,
  x: X,
});
const effectiveValue = computed({
  get: () => props.node.part === undefined
    ? value.value
    : props.previewValues[props.node.part] ?? value.value,
  set: (next: string) => {
    value.value = next;
    if (props.node.part !== undefined) emit('updateValue', props.node.part, next);
  },
});
const displayText = computed(() => {
  if (props.node.part === 'value' && props.previewValues['input'] !== undefined && props.previewValues['unit-select'] !== undefined) {
    return `${props.previewValues['input']} ${props.previewValues['unit-select']}`;
  }
  if (props.component === 'switch' && props.node.part === 'root') return props.previewState['checked'] === 'true' ? 'On' : 'Off';
  if (props.component === 'carousel' && props.node.part === 'pause') return props.previewState['paused'] === 'true' ? 'Resume' : 'Pause';
  if (props.component === 'timer' && props.node.part === 'action-trigger' && props.node.text === 'Pause') return props.previewState['paused'] === 'true' ? 'Resume' : 'Pause';
  if (props.component === 'stepper' && props.node.part === 'content') {
    const labels: Readonly<Record<string, string>> = { account: 'Account', workspace: 'Workspace', review: 'Review' };
    const selected = props.previewState['selected'] ?? 'account';
    return `${labels[selected] ?? 'Account'} details`;
  }
  if (props.component === 'feed' && props.node.part === 'item') {
    const offset = Number(props.previewState['feedOffset'] ?? '0');
    return offset === 0 ? props.node.text : `${props.node.text} ${offset > 0 ? `+${offset}` : offset}`;
  }
  return props.node.text;
});
const displayIcon = computed(() => anatomyDisplayIcon(props.component, props.node, props.previewState));
const displayIconComponent = computed(() => displayIcon.value === undefined ? undefined : iconComponents[displayIcon.value]);
const nodeStyle = computed(() => {
  if (props.node.part === 'area') return { '--anatomy-area-x': `${areaPosition.value.x}%`, '--anatomy-area-y': `${areaPosition.value.y}%` };
  if (props.component === 'window-splitter' && props.node.part === 'root') return { '--anatomy-split': `${props.previewValues['split'] ?? '35'}%` };
  return undefined;
});
const isPreviewActive = computed(() => isAnatomyNodeActive(props.component, props.node, props.previewState));
const isPreviewHidden = computed(() => isAnatomyNodeHidden(props.component, props.node, props.previewState));

watch(() => props.node.text, (next) => {
  if (next !== undefined) value.value = next;
});

function select(node: AnatomyPreviewNode, event: Event): void {
  if (!node.part) return;
  event.stopPropagation();
  emit('select', node.part);
  emit('selectPath', props.nodePath ?? '0');
}

function activate(node: AnatomyPreviewNode, event: Event): void {
  select(node, event);
  emit('activate', {
    kind: node.kind,
    ...(node.part === undefined ? {} : { part: node.part }),
    ...(node.text === undefined ? {} : { text: node.text }),
    ...(node.value === undefined ? {} : { value: node.value }),
  });
}

function hover(node: AnatomyPreviewNode, event: PointerEvent): void {
  if (!node.part) return;
  event.stopPropagation();
  emit('hover', node.part);
  emit('hoverPath', props.nodePath ?? '0');
}

function leave(event: PointerEvent): void {
  event.stopPropagation();
  const next = event.relatedTarget instanceof Element
    ? event.relatedTarget.closest<HTMLElement>('.anatomy-node[data-part-name]')?.dataset['partName'] ?? null
    : null;
  emit('hover', next);
  emit('hoverPath', next === null
    ? null
    : event.relatedTarget instanceof Element
      ? event.relatedTarget.closest<HTMLElement>('.anatomy-node[data-node-path]')?.dataset['nodePath'] ?? null
      : null);
}

function adjustArea(node: AnatomyPreviewNode, event: PointerEvent): void {
  if (node.part !== 'area' || event.button !== 0) return;
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  areaPosition.value = {
    x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
    y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
  };
}

function adjustSplitter(node: AnatomyPreviewNode, event: PointerEvent): void {
  if (props.component !== 'window-splitter' || node.part !== 'handle' || event.button !== 0) return;
  const root = (event.currentTarget as HTMLElement).closest<HTMLElement>('.anatomy-node--splitter-root');
  if (!root) return;
  const target = event.currentTarget as HTMLElement;
  target.setPointerCapture(event.pointerId);
  const update = (pointer: PointerEvent): void => {
    const bounds = root.getBoundingClientRect();
    const value = Math.max(15, Math.min(85, ((pointer.clientX - bounds.left) / bounds.width) * 100));
    emit('updateValue', 'split', value.toFixed(1));
  };
  const finish = (pointer: PointerEvent): void => {
    update(pointer);
    target.removeEventListener('pointermove', update);
    target.removeEventListener('pointerup', finish);
    target.removeEventListener('pointercancel', finish);
  };
  update(event);
  target.addEventListener('pointermove', update);
  target.addEventListener('pointerup', finish);
  target.addEventListener('pointercancel', finish);
}

function handlePointerDown(node: AnatomyPreviewNode, event: PointerEvent): void {
  adjustArea(node, event);
  adjustSplitter(node, event);
}

function handleArrowKey(node: AnatomyPreviewNode, event: KeyboardEvent): void {
  if (props.component !== 'window-splitter' || node.part !== 'handle') return;
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
    ? -1
    : event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : 0;
  if (direction === 0) return;
  event.preventDefault();
  const current = Number(props.previewValues['split'] ?? '35');
  emit('updateValue', 'split', String(Math.max(15, Math.min(85, current + direction * 5))));
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
        'anatomy-node--selected-part': node.part === activePart && nodePath === activePath,
        'anatomy-part-active': node.part === activePart && nodePath === activePath,
        'anatomy-node--native-select': isNativeSelect,
        'anatomy-node--preview-active': isPreviewActive,
        'anatomy-node--preview-hidden': isPreviewHidden,
        'anatomy-node--interactive': isKeyboardInteractive,
      },
    ]"
    :style="nodeStyle"
    :data-part-name="node.part"
    :data-node-path="nodePath"
    @click="activate(node, $event)"
    @focusin="select(node, $event)"
    :role="isKeyboardInteractive && !isButton ? 'button' : undefined"
    :tabindex="isKeyboardInteractive && !isButton ? 0 : undefined"
    :aria-pressed="isKeyboardInteractive && ['item', 'indicator', 'root'].includes(node.part ?? '') ? isPreviewActive : undefined"
    @keydown.enter.prevent="isKeyboardInteractive && activate(node, $event)"
    @keydown.space.prevent="isKeyboardInteractive && activate(node, $event)"
    @keydown="handleArrowKey(node, $event)"
    @pointerdown="handlePointerDown(node, $event)"
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
      <component
        :is="displayIconComponent"
        v-if="displayIconComponent"
        class="anatomy-node__icon"
        :class="{ 'anatomy-node__icon--star': displayIcon === 'star' }"
        aria-hidden="true"
        :stroke-width="2"
        :fill="displayIcon === 'star' && isPreviewActive ? 'currentColor' : 'none'"
      />
      <span v-if="displayText" class="anatomy-node__text">{{ displayText }}</span>
    </button>
    <component
      :is="displayIconComponent"
      v-else-if="displayIconComponent"
      class="anatomy-node__icon"
      :class="{ 'anatomy-node__icon--star': displayIcon === 'star' }"
      aria-hidden="true"
      :stroke-width="2"
      :fill="displayIcon === 'star' && isPreviewActive ? 'currentColor' : 'none'"
    />
    <span v-if="!isTextInput && !isButton && !isNativeSelect && !isColorInput && !isRangeInput && displayText" class="anatomy-node__text">{{ displayText }}</span>
    <span v-if="!isTextInput && node.detail" class="anatomy-node__detail">{{ node.detail }}</span>
    <AnatomyPreviewNode
      v-for="(child, index) in isRangeInput ? [] : node.children"
      :key="`${child.part ?? child.kind}-${index}`"
      :node="child"
      :node-path="`${nodePath ?? '0'}.${index}`"
      :selected-part="selectedPart"
      :active-part="activePart"
      :selected-path="selectedPath"
      :active-path="activePath"
      :preview-values="previewValues"
      :preview-state="previewState"
      :component="component"
      @select="emit('select', $event)"
      @hover="emit('hover', $event)"
      @select-path="emit('selectPath', $event)"
      @hover-path="emit('hoverPath', $event)"
      @update-value="forwardValue"
      @activate="emit('activate', $event)"
    />
    <span v-if="node.part === activePart && nodePath === activePath" class="anatomy-node__part-label anatomy-part-label">{{ node.part }}</span>
  </div>
</template>
