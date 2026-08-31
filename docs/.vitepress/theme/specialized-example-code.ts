const specializedComponents = new Set([
  'accordion',
  'calendar',
  'cascade-list',
  'cascade-select',
  'checkbox',
  'color-picker',
  'date-field',
  'date-range-field',
  'date-time-field',
  'disclosure',
  'editable',
  'feed',
  'listbox',
  'multi-thumb-slider',
  'radio-group',
  'slider',
  'spin-button',
  'switch',
  'tabs',
  'text',
  'time-field',
  'time-range-field',
  'timer',
  'toast',
  'toggle-button',
  'toggle-group',
  'tree-grid',
  'tree-view',
  'window-splitter',
]);

function treeViewSource(scenario: string): string {
  const multiple = scenario === 'multiple';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { TreeViewDisclosure, TreeViewGroup, TreeViewItem, TreeViewRoot } from '@sectile/vue/tree-view'

const nodes = [
  { id: 'atlas', parentID: null },
  { id: 'apps', parentID: 'atlas' },
  { id: 'dashboard', parentID: 'apps' },
  { id: 'overview', parentID: 'dashboard' },
  { id: 'settings', parentID: 'dashboard' },
  { id: 'packages', parentID: 'atlas' },
  { id: 'tokens', parentID: 'packages' },
]
const expandedValues = ref(['atlas', 'apps', 'dashboard', 'packages'])
<\/script>

<template>
  <TreeViewRoot
    :nodes="nodes"
${multiple ? '    selection-mode="multiple"\n' : ''}
    v-model:expanded-values="expandedValues"
    :default-value="${multiple ? "['overview', 'settings', 'tokens']" : "['settings']"}"
    label="${multiple ? 'Files selected for review' : 'Atlas project files'}"
${multiple ? '    v-slot="{ value }"\n' : ''}
  >
${multiple ? `    <output>{{ value.length }} files selected</output>
` : ''}    <TreeViewItem value="atlas"><TreeViewDisclosure for="atlas" as="button">Toggle</TreeViewDisclosure>Atlas workspace</TreeViewItem>
    <TreeViewGroup for="atlas">
      <TreeViewItem value="apps"><TreeViewDisclosure for="apps" as="button">Toggle</TreeViewDisclosure>Applications</TreeViewItem>
      <TreeViewGroup for="apps">
        <TreeViewItem value="dashboard"><TreeViewDisclosure for="dashboard" as="button">Toggle</TreeViewDisclosure>Dashboard</TreeViewItem>
        <TreeViewGroup for="dashboard">
          <TreeViewItem value="overview">Overview.vue</TreeViewItem>
          <TreeViewItem value="settings">Settings.vue</TreeViewItem>
        </TreeViewGroup>
      </TreeViewGroup>
      <TreeViewItem value="packages"><TreeViewDisclosure for="packages" as="button">Toggle</TreeViewDisclosure>Packages</TreeViewItem>
      <TreeViewGroup for="packages"><TreeViewItem value="tokens">tokens.ts</TreeViewItem></TreeViewGroup>
    </TreeViewGroup>
  </TreeViewRoot>
</template>`;
}

function treeGridSource(scenario: string): string {
  const editable = scenario === 'editable';
  return `<script setup lang="ts">
import { reactive } from 'vue'
import { TreeGridCell, TreeGridDisclosure, TreeGridEditor, TreeGridRoot, TreeGridRow } from '@sectile/vue/tree-grid'

const rows = [
  { id: 'platform', parentID: null, cells: ['platform-name', 'platform-owner', 'platform-status'] },
  { id: 'storefront', parentID: 'platform', cells: ['storefront-name', 'storefront-owner', 'storefront-status'] },
  { id: 'checkout', parentID: 'storefront', cells: ['checkout-name', 'checkout-owner', 'checkout-status'] },
]
const values = reactive(new Map([
  ['platform-name', 'Commerce platform'], ['platform-owner', 'Platform team'], ['platform-status', 'Healthy'],
  ['storefront-name', 'Storefront'], ['storefront-owner', 'Mina Kim'], ['storefront-status', 'Modified'],
  ['checkout-name', 'Checkout flow'], ['checkout-owner', 'Alex Chen'], ['checkout-status', 'In review'],
]))
const valueFor = (id: string) => values.get(id) ?? ''
const updateValue = (id: string, value: string) => values.set(id, value)
</script>

<template>
  <TreeGridRoot
    :rows="rows"
    :get-cell-value="valueFor"
    :set-cell-value="updateValue"
    :default-expanded-value="['platform', 'storefront']"
${editable ? `    default-highlighted-value="storefront-owner"
    default-edit-mode="editing"
` : ''}    aria-label="Project inventory"
    v-slot="{ expandedValue }"
  >
    <div role="row"><span role="columnheader">Resource</span><span role="columnheader">Owner</span><span role="columnheader">Status</span></div>
    <TreeGridRow value="platform" :row-index="1" :expandable="true">
      <TreeGridCell value="platform-name" :column-index="1">
        <TreeGridDisclosure for="platform">Toggle</TreeGridDisclosure>
        {{ valueFor('platform-name') }}
      </TreeGridCell>
      <TreeGridCell value="platform-owner" :column-index="2" v-slot="{ editing }">
        <span v-if="!editing">{{ valueFor('platform-owner') }}</span>
        <TreeGridEditor for="platform-owner" label="Commerce platform owner" />
      </TreeGridCell>
      <TreeGridCell value="platform-status" :column-index="3">{{ valueFor('platform-status') }}</TreeGridCell>
    </TreeGridRow>
    <TreeGridRow v-if="expandedValue.includes('platform')" value="storefront" :row-index="2" :level="2" :expandable="true">
      <TreeGridCell value="storefront-name" :column-index="1">
        <TreeGridDisclosure for="storefront">Toggle</TreeGridDisclosure>
        {{ valueFor('storefront-name') }}
      </TreeGridCell>
      <TreeGridCell value="storefront-owner" :column-index="2" v-slot="{ editing }">
        <span v-if="!editing">{{ valueFor('storefront-owner') }}</span>
        <TreeGridEditor for="storefront-owner" label="Storefront owner" />
      </TreeGridCell>
      <TreeGridCell value="storefront-status" :column-index="3">{{ valueFor('storefront-status') }}</TreeGridCell>
    </TreeGridRow>
    <TreeGridRow v-if="expandedValue.includes('storefront')" value="checkout" :row-index="3" :level="3">
      <TreeGridCell value="checkout-name" :column-index="1">{{ valueFor('checkout-name') }}</TreeGridCell>
      <TreeGridCell value="checkout-owner" :column-index="2" v-slot="{ editing }">
        <span v-if="!editing">{{ valueFor('checkout-owner') }}</span>
        <TreeGridEditor for="checkout-owner" label="Checkout owner" />
      </TreeGridCell>
      <TreeGridCell value="checkout-status" :column-index="3">{{ valueFor('checkout-status') }}</TreeGridCell>
    </TreeGridRow>
  </TreeGridRoot>
</template>`;
}

function feedSource(scenario: string): string {
  if (scenario === 'load-before') {
    return `<script setup lang="ts">
import { computed, ref } from 'vue'
import { FeedItem, FeedLoadEarlier, FeedRoot } from '@sectile/vue/feed'

interface Activity { id: string; title: string; summary: string; actor: string; occurredAt: string }
interface ActivityWindow { items: Activity[]; revision: number; hasEarlier: boolean; total: number }

const initialActivity: Activity[] = [
  { id: 'deployed', title: 'Production deployment completed', summary: 'Release 2026.08 is healthy in all regions.', actor: 'Deploy bot', occurredAt: 'Just now' },
  { id: 'approved', title: 'Release approved', summary: 'Mina approved the production promotion.', actor: 'Mina Kim', occurredAt: '18 min ago' },
]
const activities = ref<Activity[]>(initialActivity)
const revision = ref(12)
const hasEarlier = ref(true)
const total = ref(48)
const itemIDs = computed(() => activities.value.map(({ id }) => id))

async function loadEarlier(direction: 'before' | 'after', anchor: string | null, currentRevision: number) {
  if (direction !== 'before' || !hasEarlier.value) return
  const query = new URLSearchParams({ before: anchor ?? '', revision: String(currentRevision) })
  const response = await fetch(\`/api/releases/2026.08/activity?\${query}\`)
  if (!response.ok) throw new Error('Could not load release history')
  const window = await response.json() as ActivityWindow
  activities.value = [...activities.value, ...window.items]
  revision.value = window.revision
  hasEarlier.value = window.hasEarlier
  total.value = window.total
}
<\/script>

<template>
  <FeedRoot :items="itemIDs" :revision="revision" :set-size="total" label="Release activity" @request-window="loadEarlier">
    <FeedItem v-for="event in activities" :key="event.id" :value="event.id" as="article">
      <strong>{{ event.title }}</strong><p>{{ event.summary }}</p>
      <small>{{ event.actor }} · {{ event.occurredAt }}</small>
    </FeedItem>
    <FeedLoadEarlier v-if="hasEarlier" v-slot="{ pending }">
      {{ pending === 'before' ? 'Loading history…' : 'Load earlier events' }}
    </FeedLoadEarlier>
  </FeedRoot>
</template>`;
  }

  if (scenario === 'load-after') {
    return `<script setup lang="ts">
import { computed, ref } from 'vue'
import { FeedItem, FeedLoadNewer, FeedRoot } from '@sectile/vue/feed'

interface Activity { id: string; title: string; summary: string; actor: string; occurredAt: string }
interface ActivityWindow { items: Activity[]; revision: number }

const initialActivity: Activity[] = [
  { id: 'approved', title: 'Release approved', summary: 'Mina approved the production promotion.', actor: 'Mina Kim', occurredAt: '18 min ago' },
  { id: 'checks', title: 'Required checks passed', summary: 'All 12 release checks completed.', actor: 'CI', occurredAt: '24 min ago' },
]
const activities = ref<Activity[]>(initialActivity)
const revision = ref(20)
const availableUpdates = ref(2)
const itemIDs = computed(() => activities.value.map(({ id }) => id))

async function loadNewer(direction: 'before' | 'after', anchor: string | null, currentRevision: number) {
  if (direction !== 'after') return
  const query = new URLSearchParams({ after: anchor ?? '', revision: String(currentRevision) })
  const response = await fetch(\`/api/releases/2026.08/activity?\${query}\`)
  if (!response.ok) throw new Error('Could not load recent activity')
  const window = await response.json() as ActivityWindow
  activities.value = [...window.items, ...activities.value]
  revision.value = window.revision
  availableUpdates.value = 0
}
<\/script>

<template>
  <FeedRoot :items="itemIDs" :revision="revision" label="Live release activity" @request-window="loadNewer">
    <FeedLoadNewer v-if="availableUpdates > 0" v-slot="{ pending }">
      {{ pending === 'after' ? 'Checking for updates…' : \`${'${availableUpdates}'} new updates\` }}
    </FeedLoadNewer>
    <FeedItem v-for="event in activities" :key="event.id" :value="event.id" as="article">
      <strong>{{ event.title }}</strong><p>{{ event.summary }}</p>
      <small>{{ event.actor }} · {{ event.occurredAt }}</small>
    </FeedItem>
  </FeedRoot>
</template>`;
  }

  return `<script setup lang="ts">
import { FeedItem, FeedRoot } from '@sectile/vue/feed'

const activities = [
  { id: 'deployed', title: 'Production deployment completed', summary: 'Release 2026.08 is healthy in all regions.', actor: 'Deploy bot', occurredAt: 'Just now' },
  { id: 'approved', title: 'Release approved', summary: 'Mina approved the production promotion.', actor: 'Mina Kim', occurredAt: '18 min ago' },
  { id: 'checks', title: 'Required checks passed', summary: 'All 12 release checks completed.', actor: 'CI', occurredAt: '24 min ago' },
] as const
const itemIDs = activities.map(({ id }) => id)
const getPosition = (id: string) => itemIDs.indexOf(id) + 1
<\/script>

<template>
  <FeedRoot :items="itemIDs" :set-size="activities.length" :get-position="getPosition" label="Release activity">
    <FeedItem v-for="event in activities" :key="event.id" :value="event.id" as="article">
      <strong>{{ event.title }}</strong><p>{{ event.summary }}</p>
      <small>{{ event.actor }} · {{ event.occurredAt }}</small>
    </FeedItem>
  </FeedRoot>
</template>`;
}

function windowSplitterSource(scenario: string): string {
  if (scenario === 'nested-layout' || scenario === 'controlled') {
    return `<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle2, FileCode2, Folder, Search } from '@lucide/vue'
import { WindowSplitterHandle, WindowSplitterPane, WindowSplitterRoot } from '@sectile/vue/window-splitter'

const sidebarSize = ref('28')
const editorSize = ref('68')
${scenario === 'controlled' ? '// Parent state remains the source of truth for both separators.\n' : ''}<\/script>

<template>
  <WindowSplitterRoot v-model="sidebarSize" orientation="horizontal" :min="22" :max="46" :step="1">
    <WindowSplitterPane side="before">
      <header><strong>Workspace</strong><Search :size="16" aria-hidden="true" /></header>
      <nav aria-label="Workspace files">
        <span><Folder :size="16" aria-hidden="true" /> components</span>
        <span><FileCode2 :size="16" aria-hidden="true" /> SplitPane.vue</span>
        <span><Folder :size="16" aria-hidden="true" /> tests</span>
      </nav>
    </WindowSplitterPane>
    <WindowSplitterHandle aria-label="Resize workspace and main panes" />
    <WindowSplitterPane side="after">
      <WindowSplitterRoot v-model="editorSize" orientation="vertical" :min="42" :max="78" :step="1">
        <WindowSplitterPane side="before">
          <header><strong>SplitPane.vue</strong><span>TypeScript</span></header>
          <pre><code>const layout = {
  sidebar: {{ sidebarSize }}%,
  editor: {{ editorSize }}%
}</code></pre>
        </WindowSplitterPane>
        <WindowSplitterHandle aria-label="Resize editor and preview panes" />
        <WindowSplitterPane side="after">
          <span><CheckCircle2 :size="17" aria-hidden="true" /> Preview ready</span>
          <small>Both separators remain independently adjustable.</small>
        </WindowSplitterPane>
      </WindowSplitterRoot>
    </WindowSplitterPane>
  </WindowSplitterRoot>
</template>`;
  }

  if (scenario === 'vertical') {
    return `<script setup lang="ts">
import { ref } from 'vue'
import { SquareTerminal } from '@lucide/vue'
import { WindowSplitterHandle, WindowSplitterPane, WindowSplitterRoot } from '@sectile/vue/window-splitter'

const size = ref('56')
<\/script>

<template>
  <WindowSplitterRoot v-model="size" orientation="vertical" :min="32" :max="76" :step="1">
    <WindowSplitterPane side="before">
      <header><strong>Editor</strong><span>main.ts</span></header>
      <pre><code>import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')</code></pre>
    </WindowSplitterPane>
    <WindowSplitterHandle aria-label="Resize editor and terminal panes" />
    <WindowSplitterPane side="after">
      <header><span><SquareTerminal :size="15" aria-hidden="true" /> Terminal</span><span>zsh</span></header>
      <p><span>$</span> pnpm test <span>18 passed</span></p>
    </WindowSplitterPane>
  </WindowSplitterRoot>
</template>`;
  }

  return `<script setup lang="ts">
import { ref } from 'vue'
import { FileCode2, Folder, Search } from '@lucide/vue'
import { WindowSplitterHandle, WindowSplitterPane, WindowSplitterRoot } from '@sectile/vue/window-splitter'

const size = ref('34')
const editorSource = \`<script setup lang="ts">
const release = 'stable'
<\\/script>

<template>
  <ReleaseCard :channel="release" />
</template>\`
<\/script>

<template>
  <WindowSplitterRoot v-model="size" orientation="horizontal" :min="22" :max="72" :step="1">
    <WindowSplitterPane side="before">
      <header><strong>Project</strong><Search :size="16" aria-hidden="true" /></header>
      <nav aria-label="Project files">
        <span><Folder :size="16" aria-hidden="true" /> src</span>
        <span><FileCode2 :size="16" aria-hidden="true" /> App.vue</span>
        <span><FileCode2 :size="16" aria-hidden="true" /> tokens.ts</span>
      </nav>
    </WindowSplitterPane>
    <WindowSplitterHandle aria-label="Resize project and editor panes" />
    <WindowSplitterPane side="after">
      <header><strong>App.vue</strong><span>Saved</span></header>
      <pre><code>{{ editorSource }}</code></pre>
    </WindowSplitterPane>
  </WindowSplitterRoot>
</template>`;
}

function calendarSource(scenario: string): string {
  const week = scenario === 'week';
  const disabled = scenario === 'disabled-weekends';
  return `<script setup lang="ts">
import { ref } from 'vue'
import {
  CalendarCell, CalendarContent, CalendarGrid,
  CalendarNext${week ? 'Week' : 'Month'}, CalendarPrevious${week ? 'Week' : 'Month'}, CalendarRoot,
  type DateValue,
} from '@sectile/vue/temporal/calendar'

const selected = ref<DateValue | null>(null)
const initial = { year: 2026, month: 8, day: 24 }${disabled ? `
const policies = { unavailable: (value: DateValue) => {
  const day = new Date(Date.UTC(value.year, value.month - 1, value.day)).getUTCDay()
  return day === 0 || day === 6
} }` : ''}
<\/script>

<template>
  <CalendarRoot v-model="selected" :default-highlighted-value="initial" default-view="${week ? 'week' : 'month'}"${disabled ? ' :policies="policies"' : ''} v-slot="{ dates, view }" label="Release calendar">
    <CalendarContent>
      <header>
        <CalendarPrevious${week ? 'Week' : 'Month'}>Previous</CalendarPrevious${week ? 'Week' : 'Month'}>
        <strong>{{ view.year }}-{{ view.month }}</strong>
        <CalendarNext${week ? 'Week' : 'Month'}>Next</CalendarNext${week ? 'Week' : 'Month'}>
      </header>
      <CalendarGrid>
        <CalendarCell v-for="day in dates.flat()" :key="\`${'${day.year}-${day.month}-${day.day}'}\`" :value="day">
          {{ day.day }}
        </CalendarCell>
      </CalendarGrid>
    </CalendarContent>
  </CalendarRoot>
</template>`;
}

function multiThumbSliderSource(scenario: string): string {
  const thresholds = scenario === 'three-thumb-thresholds';
  const constrained = scenario === 'crossing-thumbs';
  const thumbs = thresholds ? "['warning', 'review', 'block']" : "['minimum', 'maximum']";
  const values = thresholds ? "['20', '55', '85']" : constrained ? "['35', '70']" : "['120', '340']";
  const min = thresholds || constrained ? '0' : '50';
  const max = thresholds || constrained ? '100' : '500';
  const step = thresholds || constrained ? '5' : '10';
  const policies = constrained ? ' :policies="{ minGap: 2 }"' : '';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { MultiThumbSliderRange, MultiThumbSliderRoot, MultiThumbSliderThumb, MultiThumbSliderTrack } from '@sectile/vue/multi-thumb-slider'

const thumbs = ${thumbs}
const values = ref(${values})
<\/script>

<template>
  <MultiThumbSliderRoot v-model="values" :thumbs="thumbs" min="${min}" max="${max}" step="${step}"${policies}>
    <MultiThumbSliderTrack>
      <MultiThumbSliderRange />
      <MultiThumbSliderThumb v-for="thumb in thumbs" :key="thumb" :value="thumb" />
    </MultiThumbSliderTrack>
    <output>{{ values.join(' – ') }}</output>
  </MultiThumbSliderRoot>
</template>`;
}

function spinButtonSource(scenario: string): string {
  const invalidRecovery = scenario === 'invalid-draft';
  const initial = invalidRecovery ? '10' : scenario === 'controlled' ? '1.5' : '4';
  const min = scenario === 'controlled' ? '-10' : '0';
  const max = scenario === 'controlled' ? '10' : '20';
  const step = scenario === 'controlled' ? '0.5' : '1';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { SpinButtonDecrement, SpinButtonIncrement, SpinButtonInput, SpinButtonRoot } from '@sectile/vue/spin-button'

const value = ref('${initial}')${invalidRecovery ? `
const draft = ref<string | null>(null)` : ''}
<\/script>

<template>
  <SpinButtonRoot v-model="value" min="${min}" max="${max}" step="${step}"${invalidRecovery ? ' @update:draft="draft = $event"' : ''}>
    <SpinButtonDecrement aria-label="Decrease">−</SpinButtonDecrement>
    <SpinButtonInput />
    <SpinButtonIncrement aria-label="Increase">+</SpinButtonIncrement>
  </SpinButtonRoot>${invalidRecovery ? `
  <p v-if="draft !== null">Leaving an invalid edit restores {{ value }}.</p>` : ''}
</template>`;
}

function checkedControlSource(component: 'checkbox' | 'switch' | 'toggle-button', scenario: string): string {
  if (component === 'switch') {
    return `<script setup lang="ts">
import { ref } from 'vue'
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch'

const enabled = ref(false)
<\/script>

<template>
  <SwitchRoot v-model="enabled">
    <span>Deployment notifications</span>
    <SwitchThumb />
  </SwitchRoot>
</template>`;
  }
  if (component === 'checkbox') {
    const initial = scenario === 'mixed' ? "'indeterminate'" : 'false';
    return `<script setup lang="ts">
import { ref } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'

const checked = ref<boolean | 'indeterminate'>(${initial})
<\/script>

<template>
  <CheckboxRoot v-model="checked" v-slot="{ isIndeterminate }">
    <CheckboxIndicator>{{ isIndeterminate ? '−' : '✓' }}</CheckboxIndicator>
    <span>Include analytics</span>
  </CheckboxRoot>
</template>`;
  }
  return `<script setup lang="ts">
import { ref } from 'vue'
import { ToggleButton } from '@sectile/vue/toggle-button'

const pressed = ref(false)
<\/script>

<template>
  <ToggleButton v-model="pressed">Bold</ToggleButton>
</template>`;
}

function nativeFieldSource(component: 'date-field' | 'time-field' | 'date-time-field', scenario: string): string {
  const names = {
    'date-field': ['DateField', "{ year: 2026, month: 8, day: 22 }"],
    'time-field': ['TimeField', "{ hour: 9, minute: 30, second: 0, millisecond: 0 }"],
    'date-time-field': ['DateTimeField', "{ date: { year: 2026, month: 8, day: 22 }, time: { hour: 9, minute: 30, second: 0, millisecond: 0 } }"],
  } as const;
  const [name, fallbackInitial] = names[component];
  const initial = component === 'date-time-field' && scenario === 'cross-midnight'
    ? "{ date: { year: 2026, month: 8, day: 22 }, time: { hour: 23, minute: 45, second: 0, millisecond: 0 } }"
    : fallbackInitial;
  const policies = component === 'date-field' && scenario === 'bounded'
    ? `\nconst policies = {\n  min: { year: 2026, month: 8, day: 1 },\n  max: { year: 2026, month: 8, day: 31 },\n}`
    : component === 'time-field' && scenario === 'stepped'
      ? `\nconst policies = { step: { minute: 15 } }`
      : component === 'date-time-field' && scenario === 'cross-midnight'
        ? `\nconst policies = { step: { minute: 15 } }`
        : '';
  const policyBinding = policies === '' ? '' : ' :policies="policies"';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { ${name} } from '@sectile/vue/${component}'

const value = ref(${initial})${policies}
<\/script>

<template>
  <label>
    <span>${component === 'date-field' ? 'Release date' : component === 'time-field' ? 'Start time' : 'Starts at'}</span>
    <${name} v-model="value"${policyBinding} />
  </label>
</template>`;
}

function dateRangeFieldSource(scenario: string): string {
  const bounded = scenario === 'bounded';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput } from '@sectile/vue/temporal/date-range-field'

const range = ref({
  start: { year: 2026, month: ${bounded ? 9 : 8}, day: ${bounded ? 8 : 22} },
  end: { year: 2026, month: ${bounded ? 9 : 8}, day: ${bounded ? 18 : 25} },
})${bounded ? `
const policies = {
  min: { year: 2026, month: 9, day: 1 },
  max: { year: 2026, month: 9, day: 30 },
}` : ''}
<\/script>

<template>
  <DateRangeFieldRoot v-model="range"${bounded ? ' :policies="policies"' : ''}>
    <label>Start date <DateRangeFieldStartInput name="start" /></label>
    <label>End date <DateRangeFieldEndInput name="end" /></label>
  </DateRangeFieldRoot>
</template>`;
}

function timeRangeFieldSource(scenario: string): string {
  const stepped = scenario === 'stepped';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput } from '@sectile/vue/temporal/time-range-field'

const hours = ref({ start: { hour: 9, minute: 30 }, end: { hour: 17, minute: 45 } })${stepped ? `
const policies = { step: { minute: 15 } }` : ''}
<\/script>

<template>
  <TimeRangeFieldRoot v-model="hours"${stepped ? ' :policies="policies"' : ''}>
    <label>Opens <TimeRangeFieldStartInput name="opens" /></label>
    <label>Closes <TimeRangeFieldEndInput name="closes" /></label>
  </TimeRangeFieldRoot>
</template>`;
}

function accordionSource(scenario: string): string {
  const multiple = scenario === 'multiple';
  const required = scenario === 'required';
  return `<script setup lang="ts">
import {
  AccordionContent, AccordionHeader, AccordionItem,
  AccordionRoot, AccordionTrigger,
} from '@sectile/vue/accordion'

const items = ['general', 'deployments', 'danger']
<\/script>

<template>
  <AccordionRoot
    :items="items"
    type="${multiple ? 'multiple' : 'single'}"
    ${required ? 'default-value="deployments"' : ':collapsible="true"'}
  >
    <AccordionItem v-for="item in items" :key="item" :value="item">
      <AccordionHeader><AccordionTrigger>{{ item }}</AccordionTrigger></AccordionHeader>
      <AccordionContent>Settings for {{ item }}</AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>`;
}

function listboxSource(scenario: string): string {
  const multiple = scenario === 'multiple';
  return `<script setup lang="ts">
import { ListboxItem, ListboxItemIndicator, ListboxItemText, ListboxRoot } from '@sectile/vue/listbox'

const items = ['production', 'staging', 'development']
<\/script>

<template>
  <ListboxRoot
    :items="items"
    selection-mode="${multiple ? 'multiple' : 'single'}"
    :default-value="${multiple ? "['production', 'development']" : "'production'"}"
  >
    <ListboxItem v-for="item in items" :key="item" :value="item">
      <ListboxItemText>{{ item }}</ListboxItemText>
      <ListboxItemIndicator>Selected</ListboxItemIndicator>
    </ListboxItem>
  </ListboxRoot>
</template>`;
}

function textSource(scenario: string): string {
  const multiline = scenario === 'multiline';
  const initial = scenario === 'unicode-selection' ? '한글과 emoji 👋' : scenario === 'ime-mixed' ? '' : 'Sectile';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { TextField } from '@sectile/vue/text'

const value = ref('${initial}')
<\/script>

<template>
  <TextField v-model="value"${multiline ? ' multiline' : ''} />
</template>`;
}

