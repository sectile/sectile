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
        <div v-if="['NumberField', 'SpinButton', 'Slider', 'Progress', 'Meter', 'Rating', 'Timer', 'Select', 'Combobox', 'Listbox', 'TagsInput', 'PinInput', 'Editable'].includes(example.subject)" class="docs-thumbnail-dialog"><strong>{{ example.subject }}</strong><span>{{ example.title }}</span><i>{{ example.focus }}</i></div>
        <div v-else-if="example.subject === 'Calendar'" class="docs-thumbnail-dialog"><strong>Delivery date</strong><span>October 2026</span><i>Selected day: 3</i></div>
        <div v-else-if="example.subject === 'VirtualList'" class="docs-thumbnail-dialog"><strong>Deliveries</strong><span>500 items</span><i>Nearby rows only</i></div>
        <div v-else-if="example.subject === 'DataTable'" class="docs-thumbnail-dialog"><strong>Project members</strong><span>Ada · Engineer</span><i>Grace · Designer</i></div>
        <div v-else-if="example.subject === 'Chart'" class="docs-thumbnail-dialog"><strong>Weekday deliveries</strong><span>Stable records and numeric axes</span><i>Keyboard inspection</i></div>
        <div v-else-if="example.subject === 'Accordion'" class="docs-thumbnail-dialog"><strong>Delivery</strong><span>Standard delivery takes three working days.</span><i>Returns</i></div>
        <div v-else-if="example.subject === 'Text'" class="docs-thumbnail-form"><span>Display name</span><i>Ada</i></div>
        <div v-else-if="example.subject === 'Switch'" class="docs-thumbnail-switch-label"><span class="docs-thumbnail-switch"><i /></span>Email notifications</div>
        <div v-else-if="example.subject === 'ToggleButton' || example.subject === 'ToggleGroup'" class="docs-thumbnail-choice-row"><span class="is-selected">{{ example.subject === 'ToggleButton' ? 'Pin conversation' : 'bold' }}</span><span v-if="example.subject === 'ToggleGroup'">italic</span></div>
        <div v-else-if="example.subject === 'RadioGroup'" class="docs-thumbnail-radio"><span />Standard delivery</div>
        <div v-else-if="example.subject === 'Tabs'" class="docs-thumbnail-tabs"><div><strong>Overview</strong><span>Activity</span></div><p>Project settings</p></div>
        <div v-else-if="example.subject === 'Popover'" class="docs-thumbnail-dialog"><strong>Delivery details</strong><span>Email notifications</span><i>Close details</i></div>
        <div v-else-if="example.subject === 'Checkbox'" class="docs-thumbnail-checkbox"><span><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></span>Notifications</div>
        <div v-else-if="example.subject === 'Dialog'" class="docs-thumbnail-dialog"><strong>Notification settings</strong><span>Manage delivery preferences.</span><i>Close</i></div>
        <div v-else-if="example.subject === 'Disclosure'" class="docs-thumbnail-dialog"><strong>Delivery preferences</strong><span>Present → exiting → hidden</span><i>Hide details</i></div>
        <div v-else-if="example.area === 'form'" class="docs-thumbnail-form"><span>Email address</span><i>you@example.com</i><strong>Save preferences</strong></div>
        <div v-else class="docs-thumbnail-dialog"><strong>{{ example.subject }}</strong><span>{{ example.title }}</span></div>
      </div>
      <div class="docs-example-card__body"><h3>{{ componentIndex ? example.subject : example.title }}</h3><p>{{ description(example) }}</p><span class="docs-example-card__type">{{ componentIndex ? `${count(example)} ${count(example) === 1 ? 'example' : 'examples'}` : example.kind === 'styling' ? 'Styling example' : 'Behavior example' }}</span></div>
    </a>
  </div>
</template>

<style scoped>
.docs-example-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--docs-space-5);
  margin-top: var(--docs-space-6);
}


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

.docs-thumbnail-checkbox {
  display: flex;
  align-items: center;
  gap: var(--docs-space-3);
}

.docs-thumbnail-checkbox > span {
  display: grid;
  width: var(--docs-checkbox-size);
  height: var(--docs-checkbox-size);
  flex: none;
  place-items: center;
  border: var(--docs-border-width) solid var(--docs-accent);
  border-radius: var(--docs-small-radius);
  background: var(--docs-accent);
  color: var(--docs-on-accent);
}

.docs-thumbnail-checkbox svg { display: block; }

.docs-thumbnail-dialog {
  display: grid;
  width: 220px;
  max-width: 100%;
  gap: var(--docs-space-1);
  padding: var(--docs-space-4);
  border: var(--docs-border-width) solid var(--docs-control-border);
  border-radius: var(--docs-radius);
  background: var(--docs-bg);
}

.docs-thumbnail-dialog span {
  color: var(--docs-text-muted);
  font-size: 11px;
}

.docs-thumbnail-dialog i {
  justify-self: start;
  margin-top: var(--docs-space-2);
  font-size: 11px;
  font-style: normal;
}

.docs-thumbnail-form {
  display: grid;
  width: 210px;
  max-width: 100%;
  gap: var(--docs-space-2);
}

.docs-thumbnail-form i {
  padding: var(--docs-space-2) var(--docs-space-3);
  border: var(--docs-border-width) solid var(--docs-control-border);
  border-radius: var(--docs-field-radius);
  background: var(--docs-bg);
  color: var(--docs-text-muted);
  font-style: normal;
}

.docs-thumbnail-form strong {
  justify-self: start;
  padding: var(--docs-space-2) var(--docs-space-3);
  border-radius: var(--docs-control-radius);
  background: var(--docs-accent);
  color: var(--docs-on-accent);
  font-size: 11px;
  font-weight: 500;
}

@media (max-width: 760px) { .docs-example-grid { gap: var(--docs-space-5); } }
@media (max-width: 520px) { .docs-example-grid { grid-template-columns: 1fr; } }
</style>
