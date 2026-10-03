<script setup lang="ts">
import { computed } from 'vue';
import { components, componentPath, examplePath, type ExampleDefinition } from '../examples/catalog.js';
import DocsRouteLink from './DocsRouteLink.vue';
import DocsExampleThumbnail from './DocsExampleThumbnail.vue';
const props = defineProps<{ example: ExampleDefinition; componentIndex?: boolean; count: number }>();
const destination = computed(() => props.componentIndex ? componentPath(props.example.subject) : examplePath(props.example));
const description = computed(() => props.componentIndex ? components.find(entry => entry.subject === props.example.subject)?.description : props.example.description);
</script>

<template>
<DocsRouteLink class="docs-example-card" :to="destination">
      <div class="docs-example-card__thumbnail" aria-hidden="true"><DocsExampleThumbnail :example="example" /></div>
      <div class="docs-example-card__body"><h3>{{ componentIndex ? example.subject : example.title }}</h3><p>{{ description }}</p><span class="docs-example-card__type">{{ componentIndex ? `${count} ${count === 1 ? 'example' : 'examples'}` : example.kind === 'styling' ? 'Styling example' : 'Behavior example' }}</span></div>
    </DocsRouteLink>
</template>

<style scoped>
.docs-example-card {
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
  padding: var(--docs-surface-inset);
  overflow: hidden;
  border: var(--docs-border-width) solid var(--docs-border);
  border-radius: var(--docs-radius);
  color: var(--docs-text);
  text-decoration: none;
}

.docs-example-card:hover {
  border-color: var(--docs-control-border);
}

.docs-example-card__thumbnail {
  display: grid;
  min-height: 168px;
  place-items: center;
  padding: var(--docs-space-5);
  min-width: 0;
  border-radius: var(--docs-inner-radius);
  background: var(--docs-bg-muted);
  font-size: var(--docs-font-size-caption);
}

.docs-example-card__body {
  display: flex;
  flex-direction: column;
  align-items: start;
  padding: var(--docs-space-4);
}

.docs-example-card__body h3 {
  margin: 0 0 var(--docs-space-2);
}

.docs-example-card__body p {
  margin: 0 0 var(--docs-space-4);
  color: var(--docs-text-muted);
  font-size: var(--docs-font-size-label);
  line-height: 1.6;
}

.docs-example-card__type {
  margin-top: auto;
  color: var(--docs-text-muted);
  font-size: var(--docs-font-size-caption);
}
</style>