function timerSource(scenario: string): string {
  if (scenario === 'countdown') return `<script setup lang="ts">
import { computed, ref } from 'vue'
import { NumberField } from '@sectile/vue/number-field'
import { TimerActionTrigger, TimerArea, TimerItem, TimerRoot, TimerSeparator } from '@sectile/vue/timer'

const seconds = ref('10')
const durationMs = computed(() => Math.max(1, Number(seconds.value)) * 1_000)
const timerKey = ref(0)
const autoStart = ref(false)
function applyDuration() { autoStart.value = true; timerKey.value += 1 }
<\/script>

<template>
  <label>Seconds <NumberField v-model="seconds" :policies="{ min: '1' }" /></label>
  <button @click="applyDuration">Apply & start</button>
  <TimerRoot :key="timerKey" countdown :start-ms="durationMs" :auto-start="autoStart"
    v-slot="{ running, completed, progress, valueMs }">
    <TimerArea><TimerItem type="minutes" /><TimerSeparator>:</TimerSeparator><TimerItem type="seconds" /></TimerArea>
    <progress :value="progress ?? 0" max="100" />
    <p v-if="completed" role="status">Focus session finished.</p>
    <TimerActionTrigger v-if="running" action="pause">Pause</TimerActionTrigger>
    <TimerActionTrigger v-else-if="valueMs < durationMs" action="resume">Resume</TimerActionTrigger>
    <TimerActionTrigger v-else action="start">Start</TimerActionTrigger>
    <TimerActionTrigger action="reset">Reset</TimerActionTrigger>
  </TimerRoot>
</template>`;

  if (scenario === 'target') return `<script setup lang="ts">
import { computed, ref } from 'vue'
import { NumberField } from '@sectile/vue/number-field'
import { TimerActionTrigger, TimerArea, TimerItem, TimerRoot, TimerSeparator } from '@sectile/vue/timer'

const targetSeconds = ref('15')
const targetMs = computed(() => Math.max(1, Number(targetSeconds.value)) * 1_000)
const timerKey = ref(0)
function applyTarget() { timerKey.value += 1 }
<\/script>

<template>
  <label>Target seconds <NumberField v-model="targetSeconds" :policies="{ min: '1' }" /></label>
  <button @click="applyTarget">Apply target</button>
  <TimerRoot :key="timerKey" :target-ms="targetMs" v-slot="{ running, completed, progress, valueMs }">
    <TimerArea><TimerItem type="minutes" /><TimerSeparator>:</TimerSeparator><TimerItem type="seconds" /></TimerArea>
    <progress :value="progress ?? 0" max="100" />
    <p v-if="completed" role="status">Target reached.</p>
    <TimerActionTrigger v-if="running" action="pause">Pause</TimerActionTrigger>
    <TimerActionTrigger v-else-if="valueMs > 0" action="resume">Resume</TimerActionTrigger>
    <TimerActionTrigger v-else action="start">Start</TimerActionTrigger>
    <TimerActionTrigger action="reset">Reset</TimerActionTrigger>
  </TimerRoot>
</template>`;

  return `<script setup lang="ts">
import { TimerActionTrigger, TimerArea, TimerItem, TimerRoot, TimerSeparator } from '@sectile/vue/timer'
<\/script>

<template>
  <TimerRoot v-slot="{ running, valueMs }">
    <TimerArea><TimerItem type="minutes" /><TimerSeparator>:</TimerSeparator><TimerItem type="seconds" /></TimerArea>
    <TimerActionTrigger v-if="running" action="pause">Pause</TimerActionTrigger>
    <TimerActionTrigger v-else-if="valueMs > 0" action="resume">Resume</TimerActionTrigger>
    <TimerActionTrigger v-else action="start">Start timer</TimerActionTrigger>
    <TimerActionTrigger v-if="valueMs > 0" action="reset">Reset</TimerActionTrigger>
  </TimerRoot>
</template>`;
}

