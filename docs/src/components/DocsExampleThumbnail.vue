<script setup lang="ts">
import { computed } from 'vue';
import type { ExampleDefinition } from '../examples/catalog.js';
import DocsIcon from './DocsIcon.vue';
const props = defineProps<{ example: ExampleDefinition }>();
const descriptions: Readonly<Record<string, readonly [string, string, string]>> = {
  Calendar: ['Delivery date', 'October 2026', 'Selected day: 3'],
  VirtualList: ['Deliveries', '500 items', 'Nearby rows only'],
  DataTable: ['Project members', 'Ada · Engineer', 'Grace · Designer'],
  Chart: ['Weekday deliveries', 'Stable records and numeric axes', 'Keyboard inspection'],
  Accordion: ['Delivery', 'Standard delivery takes three working days.', 'Returns'],
  Popover: ['Delivery details', 'Email notifications', 'Close details'],
  Dialog: ['Notification settings', 'Manage delivery preferences.', 'Close'],
  Disclosure: ['Delivery preferences', 'Present → exiting → hidden', 'Hide details'],
};
const summary = computed(
  () =>
    descriptions[props.example.subject] ?? [
      props.example.subject,
      props.example.title,
      props.example.focus,
    ],
);
</script>

<template>
  <div v-if="example.subject === 'Text' || example.area === 'form'" class="docs-thumbnail-form">
    <span>{{ example.subject === 'Text' ? 'Display name' : 'Email address' }}</span>
    <i>{{ example.subject === 'Text' ? 'Ada' : 'you@example.com' }}</i>
    <strong v-if="example.area === 'form'">Save preferences</strong>
  </div>
  <div v-else-if="example.subject === 'Switch'" class="docs-thumbnail-switch-label">
    <span class="docs-thumbnail-switch"><i /></span>
    Email notifications
  </div>
  <div
    v-else-if="example.subject === 'ToggleButton' || example.subject === 'ToggleGroup'"
    class="docs-thumbnail-choice-row"
  >
    <span class="is-selected">
      {{ example.subject === 'ToggleButton' ? 'Pin conversation' : 'bold' }}
    </span>
    <span v-if="example.subject === 'ToggleGroup'">italic</span>
  </div>
  <div v-else-if="example.subject === 'RadioGroup'" class="docs-thumbnail-radio">
    <span />
    Standard delivery
  </div>
  <div v-else-if="example.subject === 'Tabs'" class="docs-thumbnail-tabs">
    <div>
      <strong>Overview</strong>
      <span>Activity</span>
    </div>
    <p>Project settings</p>
  </div>
  <div v-else-if="example.subject === 'Checkbox'" class="docs-thumbnail-checkbox">
    <span><DocsIcon name="check" :size="14" /></span>
    Notifications
  </div>
  <div v-else-if="example.subject === 'TreeView'" class="docs-thumbnail-tree">
    <div>
      <DocsIcon name="chevron" expanded />
      Delivery services
    </div>
    <div class="docs-thumbnail-tree__children">
      <span class="is-selected">Standard</span>
      <span>Express</span>
    </div>
    <div>
      <DocsIcon name="chevron" />
      Collection points
    </div>
  </div>
  <div
    v-else-if="['TreeGrid', 'DataGrid', 'DataTreeGrid', 'DataTable'].includes(example.subject)"
    class="docs-thumbnail-table"
  >
    <div class="docs-thumbnail-table__head">
      <span>{{ example.subject === 'TreeGrid' ? 'Parcel' : 'Name' }}</span>
      <span>{{ example.subject === 'TreeGrid' ? 'Status' : 'Role' }}</span>
    </div>
    <div>
      <span>{{ example.subject === 'TreeGrid' ? 'Parcel A' : 'Ada' }}</span>
      <span>{{ example.subject === 'TreeGrid' ? 'Ready' : 'Engineer' }}</span>
    </div>
    <div>
      <span>{{ example.subject === 'TreeGrid' ? 'Parcel B' : 'Grace' }}</span>
      <span>{{ example.subject === 'TreeGrid' ? 'Packed' : 'Designer' }}</span>
    </div>
  </div>
  <div v-else-if="example.subject.endsWith('Field')" class="docs-thumbnail-form">
    <span>{{ example.subject.includes('Time') ? 'Collection time' : 'Delivery date' }}</span>
    <i>{{ example.subject.includes('Time') ? '09:30' : '2026-10-03' }}</i>
    <i v-if="example.subject.includes('Range')">
      {{ example.subject.includes('Time') ? '12:00' : '2026-10-08' }}
    </i>
  </div>
  <div v-else-if="example.area === 'temporal'" class="docs-thumbnail-calendar">
    <strong>October 2026</strong>
    <div>
      <span v-for="(day, index) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="index">
        {{ day }}
      </span>
    </div>
    <div>
      <span
        v-for="day in [28, 29, 30, 1, 2, 3, 4]"
        :key="day"
        :class="{ 'is-selected': day === 3 }"
      >
        {{ day }}
      </span>
    </div>
  </div>
  <div v-else-if="example.area === 'virtual'" class="docs-thumbnail-viewport">
    <span v-for="row in 5" :key="row">Delivery {{ row }}</span>
  </div>
  <svg
    v-else-if="example.area === 'chart'"
    class="docs-thumbnail-chart"
    viewBox="0 0 220 100"
    aria-hidden="true"
  >
    <path d="M12 10v78h196" />
    <polyline points="16,68 52,46 88,58 124,20 160,34 196,12" />
  </svg>
  <div
    v-else-if="
      ['Slider', 'MultiThumbSlider', 'Progress', 'Meter', 'MeterGroup'].includes(example.subject)
    "
    class="docs-thumbnail-range"
  >
    <span />
    <i v-if="['Slider', 'MultiThumbSlider'].includes(example.subject)" />
    <i v-if="example.subject === 'MultiThumbSlider'" class="docs-thumbnail-range__start" />
  </div>
  <div v-else-if="example.subject === 'Grid'" class="docs-thumbnail-slots">
    <span v-for="label in ['Mon', 'Tue', 'Wed', '09:00', '10:00', '11:00']" :key="label">
      {{ label }}
    </span>
  </div>
  <div v-else-if="example.subject === 'WindowSplitter'" class="docs-thumbnail-split">
    <span>Delivery address</span>
    <i />
    <span>Parcel details</span>
  </div>
  <div v-else-if="['Reorder', 'Feed'].includes(example.subject)" class="docs-thumbnail-list">
    <span v-for="(label, index) in ['Reception', 'Warehouse', 'Office']" :key="label">
      <i v-if="example.subject === 'Reorder'">{{ index + 1 }}</i>
      {{ label }}
    </span>
  </div>
  <div
    v-else-if="['CascadeList', 'CascadeSelect'].includes(example.subject)"
    class="docs-thumbnail-columns"
  >
    <div>
      <strong>Country</strong>
      <span>Korea</span>
      <span>Japan</span>
    </div>
    <div>
      <strong>City</strong>
      <span>Seoul</span>
      <span>Busan · unavailable</span>
    </div>
  </div>
  <div
    v-else-if="['Select', 'Combobox', 'Listbox', 'CheckboxGroup'].includes(example.subject)"
    class="docs-thumbnail-list"
  >
    <strong>Delivery method</strong>
    <span class="is-selected">
      Standard
      <DocsIcon name="check" :size="12" />
    </span>
    <span>Express</span>
    <span class="is-muted">Drone · unavailable</span>
  </div>
  <div
    v-else-if="
      [
        'NumberField',
        'SpinButton',
        'QuantityField',
        'ColorPicker',
        'Editable',
        'PinInput',
        'TagsInput',
      ].includes(example.subject)
    "
    class="docs-thumbnail-form"
  >
    <span>
      {{
        example.subject === 'PinInput'
          ? 'Verification code'
          : example.subject === 'TagsInput'
            ? 'Delivery tags'
            : example.subject === 'Editable'
              ? 'Delivery name'
              : example.subject === 'ColorPicker'
                ? 'Label color'
                : 'Quantity'
      }}
    </span>
    <div v-if="example.subject === 'PinInput'" class="docs-thumbnail-choice-row">
      <i v-for="digit in ['1', '2', '3', '4']" :key="digit">{{ digit }}</i>
    </div>
    <div v-else-if="example.subject === 'TagsInput'" class="docs-thumbnail-choice-row">
      <span>priority</span>
      <span>Add a tag</span>
    </div>
    <i v-else>
      {{
        example.subject === 'ColorPicker'
          ? '#4659d4'
          : example.subject === 'Editable'
            ? 'Reception delivery'
            : '3'
      }}
    </i>
  </div>
  <div
    v-else-if="['Pagination', 'Stepper', 'Toolbar', 'Timer', 'Rating'].includes(example.subject)"
    class="docs-thumbnail-choice-row"
  >
    <span
      v-for="(label, index) in example.subject === 'Pagination'
        ? ['Previous', '1', '2', 'Next']
        : example.subject === 'Stepper'
          ? ['Address', 'Delivery', 'Confirm']
          : example.subject === 'Toolbar'
            ? ['Archive', 'Share']
            : example.subject === 'Timer'
              ? ['00:30', 'Start', 'Reset']
              : ['1', '2', '3', '4', '5']"
      :key="label"
      :class="{ 'is-selected': index === (example.subject === 'Pagination' ? 1 : 0) }"
    >
      {{ label }}
    </span>
  </div>
  <div v-else-if="example.subject === 'NavigationMenu'" class="docs-thumbnail-tabs">
    <div>
      <strong>Overview</strong>
      <span>Activity</span>
    </div>
    <p>Project sections</p>
  </div>
  <div
    v-else-if="['Menu', 'MenuButton', 'Menubar'].includes(example.subject)"
    class="docs-thumbnail-list"
  >
    <strong>Message actions</strong>
    <span>Archive</span>
    <span>
      Share
      <DocsIcon name="chevron" :size="12" />
    </span>
  </div>
  <div v-else-if="example.subject === 'Accordion'" class="docs-thumbnail-list">
    <strong>
      Delivery
      <DocsIcon name="chevron" expanded :size="12" />
    </strong>
    <p>Three working days.</p>
    <strong>
      Returns
      <DocsIcon name="chevron" :size="12" />
    </strong>
  </div>
  <div v-else-if="example.subject === 'HostProvider'" class="docs-thumbnail-tabs">
    <div>
      <strong>Overview</strong>
      <span>Activity</span>
    </div>
    <p>
      {{ example.slug.includes('rtl') ? 'Right-to-left navigation' : 'Local portal destination' }}
    </p>
  </div>
  <div v-else-if="example.subject === 'Primitive'" class="docs-thumbnail-choice-row">
    <span>Adopted action</span>
  </div>
  <div v-else class="docs-thumbnail-dialog">
    <strong>{{ summary[0] }}</strong>
    <span>{{ summary[1] }}</span>
    <i v-if="summary[2]">{{ summary[2] }}</i>
  </div>
