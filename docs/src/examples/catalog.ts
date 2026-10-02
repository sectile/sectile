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
