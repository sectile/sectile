import { catalogCodeFor } from './catalog-code.js';
import { coreExampleCodeFor } from './core-example-code.js';
import { domDemoCode } from './dom-demo-code.js';
import type { Host } from './host-preference.js';
import { numberFieldExampleSources } from './number-field-examples.js';
import { specializedVueCodeFor } from './specialized-example-code.js';

function pascal(value: string): string {
  return value.split('-').map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join('');
}

function terminalSource(component: string, scenario: string): string {
  if (component === 'form') {
    const formExamples: Readonly<Record<string, string>> = {
      profile: `import { createForm } from '@sectile/terminal/form'

const fields = [
  { id: 'display-name', name: ['profile', 'displayName'], label: 'Display name', required: true },
  { id: 'email', name: ['profile', 'email'], label: 'Email address', required: true },
] as const

const form = createForm({
  fields,
  onSubmit: ({ state }) => console.log('profile saved', state.valid),
  onAnnounceSummary: (issues) => console.log(issues.map(issue => issue.message)),
})

form.handleKeyboardInput({ key: 'tab' })
form.handleKeyboardInput({ key: 'enter' })`,
      notifications: `import { createForm } from '@sectile/terminal/form'

const fields = [
  { id: 'channel', name: ['notifications', 'channel'], label: 'Activity emails', required: true },
  { id: 'digest', name: ['notifications', 'digest'], label: 'Weekly digest' },
] as const

const form = createForm({
  fields,
  onSubmit: ({ state }) => console.log('preferences saved', state.valid),
})

form.handleKeyboardInput({ key: 'tab' })
form.handleKeyboardInput({ key: 'enter' })`,
      'team-invite': `import { createForm } from '@sectile/terminal/form'

const fields = [
  { id: 'invite-email', name: ['invitation', 'email'], label: 'Email address', required: true },
  { id: 'invite-role', name: ['invitation', 'role'], label: 'Role', required: true },
] as const

const form = createForm({
  fields,
  onSubmit: ({ state }) => console.log('invitation sent', state.valid),
})

form.handleKeyboardInput({ key: 'tab' })
form.handleKeyboardInput({ key: 'enter' })`,
    };
    return formExamples[scenario] ?? formExamples['profile'] ?? '';
  }
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
  if (component === 'number-field') {
    return {
      ...numberFieldExampleSources(scenario),
      core: coreExampleCodeFor(component, scenario),
    };
  }
  const vue = specializedVueCodeFor(component, scenario) || catalogCodeFor(component, scenario);
  const sources: Partial<Record<Host, string>> = {
    core: coreExampleCodeFor(component, scenario),
    dom: domDemoCode[component] ?? '',
    terminal: terminalSource(component, scenario),
  };
  if (vue !== '') sources.vue = vue;
  return sources;
}
