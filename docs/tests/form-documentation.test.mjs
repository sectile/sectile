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
  assert.deepEqual(form.scenarios.dom, ['account']);
  assert.deepEqual(form.scenarios.terminal, ['account']);
  assert.deepEqual(componentAnatomy.form.parts, expectedParts);
});

test('Form examples teach each host without duplicating field value ownership', async () => {
  const core = coreExampleCodeFor('form', 'account');
  const dom = domDemoCode.form;
  const vue = catalogCodeFor('form', 'account');
  const sourceRegistry = await readFile(
    new URL('../.vitepress/theme/component-example-sources.ts', import.meta.url),
    'utf8',
  );

  assert.match(core, /@sectile\/core\/form/u);
  assert.match(dom, /@sectile\/dom\/form/u);
  assert.match(vue, /@sectile\/vue\/form/u);
  assert.match(sourceRegistry, /@sectile\/terminal\/form/u);
  assert.equal(new Set([core, dom, vue]).size, 3);

  assert.match(vue, /<input name="email"/u);
  assert.match(vue, /new FormData|formData/u);
  assert.doesNotMatch(vue, /v-model/u);
  assert.match(dom, /new FormData|formData/u);
  assert.match(dom, /document\.querySelector<HTMLFormElement>/u);
  assert.doesNotMatch(dom, /const required/u);
  assert.match(sourceRegistry, /const fields = \[/u);
  assert.doesNotMatch(sourceRegistry, /values\s*:/u);
});

test('Form Core and Vue examples demonstrate validation and native submission', () => {
  const core = coreExampleCodeFor('form', 'account');
  const vue = catalogCodeFor('form', 'account');

  assert.match(core, /type: 'update-field'/u);
  assert.match(core, /applyFormEvent\(validation\.state, 'submit'\)/u);
  assert.match(core, /Enter a valid email address/u);
  assert.match(vue, /<FormSummary/u);
  assert.match(vue, /<FormMessage/u);
  assert.match(vue, /<FormSubmit/u);
  assert.match(vue, /Object\.fromEntries\(formData\)/u);
});

test('generated Form pages expose examples, Parts, keyboard, and accessibility', async () => {
  for (const locale of ['', 'ko/']) {
    const source = await readFile(new URL(`../${locale}components/form.md`, import.meta.url), 'utf8');
    const headings = locale === 'ko/'
      ? ['파트', '키보드 동작', '접근성']
      : ['Parts', 'Keyboard interaction', 'Accessibility'];

    assert.match(source, /<ComponentExample[^>]+component="form"[^>]+scenario="account"/u);
    for (const heading of headings) assert.ok(source.includes(`## ${heading}`));
  }
});
