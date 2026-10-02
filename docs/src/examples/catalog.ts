export const hosts = [
  { id: 'vue', label: 'Vue', description: 'Headless Vue components and Vue-first package integrations.' },
  { id: 'dom', label: 'DOM', description: 'Direct DOM connections for application-owned markup.' },
] as const;

export type ExampleHost = (typeof hosts)[number]['id'];

export const areas = [
  { id: 'components', label: 'Components', description: 'Focused interaction patterns such as checkboxes, dialogs, selects, menus, and overlays.' },
  { id: 'form', label: 'Form', description: 'Validation, submission, field coordination, reset, and server-driven form workflows.' },
  { id: 'temporal', label: 'Temporal', description: 'Dates, time, ranges, calendars, constraints, and scheduling workflows.' },
  { id: 'virtual', label: 'Virtual', description: 'Large collections, measurement, anchoring, scrollports, grids, masonry, and spatial layouts.' },
  { id: 'tabular', label: 'Tabular', description: 'Tables, grids, trees, data sources, selection, editing, and virtualization.' },
  { id: 'chart', label: 'Chart', description: 'Chart data, scales, interaction, visible ranges, rendering, and large-data policies.' },
] as const;

export type ExampleArea = (typeof areas)[number]['id'];
export type ExampleKind = 'behavior' | 'styling';
export type PreviewFixture = 'control' | 'form' | 'surface' | 'viewport' | 'table' | 'chart';

export interface ComponentDefinition {
  readonly subject: string;
  readonly slug: string;
  readonly description: string;
  readonly module: string;
  readonly parts: readonly string[];
  readonly composition: readonly string[];
  readonly interaction: readonly string[];
}

