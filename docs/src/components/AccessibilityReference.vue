<script setup lang="ts">
import DocsSection from './DocsSection.vue';
import type { AccessibilityReference } from '../accessibility.js';
import DocsTable from './DocsTable.vue';

withDefaults(defineProps<{ reference: AccessibilityReference; id: string; level?: 2 | 3 }>(), { level: 2 });
</script>

<template>
  <DocsSection :id="id" class="docs-accessibility" :aria-labelledby="`${id}-keyboard`">
    <component :is="`h${level}`" :id="`${id}-keyboard`">Keyboard interaction</component>
    <p>These commands apply when this control has focus and the relevant operation is available. Native controls retain their own browser behavior.</p>
    <DocsTable v-if="reference.keyboard.length" :headers="['Key', 'Action']" :rows="reference.keyboard" :aria-labelledby="`${id}-keyboard`"><template #cell="{ value, column }"><kbd v-if="column === 0">{{ value }}</kbd><template v-else>{{ value }}</template></template></DocsTable>
    <p v-else>This surface defines no custom keyboard commands.</p>
    <component :is="`h${level}`" :id="`${id}-semantics`">Accessibility</component>
    <p v-for="paragraph in reference.semantics" :key="paragraph">{{ paragraph }}</p>
    <component :is="`h${level + 1}`">Focus behavior</component>
    <p>{{ reference.focus }}</p>
    <component :is="`h${level + 1}`">Application responsibilities</component>
    <ul><li v-for="paragraph in reference.authoring" :key="paragraph">{{ paragraph }}</li></ul>
  </DocsSection>
</template>

<style scoped>
.docs-accessibility { scroll-margin-top: calc(var(--docs-header-height) + var(--docs-space-5)); }
.docs-accessibility li + li { margin-top: var(--docs-space-2); }
</style>
