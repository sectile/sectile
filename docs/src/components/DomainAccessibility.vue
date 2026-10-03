<script setup lang="ts">
import { domainAccessibility } from '../accessibility.js';
import AccessibilityReference from './AccessibilityReference.vue';

defineProps<{ area: keyof typeof domainAccessibility }>();
</script>

<template>
  <section id="accessibility" class="docs-prose-section" aria-labelledby="domain-accessibility-title">
    <h2 id="domain-accessibility-title">Keyboard interaction and accessibility</h2>
    <p>Interaction semantics depend on the parts you compose. Expand a family for its keyboard commands, focus behavior and application responsibilities.</p>
    <details v-for="entry in domainAccessibility[area]" :key="entry.id" class="docs-accessibility-disclosure">
      <summary>{{ entry.title }}</summary>
      <AccessibilityReference :id="`accessibility-${entry.id}`" :reference="entry" :level="3" />
    </details>
  </section>
</template>