export const components: readonly ComponentDefinition[] = [
  {
    "subject": "NumberField",
    "slug": "number-field",
    "module": "@sectile/vue/number-field",
    "description": "Enter a parcel weight while keeping its committed decimal value as a string.",
    "parts": [
      "NumberField"
    ],
    "composition": [
      "Bind v-model to a string or null and provide a visible label. A draft can differ from the committed value while the user is editing."
    ],
    "interaction": [
      "Native editing and composition are retained. A null value represents an empty field."
    ]
  },
  {
    "subject": "SpinButton",
    "slug": "spin-button",
    "module": "@sectile/vue/spin-button",
    "description": "Edit a parcel quantity directly or advance through an exact range with increment and decrement controls.",
    "parts": [
      "SpinButtonRoot",
      "SpinButtonInput",
      "SpinButtonIncrement",
      "SpinButtonDecrement"
    ],
    "composition": [
      "Provide min and max on the root. Place the input and stepping triggers under that root; v-model receives decimal strings."
    ],
    "interaction": [
      "Arrow keys and the step controls change the quantity. Text editing and committed values are coordinated by the input."
    ]
  },
  {
    "subject": "Slider",
    "slug": "slider",
    "module": "@sectile/vue/slider",
    "description": "Choose notification volume from an exact range with pointer and keyboard input.",
    "parts": [
      "SliderRoot",
      "SliderTrack",
      "SliderRange",
      "SliderThumb",
      "SliderInput"
    ],
    "composition": [
      "Place the range and thumb inside the track. Bind v-model to a value that lies exactly on the configured step."
    ],
    "interaction": [
      "Arrow keys advance one step. Home and End move to the range endpoints. Supply an accessible label for the thumb."
    ]
  },
  {
    "subject": "Progress",
    "slug": "progress",
    "module": "@sectile/vue/progress",
    "description": "Report completed work against a maximum without making the indicator itself editable.",
    "parts": [
      "ProgressRoot",
      "ProgressTrack",
      "ProgressIndicator",
      "ProgressValueText"
    ],
    "composition": [
      "Supply value and max on the root. A null value represents indeterminate progress; known progress exposes its percentage as a CSS variable."
    ],
    "interaction": [
      "Progress communicates status rather than accepting input. This example uses separate application buttons to advance its simulated upload."
    ]
  },
  {
    "subject": "Meter",
    "slug": "meter",
    "module": "@sectile/vue/meter",
    "description": "Describe a measured value within a range and show whether its configured thresholds are preferable.",
    "parts": [
      "MeterRoot",
      "MeterTrack",
      "MeterIndicator",
      "MeterValueText"
    ],
    "composition": [
      "Provide value, min and max. low, high and optimum describe the preferred part of the range. Keep a visible explanation of the measurement."
    ],
    "interaction": [
      "A meter reports a measurement, not task completion. The slot exposes zone so the application can show equivalent text alongside color."
    ]
  },
  {
    "subject": "Rating",
    "slug": "rating",
    "module": "@sectile/vue/rating",
    "description": "Select a delivery score or leave the question unanswered by clearing the selection.",
    "parts": [
      "RatingRoot",
      "RatingItem",
      "RatingIndicator",
      "RatingClear"
    ],
    "composition": [
      "Provide ordered string values and matching RatingItem values. Bind v-model to the selected string; an empty string represents no answer."
    ],
    "interaction": [
      "Arrow keys move through available scores. clearable permits RatingClear to remove the selected score."
    ]
  },
  {
    "subject": "Timer",
    "slug": "timer",
    "module": "@sectile/vue/timer",
    "description": "Start, pause, resume and reset a ten-second countdown without starting it on page load.",
    "parts": [
      "TimerRoot",
      "TimerControl",
      "TimerItem",
      "TimerActionTrigger"
    ],
    "composition": [
      "Configure startMs, targetMs and countdown on the root. TimerItem renders a named time part; action triggers control the same timer."
    ],
    "interaction": [
      "The timer starts only when requested here. It owns its scheduled updates and disconnects when the root unmounts."
    ]
  },
  {
    subject: 'Accordion', slug: 'accordion', module: '@sectile/vue/accordion',
    description: 'Organize related sections into expandable panels with one or several panels open at a time.',
    parts: ['AccordionRoot', 'AccordionItem', 'AccordionHeader', 'AccordionTrigger', 'AccordionContent'],
    composition: ['Provide panel values in the root items array. Each item wraps its heading, trigger, and content.', 'Single mode uses a string value; multiple mode uses an array. Set collapsible to false when the selected panel should remain open.'],
    interaction: ['Activate a heading button to toggle its panel. Arrow keys move between heading buttons; Home and End move to the first and last available heading.'],
  },
  {
    subject: 'Text', slug: 'text', module: '@sectile/vue/text',
    description: 'Connect application text to a native input or textarea while retaining native editing and composition.',
    parts: ['TextField'],
    composition: ['Wrap TextField in a visible label, or associate it with a label using an id. Bind v-model to your application value.', 'multiline renders a textarea. v-model.lazy commits on the native change event rather than on each edit.'],
    interaction: ['Native selection, clipboard editing, and text composition remain available. readonly permits reading and selection without editing; disabled prevents interaction.'],
  },
  {
    subject: 'Switch', slug: 'switch', module: '@sectile/vue/switch',
    description: 'A boolean setting with a persistent thumb. Application state can own the checked value.',
    parts: ['SwitchRoot', 'SwitchThumb'],
    composition: ['Place SwitchThumb inside SwitchRoot and provide a visible label. Bind v-model to a boolean value, or use defaultValue for component-owned state.'],
    interaction: ['Tab focuses the switch. Space toggles its checked state. disabled prevents interaction; readonly preserves the value without disabling focus.'],
  },
  {
    subject: 'ToggleButton', slug: 'toggle-button', module: '@sectile/vue/toggle-button',
    description: 'A button that keeps a pressed state, such as pinning a conversation or enabling a text format.',
    parts: ['ToggleButton'],
    composition: ['Bind v-model to a boolean pressed value. The visible label names the action; aria-pressed communicates its current state.'],
    interaction: ['Activate the button with Space, Enter, or a pointer. disabled prevents activation; readonly keeps the pressed value fixed.'],
  },
  {
    subject: 'ToggleGroup', slug: 'toggle-group', module: '@sectile/vue/toggle-group',
    description: 'Coordinate several pressed choices with shared keyboard navigation and single or multiple selection.',
    parts: ['ToggleGroupRoot', 'ToggleGroupItem'],
    composition: ['Give the root an items array and each ToggleGroupItem a matching value. v-model is an array even when only one choice is allowed.', 'Enable multiple for independent choices. disabledItems identifies choices that cannot be activated.'],
    interaction: ['Arrow keys move focus through enabled items. Space or Enter toggles the focused choice. Provide a label for the group.'],
  },
  {
    subject: 'RadioGroup', slug: 'radio-group', module: '@sectile/vue/radio-group',
    description: 'Choose one option from a labeled group, with selection and keyboard focus coordinated across its items.',
    parts: ['RadioGroupRoot', 'RadioGroupItem', 'RadioGroupIndicator'],
    composition: ['Give the root an items array and each RadioGroupItem a matching value. Bind v-model to the selected string and give the group an accessible label.', 'Keep the visible radio box outside RadioGroupIndicator so its outline persists when the item is unchecked.'],
    interaction: ['Arrow keys move through enabled options. disabledItems excludes unavailable choices from activation.'],
  },
  {
    subject: 'Tabs', slug: 'tabs', module: '@sectile/vue/tabs',
    description: 'Switch between related sections with coordinated tab selection, focus, and panel visibility.',
    parts: ['TabsRoot', 'TabsList', 'TabsTrigger', 'TabsContent'],
    composition: ['Provide item values on TabsRoot, then use matching values on TabsTrigger and TabsContent. Give TabsList a label.', 'Bind v-model to the selected string. activationMode can be automatic or manual; disabledItems identifies unavailable sections.'],
    interaction: ['Arrow keys move focus through enabled tabs. In manual mode, Enter or Space activates the focused tab without selecting it merely because focus moved.'],
  },
  {
    subject: 'Popover', slug: 'popover', module: '@sectile/vue/popover',
    description: 'Show a positioned, non-modal surface beside its trigger without blocking the rest of the page.',
    parts: ['PopoverRoot', 'PopoverTrigger', 'PopoverPortal', 'PopoverContent', 'PopoverTitle', 'PopoverDescription', 'PopoverClose'],
    composition: ['Keep the trigger and portal under PopoverRoot. Place labeled content and a close control inside the portal. Bind v-model:open when your application owns open state.'],
    interaction: ['Activate the trigger to toggle the surface. Escape, the close control, or an outside interaction dismisses it by default. The surface is non-modal; it does not require a page-wide overlay.'],
  },
  {
    subject: 'Checkbox', slug: 'checkbox', module: '@sectile/vue/checkbox',
    description: 'A two-state or indeterminate selection control. Compose its interactive root and conditional indicator, with state owned by the component or your application.',
    parts: ['CheckboxRoot', 'CheckboxIndicator'],
    composition: ['The root renders the interactive element; the indicator appears for checked or indeterminate state. Give the root a visible label or an aria-label.', 'Bind v-model when the application owns the value. Use defaultValue for an initial component-owned value.'],
    interaction: ['Tab focuses the control. Space changes its checked state. disabled prevents interaction; readonly keeps the value fixed without making the control disabled.'],
  },
  {
    subject: 'Dialog', slug: 'dialog', module: '@sectile/vue/dialog',
    description: 'A modal surface for a task that needs protected focus. Compose a trigger, portal, overlay, and labeled content while Sectile coordinates dismissal and focus.',
    parts: ['DialogRoot', 'DialogTrigger', 'DialogPortal', 'DialogOverlay', 'DialogContent', 'DialogTitle', 'DialogDescription', 'DialogClose'],
    composition: ['Keep the trigger and portal under the same DialogRoot. Place the overlay, content, title, description, and close control inside the portal.', 'DialogTitle and DialogDescription supply the accessible name and description. Bind v-model:open when the application owns open state.'],
    interaction: ['The default modal dialog moves focus into its content and keeps keyboard focus inside while open. Escape dismisses it; focus returns to the trigger on close. A visible close control gives pointer and keyboard users an explicit way to dismiss it.'],
  },
  {
    subject: 'Disclosure', slug: 'disclosure', module: '@sectile/vue/disclosure',
    description: 'Show or hide a section of content. Its presence handling retains the section during an exit transition and makes the exiting content inert.',
    parts: ['DisclosureRoot', 'DisclosureTrigger', 'DisclosureContent'],
    composition: ['Place the trigger and content inside DisclosureRoot. Bind v-model when your application owns the open state.'],
    interaction: ['Style the content’s data-state attribute with CSS transitions. During an exit, content remains present but inert; once the transition ends it becomes hidden. Reopening during an exit keeps the content available. A reduced-motion rule can disable the transition.'],
  },
];

