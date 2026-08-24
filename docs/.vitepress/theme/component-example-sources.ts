import { catalogCodeFor } from './catalog-code.js';
import { domDemoCode } from './dom-demo-code.js';
import type { Host } from './host-preference.js';
import { numberFieldExampleSources } from './number-field-examples.js';
import { specializedVueCodeFor } from './specialized-example-code.js';

function pascal(value: string): string {
  return value.split('-').map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join('');
}

function coreSource(component: string): string {
  const name = pascal(component);
  const specifier = `@sectile/core/${component}`;
  return `import * as ${name} from '${specifier}'

// Core exposes immutable state constructors and event reducers.
// Compose the exported operations with the application state owner.
const operations = ${name}`;
}

function terminalSource(component: string): string {
  const name = pascal(component);
  const specifier = `@sectile/terminal/${component}`;
  return `import { create${name} } from '${specifier}'

// The terminal adapter owns normalized keyboard input and state updates.
const control = create${name}({
  onUpdate: () => render(control.getSnapshot()),
})

function render(snapshot: unknown) {
  process.stdout.write(JSON.stringify(snapshot))
}`;
}

export function componentExampleSources(component: string, scenario: string): Partial<Record<Host, string>> {
  if (component === 'number-field') return numberFieldExampleSources(scenario);
  const vue = specializedVueCodeFor(component, scenario) || catalogCodeFor(component, scenario);
  const sources: Partial<Record<Host, string>> = {
    core: coreSource(component),
    dom: domDemoCode[component] ?? '',
    terminal: terminalSource(component),
  };
  if (vue !== '') sources.vue = vue;
  return sources;
}
