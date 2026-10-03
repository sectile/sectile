<script setup lang="ts">
import { DisclosureRoot, DisclosureTrigger, DisclosureContent } from '@sectile/vue/disclosure';
import DocsButton from './DocsButton.vue';
import DocsIcon from './DocsIcon.vue';

withDefaults(defineProps<{ modelValue?: boolean | undefined; defaultOpen?: boolean }>(), { modelValue: undefined, defaultOpen: false });
defineEmits<{ 'update:modelValue': [open: boolean] }>();
</script>

<template>
  <DisclosureRoot class="docs-disclosure" v-bind="modelValue === undefined ? {} : { modelValue }" :default-value="defaultOpen" @update:model-value="$emit('update:modelValue', $event)" v-slot="{ open }">
    <div class="docs-disclosure__header">
      <DisclosureTrigger as-child>
        <DocsButton variant="quiet" class="docs-disclosure__trigger"><DocsIcon name="chevron" :size="12" :expanded="open" /><span class="docs-disclosure__label"><slot name="label" :open="open" /></span></DocsButton>
      </DisclosureTrigger>
      <slot name="actions" :open="open" />
    </div>
    <DisclosureContent class="docs-disclosure__content" force-present><slot :open="open" /></DisclosureContent>
  </DisclosureRoot>
</template>

<style scoped>
.docs-disclosure__header {
  display: flex;
  align-items: center;
  gap: var(--docs-space-2);
  height: var(--docs-disclosure-height);
  padding: var(--docs-disclosure-inset);
  --docs-button-height: var(--docs-disclosure-content-height);
  --docs-button-padding: 0px;
}
.docs-disclosure__trigger {
  flex: 1;
  min-width: 0;
  justify-content: flex-start;
  font-weight: 600;
}
.docs-disclosure__label { display: flex; align-items: center; min-width: 0; gap: var(--docs-space-3); }
.docs-disclosure[data-state="open"] > .docs-disclosure__header { box-shadow: inset 0 calc(-1 * var(--docs-border-width)) var(--docs-border); }
.docs-disclosure[data-state="closed"] > .docs-disclosure__content { display: none; }
</style>