</template>

<style scoped>
.docs-thumbnail-checkbox {
  display: flex;
  align-items: center;
  gap: var(--docs-space-3);
}

.docs-thumbnail-tree {
  display: grid;
  width: 240px;
  max-width: 100%;
  gap: var(--docs-space-2);
  font-size: var(--docs-font-size-caption);
}
.docs-thumbnail-tree > div {
  display: flex;
  align-items: center;
  gap: var(--docs-space-2);
}
.docs-thumbnail-tree .docs-thumbnail-tree__children {
  display: grid;
  margin-inline-start: var(--docs-space-5);
  padding-inline-start: var(--docs-space-2);
  border-inline-start: var(--docs-border-width) solid var(--docs-border);
}
.docs-thumbnail-tree__children span {
  padding: var(--docs-space-1) var(--docs-space-2);
  border-radius: var(--docs-small-radius);
}
.docs-thumbnail-tree .is-selected {
  background: var(--docs-accent-soft);
}
.docs-thumbnail-table {
  width: 260px;
  max-width: 100%;
  font-size: var(--docs-font-size-caption);
}
.docs-thumbnail-table > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: var(--docs-space-2);
  gap: var(--docs-space-2);
}
.docs-thumbnail-table__head {
  background: var(--docs-bg-muted);
  font-weight: 600;
}
.docs-thumbnail-table > div + div {
  border-top: var(--docs-border-width) solid var(--docs-border);
}
.docs-thumbnail-calendar {
  display: grid;
  width: 240px;
  max-width: 100%;
  gap: var(--docs-space-2);
  font-size: var(--docs-font-size-caption);
}
.docs-thumbnail-calendar > div {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  text-align: center;
}
.docs-thumbnail-calendar span {
  padding: var(--docs-space-1);
}
.docs-thumbnail-calendar .is-selected {
  background: var(--docs-accent-soft);
  border-radius: var(--docs-small-radius);
}
.docs-thumbnail-viewport {
  display: grid;
  width: 240px;
  max-width: 100%;
  max-height: 120px;
  overflow: hidden;
  gap: var(--docs-space-1);
  font-size: var(--docs-font-size-caption);
}
.docs-thumbnail-viewport span {
  padding: var(--docs-space-2);
  background: var(--docs-bg-muted);
  border-radius: var(--docs-small-radius);
}
.docs-thumbnail-chart {
  display: block;
  width: 220px;
  max-width: 100%;
  fill: none;
  stroke-width: 1.5;
}
.docs-thumbnail-chart path {
  stroke: var(--docs-border);
}
.docs-thumbnail-chart polyline {
  stroke: var(--docs-text);
  stroke-linecap: round;
  stroke-linejoin: round;
}
.docs-thumbnail-range {
  position: relative;
  width: 220px;
  max-width: 100%;
  height: var(--docs-range-height);
  border-radius: var(--docs-small-radius);
  background: var(--docs-border);
}
.docs-thumbnail-range span {
  display: block;
  width: 60%;
  height: 100%;
  border-radius: inherit;
  background: var(--docs-text);
}
.docs-thumbnail-range i {
  position: absolute;
  top: 50%;
  left: 60%;
  width: var(--docs-slider-thumb);
  height: var(--docs-slider-thumb);
  transform: translate(-50%, -50%);
  border: var(--docs-border-width) solid var(--docs-text);
  border-radius: 50%;
  background: var(--docs-bg);
}
.docs-thumbnail-range i.docs-thumbnail-range__start {
  left: 20%;
}
.docs-thumbnail-slots {
  display: grid;
  width: 240px;
  max-width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--docs-space-2);
  text-align: center;
  font-size: var(--docs-font-size-caption);
}
.docs-thumbnail-slots span:nth-child(n + 4) {
  padding: var(--docs-space-2);
  background: var(--docs-bg-muted);
  border-radius: var(--docs-small-radius);
}
.docs-thumbnail-split {
  display: grid;
  grid-template-columns: 1fr var(--docs-space-2) 1fr;
  width: 260px;
  max-width: 100%;
  gap: var(--docs-space-3);
  font-size: var(--docs-font-size-caption);
}
.docs-thumbnail-split i {
  min-height: 80px;
  background: var(--docs-border);
  border-radius: var(--docs-small-radius);
}
.docs-thumbnail-list {
  display: grid;
  width: 240px;
  max-width: 100%;
  gap: var(--docs-space-1);
  font-size: var(--docs-font-size-caption);
}
.docs-thumbnail-list :is(span, strong) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--docs-space-2);
  padding: var(--docs-space-2);
  border-radius: var(--docs-small-radius);
}
.docs-thumbnail-list .is-selected {
  background: var(--docs-accent-soft);
}
.docs-thumbnail-list .is-muted {
  color: var(--docs-text-muted);
}
.docs-thumbnail-list i {
  font-style: normal;
  color: var(--docs-text-muted);
}
.docs-thumbnail-list p {
  margin: 0;
  padding: var(--docs-space-2);
  color: var(--docs-text-muted);
}
.docs-thumbnail-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--docs-space-3);
  width: 240px;
  max-width: 100%;
  font-size: var(--docs-font-size-caption);
}
.docs-thumbnail-columns > div {
  display: grid;
  gap: var(--docs-space-2);
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

.docs-thumbnail-checkbox svg {
  display: block;
}

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
</style>
