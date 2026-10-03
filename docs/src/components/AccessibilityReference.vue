<script setup lang="ts">
import type { AccessibilityReference } from '../accessibility.js';

withDefaults(defineProps<{ reference: AccessibilityReference; id: string; level?: 2 | 3 }>(), { level: 2 });
</script>

<template>
  <section :id="id" class="docs-prose-section docs-accessibility" :aria-labelledby="`${id}-keyboard`">
    <component :is="`h${level}`" :id="`${id}-keyboard`">Keyboard interaction</component>
    <p>These commands apply when this control has focus and the relevant operation is available. Native controls retain their own browser behavior.</p>
    <table v-if="reference.keyboard.length" class="docs-keyboard-table" :aria-labelledby="`${id}-keyboard`">
      <thead><tr><th scope="col">Key</th><th scope="col">Action</th></tr></thead>
      <tbody><tr v-for="[keys, action] in reference.keyboard" :key="keys"><th scope="row"><kbd>{{ keys }}</kbd></th><td>{{ action }}</td></tr></tbody>
    </table>
    <p v-else>This surface defines no custom keyboard commands.</p>
    <component :is="`h${level}`" :id="`${id}-semantics`">Accessibility</component>
    <p v-for="paragraph in reference.semantics" :key="paragraph">{{ paragraph }}</p>
    <component :is="`h${level + 1}`">Focus behavior</component>
    <p>{{ reference.focus }}</p>
    <component :is="`h${level + 1}`">Application responsibilities</component>
    <ul><li v-for="paragraph in reference.authoring" :key="paragraph">{{ paragraph }}</li></ul>
  </section>
</template>
