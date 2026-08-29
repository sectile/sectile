export interface CatalogSearchComponent {
  readonly id: string;
  readonly family: string;
  readonly capabilities: readonly string[];
}

export interface CatalogSearchLabels {
  readonly title: string;
  readonly family: string;
}

export function catalogMatchRank(
  component: CatalogSearchComponent,
  query: string,
  labels: CatalogSearchLabels,
): number {
  const search = normalize(query);
  if (search.length === 0) return 0;

  const names = [component.id, labels.title].map(normalize);
  const families = [component.family, labels.family].map(normalize);
  const capabilities = component.capabilities.map(normalize);

  return Math.min(
    termRank(names, search, 0),
    termRank(families, search, 3),
    termRank(capabilities, search, 6),
  );
}

function termRank(terms: readonly string[], search: string, base: number): number {
  if (terms.some((term) => term === search)) return base;
  if (terms.some((term) => term.startsWith(search))) return base + 1;
  if (terms.some((term) => term.includes(search))) return base + 2;
  return Number.POSITIVE_INFINITY;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
