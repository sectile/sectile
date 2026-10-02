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
