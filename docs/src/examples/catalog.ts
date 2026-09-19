export const hosts = [
  { id: 'vue', label: 'Vue', description: 'Headless Vue components and Vue-first package integrations.' },
  { id: 'dom', label: 'DOM', description: 'Direct DOM connections for application-owned markup.' },
] as const;

export type ExampleHost = (typeof hosts)[number]['id'];

export type ExampleArea =
  | 'components'
  | 'form'
  | 'temporal'
  | 'virtual'
  | 'tabular'
  | 'chart'
  | 'editor';

export interface ExampleAreaDefinition {
  readonly id: ExampleArea;
  readonly label: string;
  readonly description: string;
  readonly principles: readonly string[];
}

export const areas: readonly ExampleAreaDefinition[] = [
  { id: 'components', label: 'Components', description: 'Focused interaction patterns such as checkboxes, dialogs, selects, menus, and overlays.', principles: [] },
  { id: 'form', label: 'Form', description: 'Validation, submission, field coordination, reset, and server-driven form workflows.', principles: [] },
  { id: 'temporal', label: 'Temporal', description: 'Dates, time, ranges, calendars, constraints, and scheduling workflows.', principles: [] },
  { id: 'virtual', label: 'Virtual', description: 'Large collections, measurement, anchoring, scrollports, grids, masonry, and spatial layouts.', principles: [] },
  { id: 'tabular', label: 'Tabular', description: 'Tables, grids, trees, data sources, selection, editing, and virtualization.', principles: [] },
  { id: 'chart', label: 'Chart', description: 'Chart data, scales, interaction, visible ranges, rendering, and large-data policies.', principles: [] },
  {
    id: 'editor',
    label: 'Editor',
    description: 'Portable structured content authoring across renderer-neutral Editor sessions and DOM/Vue host projections.',
    principles: [
      'Portable Content owns persisted document, schema, validation, fragments, and pure transforms.',
      'Editor owns authoring sessions, logical selection, transactions, actions, policy, and local undo/redo.',
      'DOM and Vue own browser input, rendering projection, accessibility, refs, and connection lifecycle.',
    ],
  },
];

export type ExampleKind = 'behavior' | 'styling';
export type PreviewFixture = 'control' | 'editor' | 'form' | 'surface' | 'viewport' | 'table' | 'chart';

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
  readonly featured?: boolean;
}

export const examples: readonly ExampleDefinition[] = [
  {
    id: 'vue-editor-basic-authoring',
    host: 'vue',
    area: 'editor',
    subject: 'Editor',
    slug: 'basic-authoring',
    title: 'Rich text formatting from the native selection',
    description: 'Select text in a structured article and apply Bold, Italic, or Code to exactly that range while the Editor preserves logical selection and history.',
    focus: 'Selection-based rich text formatting',
    kind: 'behavior',
    fixture: 'editor',
    tags: ['selection', 'Bold', 'Italic', 'Code', 'undo'],
    sourceOwner: 'vue',
    previewPath: './vue/editor/basic-authoring/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/editor/basic-authoring/Preview.vue' }],
    related: ['vue-editor-read-only'],
    featured: true,
  },
  {
    id: 'vue-editor-read-only',
    host: 'vue',
    area: 'editor',
    subject: 'Editor',
    slug: 'read-only',
    title: 'Editing and review mode across isolated slots',
    description: 'Edit either side of a two-slot comparison component, then switch the same structured document into read-only review mode without synthetic content actions.',
    focus: 'Isolated slots + review mode',
    kind: 'behavior',
    fixture: 'editor',
    tags: ['EditorIsolatedFrame', 'EditorAuthoringMount', 'reconfigure'],
    sourceOwner: 'vue',
    previewPath: './vue/editor/read-only/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/editor/read-only/Preview.vue' }],
    related: ['vue-editor-basic-authoring'],
  },
  {
    id: 'dom-editor-application-owned',
    host: 'dom',
    area: 'editor',
    subject: 'Editor',
    slug: 'application-owned-host',
    title: 'Application-owned rich text toolbar',
    description: 'Use the browser selection inside application-owned DOM, then apply Bold, Italic, or Code to only the selected range through the Editor session.',
    focus: 'Native selection + custom DOM projection',
    kind: 'behavior',
    fixture: 'editor',
    tags: ['createEditor', 'selection', 'Bold', 'Italic', 'Code'],
    sourceOwner: 'dom',
    previewPath: './dom/editor/application-owned/Preview.vue',
    code: [{ label: 'TypeScript', language: 'ts', path: './dom/editor/application-owned/example.ts' }],
    related: ['dom-editor-session-history'],
    featured: true,
  },
  {
    id: 'dom-editor-session-history',
    host: 'dom',
    area: 'editor',
    subject: 'Editor',
    slug: 'session-history',
    title: 'Approve a release with one atomic transaction',
    description: 'A production-style approval command updates status and release notes together, then undo and redo treat the two-block change as one history entry.',
    focus: 'Atomic approval workflow',
    kind: 'behavior',
    fixture: 'editor',
    tags: ['transact', 'undo', 'redo', 'render'],
    sourceOwner: 'dom',
    previewPath: './dom/editor/session-history/Preview.vue',
    code: [{ label: 'TypeScript', language: 'ts', path: './dom/editor/session-history/example.ts' }],
    related: ['dom-editor-application-owned'],
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
  readonly code:
    | 'duplicate-id'
    | 'duplicate-path'
    | 'duplicate-featured'
    | 'empty-focus'
    | 'host-source-mismatch'
    | 'unknown-related'
    | 'cross-host-related';
  readonly exampleId: string;
  readonly message: string;
}

export function validateExampleCatalog(catalog: readonly ExampleDefinition[]): readonly ExampleCatalogIssue[] {
  const issues: ExampleCatalogIssue[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  const featuredAreas = new Set<string>();
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

    if (example.featured) {
      const featuredKey = `${example.host}:${example.area}`;
      if (featuredAreas.has(featuredKey)) {
        issues.push({
          code: 'duplicate-featured',
          exampleId: example.id,
          message: `Only one featured example is allowed for ${featuredKey}.`,
        });
      }
      featuredAreas.add(featuredKey);
    }

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
