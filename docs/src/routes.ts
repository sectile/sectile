import {
  areas,
  examplePath,
  examples,
  hosts,
  type ExampleArea,
  type ExampleHost,
} from './examples/catalog.ts';

export type DocsRouteKind = 'home' | 'host' | 'area' | 'example';

export interface DocsRoute {
  readonly path: string;
  readonly label: string;
  readonly title: string;
  readonly kind: DocsRouteKind;
  readonly host?: ExampleHost;
  readonly area?: ExampleArea;
  readonly exampleId?: string;
}

const hostRoutes: readonly DocsRoute[] = hosts.map((host) => ({
  path: `/${host.id}`,
  label: host.label,
  title: `${host.label} examples`,
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
  { path: '/', label: 'Home', title: 'Sectile examples', kind: 'home' },
  ...hostRoutes,
  ...areaRoutes,
  ...exampleRoutes,
];
