import type { Host } from './host-preference.js';

function humanize(value: string): string {
  return value
    .split('-')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

export function prepareExampleSource(
  source: string,
  host: Host,
  component: string,
  scenario: string,
): string {
  const label = `${humanize(component)} / ${humanize(scenario)}`;
  const prefix = host === 'vue' ? `<!-- ${label} -->` : `// ${label}`;
  return `${prefix}\n${source.replaceAll('\r\n', '\n').trim()}`;
}
