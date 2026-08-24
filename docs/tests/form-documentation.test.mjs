import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { catalogCodeFor } from '../.vitepress/theme/catalog-code.ts';
import { componentAnatomy } from '../.vitepress/theme/component-anatomy.ts';
import { coreExampleCodeFor } from '../.vitepress/theme/core-example-code.ts';
import { domDemoCode } from '../.vitepress/theme/dom-demo-code.ts';

const expectedParts = [
  'root',
  'field',
  'label',
  'description',
  'message',
  'summary',
  'submit',
];

test('Form is a first-class cross-host component contract', () => {
  const form = catalog.components.find(({ id }) => id === 'form');

  assert.ok(form);
  assert.equal(form.standard, 'https://html.spec.whatwg.org/multipage/forms.html#forms');
  assert.deepEqual(form.scenarios.dom, ['profile', 'notifications', 'team-invite']);
  assert.deepEqual(form.scenarios.terminal, ['profile', 'notifications', 'team-invite']);
  assert.deepEqual(componentAnatomy.form.parts, expectedParts);
});

test('Form examples teach each host without duplicating field value ownership', async () => {
  const core = coreExampleCodeFor('form', 'profile');
  const dom = domDemoCode.form;
  const profile = catalogCodeFor('form', 'profile');
  const notifications = catalogCodeFor('form', 'notifications');
  const invite = catalogCodeFor('form', 'team-invite');
  const sourceRegistry = await readFile(
    new URL('../.vitepress/theme/component-example-sources.ts', import.meta.url),
    'utf8',
  );

  assert.match(core, /@sectile\/core\/form/u);
  assert.match(dom, /@sectile\/dom\/form/u);
  assert.match(profile, /@sectile\/vue\/form/u);
  assert.match(sourceRegistry, /@sectile\/terminal\/form/u);
  assert.equal(new Set([profile, notifications, invite]).size, 3);

  assert.match(profile, /TextField/u);
  assert.match(profile, /v-model\.trim/u);
  assert.match(profile, /:name="\['profile', 'displayName'\]"/u);
  assert.match(profile, /values\.profile/u);
  assert.doesNotMatch(profile, /Object\.fromEntries|new FormData|formData/u);
  assert.match(notifications, /SwitchRoot/u);
  assert.match(notifications, /SelectRoot/u);
  assert.match(invite, /<input/u);
  assert.doesNotMatch(invite, /Object\.fromEntries|new FormData|formData/u);
  assert.match(dom, /values/u);
  assert.match(dom, /document\.querySelector<HTMLFormElement>/u);
  assert.doesNotMatch(dom, /const required/u);
  assert.match(sourceRegistry, /const fields = \[/u);
  assert.doesNotMatch(sourceRegistry, /values\s*:/u);
});

test('Form Core and Vue examples demonstrate validation and native submission', () => {
  const core = coreExampleCodeFor('form', 'profile');
  const vue = catalogCodeFor('form', 'profile');

  assert.match(core, /type: 'update-field'/u);
  assert.match(core, /applyFormEvent\(validation\.state, 'submit'\)/u);
  assert.match(core, /Enter a valid email address/u);
  assert.match(vue, /<FormSummary/u);
  assert.match(vue, /<FormMessage/u);
  assert.match(vue, /<FormSubmit/u);
  assert.match(vue, /values/u);
});

test('Form source registry preserves scenario-specific host examples', async () => {
  const source = await readFile(
    new URL('../.vitepress/theme/component-example-sources.ts', import.meta.url),
    'utf8',
  );

  for (const scenario of ['profile', 'notifications', 'team-invite']) {
    assert.match(source, new RegExp(`(?:'${scenario}'|${scenario}):`, 'u'));
  }
  assert.match(source, /terminalSource\(component, scenario\)/u);
  assert.match(source, /catalogCodeFor\(component, scenario\)/u);
});

test('generated Form pages expose examples, Parts, keyboard, and accessibility', async () => {
  for (const locale of ['', 'ko/']) {
    const source = await readFile(new URL(`../${locale}components/form.md`, import.meta.url), 'utf8');
    const headings = locale === 'ko/'
      ? ['파트', '키보드 동작', '접근성']
      : ['Parts', 'Keyboard interaction', 'Accessibility'];

    for (const scenario of ['profile', 'notifications', 'team-invite']) {
      assert.match(source, new RegExp(`<ComponentExample[^>]+component="form"[^>]+scenario="${scenario}"`, 'u'));
    }
    for (const heading of headings) assert.ok(source.includes(`## ${heading}`));
  }
});
