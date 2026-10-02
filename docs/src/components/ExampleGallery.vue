<script setup lang="ts">
import { computed } from 'vue';
import { components, componentPath, examplePath, type ExampleDefinition } from '../examples/catalog.js';
import { handleRouteClick, routeHref } from '../router.js';
const props = defineProps<{ examples: readonly ExampleDefinition[]; componentIndex?: boolean }>();
const entries = computed(() => props.componentIndex
  ? props.examples.filter((example, index, all) => all.findIndex((entry) => entry.subject === example.subject) === index)
  : props.examples);
const destination = (example: ExampleDefinition) => props.componentIndex ? componentPath(example.subject) : examplePath(example);
const description = (example: ExampleDefinition) => props.componentIndex ? components.find((entry) => entry.subject === example.subject)?.description : example.description;
const count = (example: ExampleDefinition) => props.examples.filter((entry) => entry.subject === example.subject).length;
</script>

<template>
  <div class="docs-example-grid">
    <a v-for="example in entries" :key="example.id" class="docs-example-card" :href="routeHref(destination(example))" @click="handleRouteClick($event, destination(example))">
      <div class="docs-example-card__thumbnail" aria-hidden="true">
        <div v-if="example.subject === 'Accordion'" class="docs-thumbnail-dialog"><strong>Delivery</strong><span>Standard delivery takes three working days.</span><i>Returns</i></div>
        <div v-else-if="example.subject === 'Text'" class="docs-thumbnail-form"><span>Display name</span><i>Ada</i></div>
        <div v-else-if="example.subject === 'Switch'" class="docs-thumbnail-switch-label"><span class="docs-thumbnail-switch"><i /></span>Email notifications</div>
        <div v-else-if="example.subject === 'ToggleButton' || example.subject === 'ToggleGroup'" class="docs-thumbnail-choice-row"><span class="is-selected">{{ example.subject === 'ToggleButton' ? 'Pin conversation' : 'bold' }}</span><span v-if="example.subject === 'ToggleGroup'">italic</span></div>
        <div v-else-if="example.subject === 'RadioGroup'" class="docs-thumbnail-radio"><span />Standard delivery</div>
        <div v-else-if="example.subject === 'Tabs'" class="docs-thumbnail-tabs"><div><strong>Overview</strong><span>Activity</span></div><p>Project settings</p></div>
        <div v-else-if="example.subject === 'Popover'" class="docs-thumbnail-dialog"><strong>Delivery details</strong><span>Email notifications</span><i>Close details</i></div>
        <div v-else-if="example.subject === 'Checkbox'" class="docs-thumbnail-checkbox"><span><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></span>Notifications</div>
        <div v-else-if="example.subject === 'Dialog'" class="docs-thumbnail-dialog"><strong>Notification settings</strong><span>Manage delivery preferences.</span><i>Close</i></div>
        <div v-else-if="example.subject === 'Disclosure'" class="docs-thumbnail-dialog"><strong>Delivery preferences</strong><span>Present → exiting → hidden</span><i>Hide details</i></div>
        <div v-else class="docs-thumbnail-form"><span>Email address</span><i>you@example.com</i><strong>Save preferences</strong></div>
      </div>
      <div class="docs-example-card__body"><h3>{{ componentIndex ? example.subject : example.title }}</h3><p>{{ description(example) }}</p><span class="docs-example-card__type">{{ componentIndex ? `${count(example)} ${count(example) === 1 ? 'example' : 'examples'}` : example.kind === 'styling' ? 'Styling example' : 'Behavior example' }}</span></div>
    </a>
  </div>
</template>