function toastSource(scenario: string): string {
  const persistent = scenario === 'persistent';
  const limit = scenario === 'limited' ? 2 : 3;
  return `<script setup lang="ts">
import { ToastClose, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from '@sectile/vue/toast'
<\/script>

<template>
  <ToastProvider :default-duration-ms="${persistent ? 'null' : '5000'}" :max-visible="${limit}" v-slot="{ toasts, toast }">
    <button @click="toast({ id: crypto.randomUUID(), title: 'Release saved', kind: 'success' })">Notify</button>
    <ToastViewport>
      <ToastRoot v-for="item in toasts" :key="item.id" :value="item.id">
        <ToastTitle /><ToastClose>Dismiss</ToastClose>
      </ToastRoot>
    </ToastViewport>
  </ToastProvider>
</template>`;
}

function toggleGroupSource(scenario: string): string {
  const multiple = scenario === 'multiple';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from '@sectile/vue/toggle-group'

const items = ${multiple ? "['bold', 'italic', 'underline']" : "['left', 'center', 'right']"}
const value = ref(${multiple ? "['bold', 'italic']" : "['left']"})
<\/script>

<template>
  <ToggleGroupRoot :items="items" v-model="value"${multiple ? ' multiple' : ''}>
    <ToggleGroupItem v-for="item in items" :key="item" :value="item">{{ item }}</ToggleGroupItem>
  </ToggleGroupRoot>
</template>`;
}

const staticSources: Readonly<Record<string, string>> = {
  'cascade-list': `<script setup lang="ts">
import { CascadeListColumn, CascadeListItem, CascadeListRoot, CascadeListValue } from '@sectile/vue/cascade-list'
const nodes = [{ id: 'asia', parentID: null }, { id: 'kr', parentID: 'asia' }, { id: 'seoul', parentID: 'kr' }]
<\/script>
<template>
  <CascadeListRoot :nodes="nodes" default-value="seoul" label="Destination" v-slot="{ columns }">
    <CascadeListValue placeholder="Choose a destination" />
    <div class="cascade-list-columns">
      <CascadeListColumn v-for="(_, depth) in columns" :key="depth" :depth="depth" v-slot="{ items }">
        <CascadeListItem v-for="item in items" :key="item" :value="item">{{ item }}</CascadeListItem>
      </CascadeListColumn>
    </div>
  </CascadeListRoot>
</template>`,
  'cascade-select': `<script setup lang="ts">
import { CascadeSelectColumn, CascadeSelectContent, CascadeSelectItem, CascadeSelectRoot, CascadeSelectTrigger, CascadeSelectValue } from '@sectile/vue/cascade-select'
const nodes = [{ id: 'asia', parentID: null }, { id: 'kr', parentID: 'asia' }, { id: 'seoul', parentID: 'kr' }]
<\/script>
<template>
  <CascadeSelectRoot :nodes="nodes" default-value="seoul" v-slot="{ columns }">
    <CascadeSelectTrigger><CascadeSelectValue placeholder="Choose a destination" /></CascadeSelectTrigger>
    <CascadeSelectContent>
      <CascadeSelectColumn v-for="(_, depth) in columns" :key="depth" :depth="depth" v-slot="{ items }">
        <CascadeSelectItem v-for="item in items" :key="item" :value="item">{{ item }}</CascadeSelectItem>
      </CascadeSelectColumn>
    </CascadeSelectContent>
  </CascadeSelectRoot>
</template>`,
  'color-picker': `<script setup lang="ts">
import { ColorPickerAlphaSlider, ColorPickerArea, ColorPickerAreaThumb, ColorPickerFormatTrigger, ColorPickerHueSlider, ColorPickerRoot } from '@sectile/vue/color-picker'
<\/script>
<template>
  <ColorPickerRoot v-slot="color" default-value="#5b6df680" allow-alpha name="accent">
    <ColorPickerArea><ColorPickerAreaThumb /></ColorPickerArea>
    <ColorPickerHueSlider /><ColorPickerAlphaSlider />
    <ColorPickerFormatTrigger format="hsv">HSV</ColorPickerFormatTrigger>
    <output>{{ color.text }}</output>
  </ColorPickerRoot>
</template>`,
  'date-range-field': `<script setup lang="ts">
import { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput } from '@sectile/vue/temporal/date-range-field'
const range = { start: { year: 2026, month: 8, day: 22 }, end: { year: 2026, month: 8, day: 25 } }
<\/script>
<template>
  <DateRangeFieldRoot :default-value="range">
    <DateRangeFieldStartInput name="start" /><span>to</span><DateRangeFieldEndInput name="end" />
  </DateRangeFieldRoot>
</template>`,
  disclosure: `<script setup lang="ts">
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '@sectile/vue/disclosure'
<\/script>
<template>
  <DisclosureRoot :default-value="false">
    <DisclosureTrigger>Advanced options</DisclosureTrigger>
    <DisclosureContent>Configuration</DisclosureContent>
  </DisclosureRoot>
</template>`,
  editable: `<script setup lang="ts">
import { EditableArea, EditableCancelTrigger, EditableEditTrigger, EditableInput, EditablePreview, EditableRoot, EditableSubmitTrigger } from '@sectile/vue/editable'
<\/script>
<template>
  <EditableRoot default-value="release-candidate" v-slot="{ value }">
    <EditableArea><EditablePreview>{{ value }}</EditablePreview><EditableInput />
      <EditableEditTrigger>Edit</EditableEditTrigger><EditableSubmitTrigger>Save</EditableSubmitTrigger><EditableCancelTrigger>Cancel</EditableCancelTrigger>
    </EditableArea>
  </EditableRoot>
</template>`,
  'radio-group': `<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@sectile/vue/radio-group'
const items = ['email', 'push', 'sms']
<\/script>
<template>
  <RadioGroupRoot :items="items" default-value="email" name="channel">
    <RadioGroupItem v-for="item in items" :key="item" :value="item">{{ item }}<RadioGroupIndicator /></RadioGroupItem>
  </RadioGroupRoot>
</template>`,
  slider: `<script setup lang="ts">
import { ref } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider'
const value = ref('40')
<\/script>
<template><SliderRoot v-model="value" min="0" max="100" step="1"><SliderTrack><SliderRange /><SliderThumb /></SliderTrack></SliderRoot></template>`,
  'spin-button': `<script setup lang="ts">
import { ref } from 'vue'
import { SpinButtonDecrement, SpinButtonIncrement, SpinButtonInput, SpinButtonRoot } from '@sectile/vue/spin-button'
const value = ref('1.5')
<\/script>
<template><SpinButtonRoot v-model="value" min="-10" max="10" step="0.5"><SpinButtonDecrement>−</SpinButtonDecrement><SpinButtonInput /><SpinButtonIncrement>+</SpinButtonIncrement></SpinButtonRoot></template>`,
  tabs: `<script setup lang="ts">
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs'
const tabs = ['overview', 'activity', 'settings']
<\/script>
<template><TabsRoot :items="tabs" default-value="overview"><TabsList><TabsTrigger v-for="tab in tabs" :key="tab" :value="tab">{{ tab }}</TabsTrigger><TabsIndicator /></TabsList><TabsContent v-for="tab in tabs" :key="tab" :value="tab">{{ tab }}</TabsContent></TabsRoot></template>`,
  'time-range-field': `<script setup lang="ts">
import { TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput } from '@sectile/vue/temporal/time-range-field'
const hours = { start: { hour: 9, minute: 30 }, end: { hour: 17, minute: 45 } }
<\/script>
<template><TimeRangeFieldRoot :default-value="hours"><TimeRangeFieldStartInput name="start" /><span>to</span><TimeRangeFieldEndInput name="end" /></TimeRangeFieldRoot></template>`,
};

export function specializedVueCodeFor(component: string, scenario: string): string {
  if (!specializedComponents.has(component)) return '';
  if (component === 'calendar') return calendarSource(scenario);
  if (component === 'multi-thumb-slider') return multiThumbSliderSource(scenario);
  if (component === 'spin-button') return spinButtonSource(scenario);
  if (component === 'checkbox' || component === 'switch' || component === 'toggle-button') return checkedControlSource(component, scenario);
  if (component === 'date-field' || component === 'time-field' || component === 'date-time-field') return nativeFieldSource(component, scenario);
  if (component === 'date-range-field') return dateRangeFieldSource(scenario);
  if (component === 'time-range-field') return timeRangeFieldSource(scenario);
  if (component === 'accordion') return accordionSource(scenario);
  if (component === 'listbox') return listboxSource(scenario);
  if (component === 'text') return textSource(scenario);
  if (component === 'timer') return timerSource(scenario);
  if (component === 'toast') return toastSource(scenario);
  if (component === 'toggle-group') return toggleGroupSource(scenario);
  if (component === 'feed') return feedSource(scenario);
  if (component === 'tree-grid') return treeGridSource(scenario);
  if (component === 'tree-view') return treeViewSource(scenario);
  if (component === 'window-splitter') return windowSplitterSource(scenario);
  const source = staticSources[component];
  if (source === undefined) throw new Error(`Missing exact Vue example: ${component}/${scenario}`);
  return source;
}

export function hasSpecializedVueCode(component: string): boolean {
  return specializedComponents.has(component);
}
