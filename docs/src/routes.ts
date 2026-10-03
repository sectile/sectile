import {
  areas,
  components,
  componentPath,
  examplePath,
  examples,
  hosts,
  type ExampleArea,
  type ExampleHost,
} from './examples/catalog.ts';

export type DocsRouteKind = 'home' | 'host' | 'area' | 'example' | 'guide' | 'component';

export interface DocsRoute {
  readonly path: string;
  readonly label: string;
  readonly title: string;
  readonly kind: DocsRouteKind;
  readonly host?: ExampleHost;
  readonly area?: ExampleArea;
  readonly exampleId?: string;
  readonly guide?: 'getting-started' | 'styling' | 'state' | 'design-system' | 'accessibility';
  readonly subject?: string;
}

const hostRoutes: readonly DocsRoute[] = hosts.map((host) => ({
  path: `/${host.id}`,
  label: host.label,
  title: `${host.label} documentation`,
  kind: 'host',
  host: host.id,
}));

const areaRoutes: readonly DocsRoute[] = hosts.flatMap((host) => areas.map((area) => ({
  path: `/${host.id}/${area.id}`,
  label: area.label,
  title: `${host.label} ${area.label}`,
  kind: 'area' as const,
  host: host.id,
  area: area.id,
})));

const exampleRoutes: readonly DocsRoute[] = examples.map((example) => ({
  path: examplePath(example),
  label: example.title,
  title: `${example.subject} · ${example.title}`,
  kind: 'example',
  host: example.host,
  area: example.area,
  exampleId: example.id,
}));

export const routes: readonly DocsRoute[] = [
  { path: '/', label: 'Overview', title: 'Sectile documentation', kind: 'home', host: 'vue' },
  ...hostRoutes,
  { path: '/vue/getting-started', label: 'Getting started', title: 'Getting started with Vue', kind: 'guide', host: 'vue', guide: 'getting-started' },
  { path: '/vue/guides/styling', label: 'Styling', title: 'Styling Vue components', kind: 'guide', host: 'vue', guide: 'styling' },
  { path: '/vue/guides/state', label: 'State ownership', title: 'State ownership', kind: 'guide', host: 'vue', guide: 'state' },
  { path: '/vue/guides/design-system', label: 'Documentation styles', title: 'Documentation design system', kind: 'guide', host: 'vue', guide: 'design-system' },
  { path: '/vue/guides/accessibility', label: 'Accessibility', title: 'Vue accessibility', kind: 'guide', host: 'vue', guide: 'accessibility' },
  ...components.map((component): DocsRoute => ({ path: componentPath(component.subject), label: component.subject, title: component.subject, kind: 'component', host: 'vue', area: 'components', subject: component.subject })),
  ...areaRoutes,
  ...exampleRoutes,
];
