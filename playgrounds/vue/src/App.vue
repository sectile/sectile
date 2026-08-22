<script setup lang="ts">
import { ref } from 'vue';
import { RotateCcw } from '@lucide/vue';
import type { CheckboxValue } from '@sectile/vue/checkbox';
import CheckboxCase from './components/CheckboxCase.vue';

interface CheckboxScenario {
  readonly id: string;
  readonly title: string;
  readonly label: string;
  readonly helper: string;
  readonly description: string;
  readonly initialValue: CheckboxValue;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly asChild?: boolean;
}

const resetEpoch = ref(0);
const scenarios: readonly CheckboxScenario[] = [
  {
    id: 'indeterminate',
    title: 'Partial group selection',
    label: 'Select deployment channels',
    helper: '2 of 3 channels selected',
    description: 'Indeterminate represents a parent whose children are only partly selected.',
    initialValue: 'indeterminate',
  },
  {
    id: 'binary',
    title: 'Optional feature',
    label: 'Include analytics',
    helper: 'Add workspace usage reports',
    description: 'Uncontrolled ownership keeps local state inside CheckboxRoot.',
    initialValue: false,
  },
  {
    id: 'controlled',
    title: 'Controlled agreement',
    label: 'Accept analytics terms',
    helper: 'State is owned through v-model',
    description: 'Controlled ownership proposes changes and follows the parent model.',
    initialValue: true,
    controlled: true,
  },
  {
    id: 'readonly',
    title: 'Read-only review',
    label: 'Production access approved',
    helper: 'Focusable, but immutable',
    description: 'Read-only preserves inspection and focus while rejecting value changes.',
    initialValue: true,
    readonly: true,
  },
  {
    id: 'disabled',
    title: 'Unavailable policy',
    label: 'Enable regional replication',
    helper: 'Unavailable for this plan',
    description: 'Disabled removes the control from focus and pointer interaction.',
    initialValue: false,
    disabled: true,
  },
  {
    id: 'as-child',
    title: 'Consumer element',
    label: 'Use custom button markup',
    helper: 'Semantics merge through asChild',
    description: 'The consumer owns the element while Sectile supplies behavior and attributes.',
    initialValue: false,
    asChild: true,
  },
];
</script>

<template>
  <main class="shell">
    <aside class="component-rail">
      <div class="rail-heading">
        <span class="rail-mark" aria-hidden="true" />
        <strong>Components</strong>
      </div>
      <nav class="demo-nav" aria-label="Component categories">
        <section class="demo-nav-group" data-active="true">
          <h2 class="demo-nav-heading">
            <span>Selection</span>
            <span class="demo-nav-count" aria-label="1 component">1</span>
          </h2>
          <div class="demo-nav-links">
            <a href="#checkbox" aria-current="page" @click.prevent>Checkbox</a>
          </div>
        </section>
      </nav>
    </aside>

    <section id="checkbox" class="playground-content">
      <header class="hero">
        <div>
          <h1>Sectile Vue interaction lab</h1>
          <p class="lede">
            Headless Vue composition over the same DOM semantics, state ownership, and styling hooks.
          </p>
        </div>
      </header>

      <section class="shortcuts" aria-label="Demo controls">
        <div class="shortcut-list">
          <span><kbd>Click</kbd> toggle</span>
          <span><kbd>Tab</kbd> move focus</span>
        </div>
        <button
          type="button"
          class="reset-button secondary button-with-icon"
          aria-label="Reset Checkbox demos"
          title="Reset Checkbox demos"
          @click="resetEpoch += 1"
        >
          <RotateCcw :size="13" aria-hidden="true" />
          Reset
        </button>
      </section>

      <div class="workspace" data-demo="checkbox">
        <CheckboxCase
          v-for="scenario in scenarios"
          :key="`${scenario.id}-${resetEpoch}`"
          :case-id="scenario.id"
          :title="scenario.title"
          :label="scenario.label"
          :helper="scenario.helper"
          :description="scenario.description"
          :initial-value="scenario.initialValue"
          :controlled="scenario.controlled ?? false"
          :disabled="scenario.disabled ?? false"
          :readonly="scenario.readonly ?? false"
          :as-child="scenario.asChild ?? false"
        />
      </div>
    </section>
  </main>
</template>