export function componentPath(subject: string): string {
  const component = components.find((entry) => entry.subject === subject);
  if (!component) throw new TypeError(`Unknown documented component: ${subject}`);
  return `/vue/components/${component.slug}`;
}

export interface ExampleDefinition {
  readonly id: string;
  readonly host: ExampleHost;
  readonly area: ExampleArea;
  readonly subject: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly focus: string;
  readonly kind: ExampleKind;
  readonly fixture: PreviewFixture;
  readonly tags: readonly string[];
  readonly sourceOwner: ExampleHost;
  readonly previewPath: string;
  readonly code: readonly {
    readonly label: string;
    readonly language: 'vue' | 'ts';
    readonly path: string;
  }[];
  readonly related: readonly string[];
}

export const examples: readonly ExampleDefinition[] = [
  {
    "id": "vue-components-number-field-decimal-value",
    "host": "vue",
    "area": "components",
    "subject": "NumberField",
    "slug": "number-field/decimal-value",
    "title": "Exact decimal input",
    "description": "Enter a parcel weight while keeping its committed decimal value as a string.",
    "focus": "Exact decimal input",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "NumberField",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/number-field/decimal-value/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/number-field/decimal-value/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-spin-button-bounded-quantity",
    "host": "vue",
    "area": "components",
    "subject": "SpinButton",
    "slug": "spin-button/bounded-quantity",
    "title": "A bounded quantity",
    "description": "Edit a parcel quantity directly or advance through an exact range with increment and decrement controls.",
    "focus": "A bounded quantity",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "SpinButton",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/spin-button/bounded-quantity/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/spin-button/bounded-quantity/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-slider-stepped-value",
    "host": "vue",
    "area": "components",
    "subject": "Slider",
    "slug": "slider/stepped-value",
    "title": "A stepped slider",
    "description": "Choose notification volume from an exact range with pointer and keyboard input.",
    "focus": "A stepped slider",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Slider",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/slider/stepped-value/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/slider/stepped-value/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-progress-determinate-value",
    "host": "vue",
    "area": "components",
    "subject": "Progress",
    "slug": "progress/determinate-value",
    "title": "Determinate upload progress",
    "description": "Report completed work against a maximum without making the indicator itself editable.",
    "focus": "Determinate upload progress",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Progress",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/progress/determinate-value/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/progress/determinate-value/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-meter-threshold-zones",
    "host": "vue",
    "area": "components",
    "subject": "Meter",
    "slug": "meter/threshold-zones",
    "title": "Storage threshold zones",
    "description": "Describe a measured value within a range and show whether its configured thresholds are preferable.",
    "focus": "Storage threshold zones",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Meter",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/meter/threshold-zones/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/meter/threshold-zones/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-rating-clearable-score",
    "host": "vue",
    "area": "components",
    "subject": "Rating",
    "slug": "rating/clearable-score",
    "title": "A clearable rating",
    "description": "Select a delivery score or leave the question unanswered by clearing the selection.",
    "focus": "A clearable rating",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Rating",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/rating/clearable-score/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/rating/clearable-score/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-timer-countdown-controls",
    "host": "vue",
    "area": "components",
    "subject": "Timer",
    "slug": "timer/countdown-controls",
    "title": "A controlled countdown",
    "description": "Start, pause, resume and reset a ten-second countdown without starting it on page load.",
    "focus": "A controlled countdown",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Timer",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/timer/countdown-controls/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/timer/countdown-controls/Preview.vue"
      }
    ],
    "related": []
  },
  {
    id: 'vue-temporal-calendar-selection', host: 'vue', area: 'temporal', subject: 'Calendar',
    slug: 'calendar-selection', title: 'Selecting a calendar date',
    description: 'Choose a calendar day, move to the previous or next month, and inspect the application value. A fixed reference date keeps this example deterministic.', focus: 'Calendar selection with a reference date',
    kind: 'behavior', fixture: 'surface', tags: ["v-model","referenceDate","keyboard"], sourceOwner: 'vue',
    previewPath: './vue/temporal/calendar-selection/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/temporal/calendar-selection/Preview.vue' }], related: [],
  },
  {
    id: 'vue-virtual-fixed-list', host: 'vue', area: 'virtual', subject: 'VirtualList',
    slug: 'fixed-list', title: 'Fixed-height virtual list',
    description: 'Scroll through 500 deliveries while only nearby placements are mounted. Each row has an exact 44px extent and the root owns scrolling.', focus: 'Fixed sizing and bounded mounted rows',
    kind: 'behavior', fixture: 'viewport', tags: ["sizePolicy","getID","overscan"], sourceOwner: 'vue',
    previewPath: './vue/virtual/fixed-list/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/virtual/fixed-list/Preview.vue' }], related: [],
  },
  {
    id: 'vue-tabular-local-source', host: 'vue', area: 'tabular', subject: 'DataTable',
    slug: 'local-source', title: 'A native table from a source',
    description: 'Render project members from a local resolver with native table semantics. The source runs after mounting; loading and retry presentation belong to the application.', focus: 'Typed source response and native table composition',
    kind: 'behavior', fixture: 'table', tags: ["source","Provider","native table"], sourceOwner: 'vue',
    previewPath: './vue/tabular/local-source/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/tabular/local-source/Preview.vue' }, { label: 'TypeScript · source resolver', language: 'ts', path: './vue/tabular/local-source/example.ts' }], related: [],
  },
  {
    id: 'vue-chart-line-series', host: 'vue', area: 'chart', subject: 'Chart',
    slug: 'line-series', title: 'A labeled line series',
    description: 'Map delivery records to two numeric axes and a line layer. Drawing begins after mounting; keyboard navigation uses application-provided record labels.', focus: 'Declarative axes, stable IDs and accessible records',
    kind: 'behavior', fixture: 'chart', tags: ["ChartLine","keyboard","stable IDs"], sourceOwner: 'vue',
    previewPath: './vue/chart/line-series/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/chart/line-series/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-checkbox-default-state', host: 'vue', area: 'components',
    subject: 'Checkbox', slug: 'checkbox/default-state', title: 'Component-owned state',
    description: 'Start checked with defaultValue. The component owns later updates, and its slot exposes the current value without an application ref.', focus: 'Default value and state slot',
    kind: 'behavior', fixture: 'control', tags: ['defaultValue', 'slot'], sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/default-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/checkbox/default-state/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-checkbox-indeterminate-state', host: 'vue', area: 'components',
    subject: 'Checkbox', slug: 'checkbox/indeterminate-state', title: 'Indeterminate state',
    description: 'Begin with a mixed value and a dash indicator. Activate the checkbox to change its value, or restore the mixed state from application data.', focus: 'Mixed value and indicator slot',
    kind: 'behavior', fixture: 'control', tags: ['indeterminate', 'slot', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/indeterminate-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/checkbox/indeterminate-state/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-checkbox-readonly-disabled', host: 'vue', area: 'components',
    subject: 'Checkbox', slug: 'checkbox/readonly-disabled', title: 'Read-only and disabled',
    description: 'Compare two checked controls. Both keep their values fixed, but the read-only control remains focusable while the disabled control is unavailable.', focus: 'Fixed value with different focus behavior',
    kind: 'behavior', fixture: 'control', tags: ['readonly', 'disabled', 'focus'], sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/readonly-disabled/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/checkbox/readonly-disabled/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-switch-readonly-disabled', host: 'vue', area: 'components',
    subject: 'Switch', slug: 'switch/readonly-disabled', title: 'Read-only and disabled',
    description: 'Compare enabled settings that cannot be changed. Tab can reach the read-only setting, while the disabled setting is unavailable.', focus: 'Read-only versus disabled settings',
    kind: 'behavior', fixture: 'control', tags: ['readonly', 'disabled', 'focus'], sourceOwner: 'vue',
    previewPath: './vue/components/switch/readonly-disabled/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/switch/readonly-disabled/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-toggle-group-single-selection', host: 'vue', area: 'components',
    subject: 'ToggleGroup', slug: 'toggle-group/single-selection', title: 'One persistent choice',
    description: 'Choose one text alignment. With deselectable set to false, activating the selected choice keeps it selected.', focus: 'Single selection without deselection',
    kind: 'behavior', fixture: 'control', tags: ['single', 'deselectable', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/toggle-group/single-selection/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/toggle-group/single-selection/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-tabs-automatic-activation', host: 'vue', area: 'components',
    subject: 'Tabs', slug: 'tabs/automatic-activation', title: 'Automatic keyboard activation',
    description: 'Move between tabs with arrow keys. Selection follows focus, so the matching panel changes without a separate Enter or Space activation.', focus: 'Selection follows keyboard focus',
    kind: 'behavior', fixture: 'surface', tags: ['activationMode', 'keyboard', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/tabs/automatic-activation/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/tabs/automatic-activation/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-accordion-single-panel', host: 'vue', area: 'components',
    subject: 'Accordion', slug: 'accordion/single-panel', title: 'One panel stays open',
    description: 'Open one section at a time. With collapsible set to false, activating the open heading keeps its panel visible.', focus: 'Single non-collapsible selection',
    kind: 'behavior', fixture: 'surface', tags: ['single', 'collapsible', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/accordion/single-panel/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/accordion/single-panel/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-accordion-multiple-panels', host: 'vue', area: 'components',
    subject: 'Accordion', slug: 'accordion/multiple-panels', title: 'Several panels open',
    description: 'Open Delivery and Returns independently. The application receives an array of the currently open panel values.', focus: 'Independent panels and array state',
    kind: 'behavior', fixture: 'surface', tags: ['multiple', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/accordion/multiple-panels/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/accordion/multiple-panels/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-text-multiline-value', host: 'vue', area: 'components',
    subject: 'Text', slug: 'text/multiline-value', title: 'Multiline editing',
    description: 'Edit delivery notes in a native textarea. Application state reflects the committed text while native selection and editing remain available.', focus: 'Native textarea with application-owned text',
    kind: 'behavior', fixture: 'control', tags: ['multiline', 'v-model', 'native editing'], sourceOwner: 'vue',
    previewPath: './vue/components/text/multiline-value/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/text/multiline-value/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-text-lazy-value', host: 'vue', area: 'components',
    subject: 'Text', slug: 'text/lazy-value', title: 'Commit on change',
    description: 'Edit the display name, then leave the field to commit the changed value. The output stays unchanged while you type.', focus: 'Lazy model commits on native change',
    kind: 'behavior', fixture: 'control', tags: ['v-model.lazy', 'change'], sourceOwner: 'vue',
    previewPath: './vue/components/text/lazy-value/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/text/lazy-value/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-switch-controlled-state', host: 'vue', area: 'components',
    subject: 'Switch', slug: 'switch/controlled-state', title: 'Controlled setting',
    description: 'Toggle a boolean setting and inspect the application-owned checked value.', focus: 'Controlled boolean setting',
    kind: 'behavior', fixture: 'control', tags: ['v-model', 'checked', 'SwitchThumb'], sourceOwner: 'vue',
    previewPath: './vue/components/switch/controlled-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/switch/controlled-state/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-toggle-button-pressed-state', host: 'vue', area: 'components',
    subject: 'ToggleButton', slug: 'toggle-button/pressed-state', title: 'Persistent pressed state',
    description: 'Pin or unpin a conversation while the button communicates its pressed state.', focus: 'Application-owned pressed value',
    kind: 'behavior', fixture: 'control', tags: ['v-model', 'aria-pressed'], sourceOwner: 'vue',
    previewPath: './vue/components/toggle-button/pressed-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/toggle-button/pressed-state/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-toggle-group-multiple-selection', host: 'vue', area: 'components',
    subject: 'ToggleGroup', slug: 'toggle-group/multiple-selection', title: 'Multiple pressed choices',
    description: 'Select independent text formats. The code option is disabled; inspect the selected array as formats are toggled.', focus: 'Multiple selection with a disabled item',
    kind: 'behavior', fixture: 'control', tags: ['multiple', 'disabledItems', 'keyboard'], sourceOwner: 'vue',
    previewPath: './vue/components/toggle-group/multiple-selection/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/toggle-group/multiple-selection/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-radio-group-disabled-options', host: 'vue', area: 'components',
    subject: 'RadioGroup', slug: 'radio-group/disabled-options', title: 'Selecting an available option',
    description: 'Choose a delivery speed. Overnight is unavailable, and the application displays the selected option.', focus: 'Single selection with disabled options',
    kind: 'behavior', fixture: 'control', tags: ['disabledItems', 'orientation', 'RadioGroupIndicator'], sourceOwner: 'vue',
    previewPath: './vue/components/radio-group/disabled-options/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/radio-group/disabled-options/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-tabs-manual-activation', host: 'vue', area: 'components',
    subject: 'Tabs', slug: 'tabs/manual-activation', title: 'Manual keyboard activation',
    description: 'Move focus between tabs with arrow keys, then press Enter or Space to activate the focused section. Billing is unavailable.', focus: 'Focus and selection as separate actions',
    kind: 'behavior', fixture: 'surface', tags: ['activationMode', 'disabledItems', 'keyboard'], sourceOwner: 'vue',
    previewPath: './vue/components/tabs/manual-activation/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/tabs/manual-activation/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-popover-positioned-dismissal', host: 'vue', area: 'components',
    subject: 'Popover', slug: 'popover/positioned-dismissal', title: 'Positioning and dismissal',
    description: 'Open a non-modal surface beside its trigger, then dismiss it with Escape, the close control, or an outside interaction.', focus: 'Positioned non-modal dismissal',
    kind: 'behavior', fixture: 'surface', tags: ['position', 'outside interaction', 'focus'], sourceOwner: 'vue',
    previewPath: './vue/components/popover/positioned-dismissal/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/popover/positioned-dismissal/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-disclosure-exit-transition',
    host: 'vue',
    area: 'components',
    subject: 'Disclosure',
    slug: 'disclosure/exit-transition',
    title: 'Presence during an exit transition',
    description: 'Close the panel to observe it remaining present and inert during its CSS transition. Reopen it before the fade finishes, or wait until its hidden state is reported.',
    focus: 'Retained exit and interrupted reopening',
    kind: 'styling',
    fixture: 'surface',
    tags: ['presence', 'transition', 'inert', 'reduced-motion'],
    sourceOwner: 'vue',
    previewPath: './vue/components/disclosure/exit-transition/Preview.vue',
    code: [{ label: 'Vue · presence and transition', language: 'vue', path: './vue/components/disclosure/exit-transition/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-checkbox-controlled-state',
    host: 'vue',
    area: 'components',
    subject: 'Checkbox',
    slug: 'checkbox/controlled-state',
    title: 'Controlled state',
    description: 'Keep checkbox state in application data while Sectile handles interaction and accessible state.',
    focus: 'Controlled value updates',
    kind: 'behavior',
    fixture: 'control',
    tags: ['modelValue', 'update:modelValue', 'state'],
    sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/controlled-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/checkbox/controlled-state/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-checkbox-state-styling',
    host: 'vue',
    area: 'components',
    subject: 'Checkbox',
    slug: 'checkbox/state-styling',
    title: 'Styling checked state',
    description: 'Style a persistent checkbox box and respond to checked state without a separate presentation-state binding.',
    focus: 'State-based styling',
    kind: 'styling',
    fixture: 'control',
    tags: ['class', 'data-state', 'focus-visible'],
    sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/state-styling/Preview.vue',
    code: [{ label: 'Vue · markup and styling', language: 'vue', path: './vue/components/checkbox/state-styling/Preview.vue' }],
    related: ['vue-components-checkbox-controlled-state'],
  },
  {
    id: 'vue-components-dialog-controlled-open',
    host: 'vue',
    area: 'components',
    subject: 'Dialog',
    slug: 'dialog/controlled-open',
    title: 'Controlled open state',
    description: 'Keep modal open state in your application. Open the dialog, dismiss it with Escape or the close button, and inspect focus returning to the trigger.',
    focus: 'Application-owned open state',
    kind: 'behavior',
    fixture: 'surface',
    tags: ['open', 'update:open', 'focus'],
    sourceOwner: 'vue',
    previewPath: './vue/components/dialog/controlled-open/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/dialog/controlled-open/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-form-native-submission',
    host: 'vue',
    area: 'form',
    subject: 'Form',
    slug: 'native-submission',
    title: 'Native field submission',
    description: 'Submit a required email field through FormRoot. A successful submission displays the collected value locally; no request is sent.',
    focus: 'Validated native submission',
    kind: 'behavior',
    fixture: 'form',
    tags: ['FormRoot', 'FormField', 'onSubmit'],
    sourceOwner: 'vue',
    previewPath: './vue/form/native-submission/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/form/native-submission/Preview.vue' }],
    related: [],
  },
  {
    id: 'dom-components-checkbox-native-connection',
    host: 'dom',
    area: 'components',
    subject: 'Checkbox',
    slug: 'checkbox/native-connection',
    title: 'Native checkbox connection',
    description: 'Connect Sectile checkbox behavior to an application-owned native checkbox element and clean it up explicitly.',
    focus: 'DOM connection lifecycle',
    kind: 'behavior',
    fixture: 'control',
    tags: ['createCheckbox', 'input', 'cleanup'],
    sourceOwner: 'dom',
    previewPath: './dom/components/checkbox/native-connection/Preview.vue',
    code: [{ label: 'TypeScript', language: 'ts', path: './dom/components/checkbox/native-connection/example.ts' }],
    related: [],
  },
] as const;

export function examplePath(example: ExampleDefinition): string {
  return `/${example.host}/${example.area}/${example.slug}`;
}

export function areaPath(host: ExampleHost, area: ExampleArea): string {
  return `/${host}/${area}`;
}

export function examplesFor(host: ExampleHost, area: ExampleArea): readonly ExampleDefinition[] {
  return examples.filter((example) => example.host === host && example.area === area);
}

export function findExample(id: string): ExampleDefinition | undefined {
  return examples.find((example) => example.id === id);
}

export interface ExampleCatalogIssue {
  readonly code: 'duplicate-id' | 'duplicate-path' | 'empty-focus' | 'host-source-mismatch' | 'unknown-related' | 'cross-host-related';
  readonly exampleId: string;
  readonly message: string;
}

export function validateExampleCatalog(catalog: readonly ExampleDefinition[]): readonly ExampleCatalogIssue[] {
  const issues: ExampleCatalogIssue[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  const byId = new Map(catalog.map((example) => [example.id, example]));

  for (const example of catalog) {
    if (ids.has(example.id)) {
      issues.push({ code: 'duplicate-id', exampleId: example.id, message: `Duplicate example id: ${example.id}` });
    }
    ids.add(example.id);

    const path = examplePath(example);
    if (paths.has(path)) {
      issues.push({ code: 'duplicate-path', exampleId: example.id, message: `Duplicate example path: ${path}` });
    }
    paths.add(path);

    if (example.focus.trim().length === 0) {
      issues.push({ code: 'empty-focus', exampleId: example.id, message: `Example ${example.id} must have one primary focus.` });
    }
    const sourcePrefix = `./${example.host}/`;
    if (
      example.sourceOwner !== example.host
      || !example.previewPath.startsWith(sourcePrefix)
      || example.code.some((section) => !section.path.startsWith(sourcePrefix))
    ) {
      issues.push({ code: 'host-source-mismatch', exampleId: example.id, message: `Example ${example.id} source must stay inside the ${example.host} tree.` });
    }
  }

  for (const example of catalog) {
    for (const relatedId of example.related) {
      const related = byId.get(relatedId);
      if (related === undefined) {
        issues.push({ code: 'unknown-related', exampleId: example.id, message: `Unknown related example: ${relatedId}` });
      } else if (related.host !== example.host) {
        issues.push({ code: 'cross-host-related', exampleId: example.id, message: `Related examples cannot cross from ${example.host} to ${related.host}.` });
      }
    }
  }

  return issues;
}

export function assertValidExampleCatalog(catalog: readonly ExampleDefinition[] = examples): void {
  const issues = validateExampleCatalog(catalog);
  if (issues.length > 0) throw new TypeError(issues.map((issue) => issue.message).join('\n'));
}

assertValidExampleCatalog();
