<script setup lang="ts">
import { computed } from 'vue';
import type { ExampleDefinition } from '../examples/catalog.js';
import { runtimeFor } from '../examples/runtime.js';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<{ example: ExampleDefinition }>();
const runtime = computed(() => runtimeFor(props.example));
</script>

<template>
  <h1>{{ example.title }}</h1>
  <p class="docs-page__lede">{{ example.description }}</p>
  <section class="docs-example-detail" aria-labelledby="preview-title">
    <div class="docs-example-detail__heading">
      <h2 id="preview-title">Preview</h2>
      <span>{{ example.focus }}</span>
    </div>
    <div class="docs-preview" :class="`docs-preview--${example.fixture}`">
      <component :is="runtime.preview" :key="example.id" />
    </div>
    <p class="docs-preview-note">{{ example.kind === 'styling' ? 'The source includes the styling used in this preview.' : 'Preview styling is supplied by the documentation. The source below focuses on behavior.' }}</p>
    <details class="docs-code-disclosure">
      <summary>Relevant code</summary>
      <div class="docs-code-stack">
        <CodeBlock v-for="section in runtime.code" :key="section.label" :label="section.label" :source="section.source" />
      </div>
    </details>
  </section>
</template>
