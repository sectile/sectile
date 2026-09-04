<script setup lang="ts" generic="Value">
import { useTemplateRef, type PropType, type VNodeChild } from 'vue';
import {
  VirtualList,
  type VirtualListExpose,
  type VirtualListIDResolver,
  type VirtualListSlotProps,
} from '@sectile/vue/virtual/list';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  items: {
    type: Array as unknown as PropType<readonly Value[]>,
    required: true,
  },
  getID: {
    type: Function as PropType<VirtualListIDResolver<Value, string>>,
    required: true,
  },
  itemExtent: { type: Number, required: true },
  gap: { type: Number, default: 0 },
  overscan: { type: Number, default: 160 },
  maxItems: { type: Number, default: 1_000_000 },
});

defineSlots<{
  item(props: VirtualListSlotProps<Value, string>): VNodeChild;
  empty(): VNodeChild;
}>();

const list = useTemplateRef<VirtualListExpose<string>>('list');
const listItemAttributes = (): { readonly role: 'listitem' } => ({ role: 'listitem' });

defineExpose({
  isAtEnd(threshold = 8) {
    const scrollport = list.value?.scrollport.value;
    if (scrollport === null || scrollport === undefined) return true;
    return scrollport.scrollHeight - scrollport.scrollTop - scrollport.clientHeight <= threshold;
  },
  scrollToID(id: string, alignment?: 'start' | 'center' | 'end' | 'nearest') {
    return list.value?.scrollToID(id, alignment);
  },
});
</script>

<template>
  <VirtualList
    ref="list"
    v-bind="$attrs"
    :items="props.items"
    :get-id="props.getID"
    :size-policy="{ kind: 'fixed', extent: props.itemExtent }"
    :gap="props.gap"
    :overscan="props.overscan"
    :max-items="props.maxItems"
    :item-attributes="listItemAttributes"
    role="list"
  >
    <template #item="slotProps"><slot name="item" v-bind="slotProps" /></template>
    <template #empty><slot name="empty" /></template>
  </VirtualList>
</template>
