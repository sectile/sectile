<script setup lang="ts">
import DocsSection from './DocsSection.vue';
import { domainAccessibility } from '../accessibility.js';
import AccessibilityReference from './AccessibilityReference.vue';
import DocsDisclosure from './DocsDisclosure.vue';

defineProps<{ area: keyof typeof domainAccessibility }>();
</script>

<template>
  <DocsSection id="accessibility" aria-labelledby="domain-accessibility-title">
    <h2 id="domain-accessibility-title">Keyboard interaction and accessibility</h2>
    <p>Interaction semantics depend on the parts you compose. Expand a family for its keyboard commands, focus behavior and application responsibilities.</p>
    <DocsDisclosure v-for="entry in domainAccessibility[area]" :key="entry.id" class="docs-accessibility-disclosure" data-docs-toc-exclude>
      <template #label>{{ entry.title }}</template>
      <AccessibilityReference :id="`accessibility-${entry.id}`" :reference="entry" :level="3" />
    </DocsDisclosure>
  </DocsSection>
</template>

<style scoped>
.docs-accessibility-disclosure { margin-block: var(--docs-space-3); }
</style>
