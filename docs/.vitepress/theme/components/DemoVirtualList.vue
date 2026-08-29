<script setup lang="ts" generic="Value">
import { useTemplateRef, type PropType, type VNodeChild } from 'vue';
import {
  VirtualList,
  type VirtualListExpose,
  type VirtualListKeyResolver,
  type VirtualListSlotProps,
} from '@sectile/vue/virtual/list';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  items: {
    type: Array as unknown as PropType<readonly Value[]>,
    required: true,
  },
  getKey: {
    type: Function as PropType<VirtualListKeyResolver<Value>>,
    required: true,
  },
  itemSize: { type: Number, required: true },
  gap: { type: Number, default: 0 },
  overscan: { type: Number, default: 160 },
  maxItems: { type: Number, default: 1_000_000 },
});

defineSlots<{
  default(props: VirtualListSlotProps<Value>): VNodeChild;
  empty(): VNodeChild;
}>();

type VirtualListInstance = VirtualListExpose & { readonly $el: HTMLElement | null };

const list = useTemplateRef<VirtualListInstance>('list');
const listItemAttributes = (): { readonly role: 'listitem' } => ({ role: 'listitem' });

defineExpose({
  isAtEnd(threshold = 8) {
    const root = list.value?.$el;
    if (root === null || root === undefined) return true;
    return root.scrollHeight - root.scrollTop - root.clientHeight <= threshold;
  },
  scrollTo(id: string, alignment?: 'start' | 'center' | 'end' | 'nearest') {
    return list.value?.scrollTo(id, alignment);
  },
});
</script>

<template>
  <VirtualList
    ref="list"
    v-bind="$attrs"
    :items="props.items"
    :get-key="props.getKey"
    :item-size="props.itemSize"
    :gap="props.gap"
    :overscan="props.overscan"
    :max-items="props.maxItems"
    :item-attributes="listItemAttributes"
    role="list"
  >
    <template #default="slotProps"><slot v-bind="slotProps" /></template>
    <template #empty><slot name="empty" /></template>
  </VirtualList>
</template>
