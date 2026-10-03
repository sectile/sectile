<script setup lang="ts">
import DocsRouteLink from './DocsRouteLink.vue';
import { computed, ref } from 'vue';
import { componentPath, components, type ExampleDefinition } from '../examples/catalog.js';
import { runtimeFor } from '../examples/runtime.js';
import CodeBlock from './CodeBlock.vue';
import DocsButton from './DocsButton.vue';
import DocsPreview from './DocsPreview.vue';
import DocsPageHeader from './DocsPageHeader.vue';

const props = defineProps<{ example: ExampleDefinition; embedded?: boolean }>();
const runtime = computed(() => runtimeFor(props.example));
const generation = ref(0);
const accessibilityComponent = computed(() => components.find(component => component.subject === props.example.subject));
</script>

<template>
  <DocsPageHeader :title="example.title" :description="example.description" :level="embedded ? 2 : 1" :heading-id="embedded ? `${example.id}-title` : undefined" />
  <p v-if="!embedded && example.host === 'vue' && accessibilityComponent"><DocsRouteLink :to="`${componentPath(example.subject)}#accessibility-${accessibilityComponent.slug}`">Keyboard interaction and accessibility</DocsRouteLink></p>
  <p v-else-if="!embedded && example.host === 'vue' && example.area !== 'components'"><DocsRouteLink :to="'/vue/' + example.area + '#accessibility'">Keyboard interaction and accessibility</DocsRouteLink></p>
  <section class="docs-example-detail" :aria-labelledby="`${example.id}-preview`">
    <div class="docs-example-detail__heading">
      <component :is="embedded ? 'h3' : 'h2'" :id="`${example.id}-preview`" :data-docs-toc-exclude="embedded ? '' : undefined">Preview</component>
      <div class="docs-example-detail__actions">
        <DocsButton variant="quiet" @click="generation++">Reset example</DocsButton>
      </div>
    </div>
    <DocsPreview :fixture="example.fixture"><component :is="runtime.preview" :key="`${example.id}-${generation}`" /></DocsPreview>
    <div class="docs-code-stack">
      <CodeBlock v-for="section in runtime.code" :key="`${example.id}:${section.path}`" :label="section.label" :source="section.source" :language="section.language" />
    </div>
  </section>
</template>

<style scoped>
.docs-example-detail {
  margin-top: var(--docs-space-6);
}
.docs-example-detail__heading h3 { margin: 0; font-size: 17px; }
.docs-example-detail__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--docs-space-4); font-size: var(--docs-font-size-code); }
.docs-example-detail__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--docs-space-4);
  margin-bottom: var(--docs-space-4);
}

.docs-example-detail__heading h2 {
  margin: 0;
  font-size: 17px;
}

.docs-example-detail__heading > span {
  color: var(--docs-text-muted);
  font-size: var(--docs-font-size-code);
}

@media (max-width: 520px) {
  .docs-example-detail__heading {
    align-items: start;
    flex-direction: column;
    gap: var(--docs-space-1);
  }
}

.docs-code-stack {
  display: grid;
  margin-top: var(--docs-space-5);
  gap: var(--docs-space-4);
  padding-bottom: var(--docs-space-5);
}
</style>
