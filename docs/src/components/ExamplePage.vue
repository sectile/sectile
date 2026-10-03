<script setup lang="ts">
import { computed, ref } from 'vue';
import { componentPath, components, type ExampleDefinition } from '../examples/catalog.js';
import { routeHref } from '../router.js';
import { runtimeFor } from '../examples/runtime.js';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<{ example: ExampleDefinition; embedded?: boolean }>();
const runtime = computed(() => runtimeFor(props.example));
const generation = ref(0);
const codeOpen = ref(false);
const accessibilityComponent = computed(() => components.find(component => component.subject === props.example.subject));

function toggleCode(event: Event): void {
  codeOpen.value = (event.currentTarget as HTMLDetailsElement).open;
}
</script>

<template>
  <h2 v-if="embedded" :id="`${example.id}-title`" class="docs-section-heading">{{ example.title }}</h2>
  <h1 v-else>{{ example.title }}</h1>
  <p class="docs-page__lede">{{ example.description }}</p>
  <p v-if="!embedded && example.host === 'vue' && accessibilityComponent"><a :href="`${routeHref(componentPath(example.subject))}#accessibility-${accessibilityComponent.slug}`">Keyboard interaction and accessibility</a></p>
  <p v-else-if="!embedded && example.host === 'vue' && example.area !== 'components'"><a :href="routeHref('/vue/' + example.area) + '#accessibility'">Keyboard interaction and accessibility</a></p>
  <section class="docs-example-detail" :aria-labelledby="`${example.id}-preview`">
    <div class="docs-example-detail__heading">
      <component :is="embedded ? 'h3' : 'h2'" :id="`${example.id}-preview`">Preview</component>
      <div class="docs-example-detail__actions">
        <button type="button" @click="generation++">Reset example</button>
      </div>
    </div>
    <div class="docs-preview" :class="`docs-preview--${example.fixture}`">
      <div class="docs-preview-layout">
        <component :is="runtime.preview" :key="`${example.id}-${generation}`" />
      </div>
    </div>
    <p class="docs-preview-note">{{ example.kind === 'styling' ? 'The source includes the styling used in this preview.' : 'Preview styling is supplied by the documentation. The source below focuses on behavior.' }}</p>
    <details class="docs-code-disclosure" @toggle="toggleCode">
      <summary>Relevant code</summary>
      <div class="docs-code-stack">
        <CodeBlock v-for="section in runtime.code" :key="section.label" :label="section.label" :source="section.source" :language="section.language" :active="codeOpen" />
      </div>
    </details>
  </section>
</template>
