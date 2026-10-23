import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, defineComponent, Fragment, h } from 'vue';
import { createTestWindow } from './happy-dom.mjs';
import { SelectRoot, SelectTrigger, SelectValue } from '../.verification-dist/select.js';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSubmit,
  FormSummary,
  defineFormSubmission,
} from '../.verification-dist/form.js';

test('Vue defineFormSubmission keeps schema and handler atomic for v-bind', () => {
  const schema = { '~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) } };
  const onSubmit = () => ({ ok: true });
  const submission = defineFormSubmission({ schema, onSubmit });
  assert.deepEqual(submission, { schema, onSubmit });
  assert.equal(Object.isFrozen(submission), true);
});

test('Select fields have native label targets and inherited submission names before hydration', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, {
    default: () => ['choice', 'other'].map(name => h(FormField, { name, required: true }, {
      default: () => [h(FormLabel, {}, () => name),
        h(SelectRoot, { items: ['alpha', 'beta'], defaultValue: 'alpha', position: false }, {
          default: () => h(SelectTrigger, {}, () => h(SelectValue)),
        })],
    })),
  }) }));
  const browser = createTestWindow();
  try {
    browser.document.body.innerHTML = html;
    const labels = [...browser.document.querySelectorAll('label')];
    assert.equal(labels.length, 2);
    for (const label of labels) {
      assert.equal(label.control?.tagName, 'BUTTON');
      assert.equal(label.control?.getAttribute('data-part'), 'trigger');
    }
    assert.notEqual(labels[0].htmlFor, labels[1].htmlFor);
    assert.deepEqual([...browser.document.querySelectorAll('select')].map(select => [select.name, select.value, select.required]),
      [['choice', 'alpha', true], ['other', 'alpha', true]]);
    const ids = [...browser.document.querySelectorAll('[id]')].map(element => element.id);
    assert.equal(new Set(ids).size, ids.length);
  } finally { await browser.happyDOM.close(); }
});

test('Sectile composite fields declare SSR group labels and native submission names before child setup', async () => {
  const cases = [
    ['checkbox', 'CheckboxRoot', { defaultValue: true }, ['on']],
    ['switch', 'SwitchRoot', { defaultValue: true }, ['on']],
    ['checkbox-group', 'CheckboxGroupRoot', { items: ['a', 'b'], defaultValue: ['a'] }, ['a']],
    ['radio-group', 'RadioGroupRoot', { items: ['a', 'b'], defaultValue: 'a' }, ['a']],
    ['listbox', 'ListboxRoot', { items: ['a', 'b'], defaultValue: 'a' }, ['a']],
    ['cascade-list', 'CascadeListRoot', { nodes: [{ id: 'a', parentID: null }], defaultValue: 'a' }, ['a']],
    ['cascade-select', 'CascadeSelectRoot', { nodes: [{ id: 'a', parentID: null }], defaultValue: 'a', position: false }, ['a']],
    ['toggle-group', 'ToggleGroupRoot', { items: ['a', 'b'], defaultValue: ['a'] }, ['a']],
    ['rating', 'RatingRoot', { items: ['a', 'b'], defaultValue: 'a' }, ['a']],
    ['slider', 'SliderRoot', { defaultValue: 40 }, ['40']],
    ['multi-thumb-slider', 'MultiThumbSliderRoot', { thumbs: ['low', 'high'], defaultValue: [20, 80] }, ['20', '80']],
    ['pin-input', 'PinInputRoot', { length: 4, defaultValue: '7291' }, ['7291']],
    ['tags-input', 'TagsInputRoot', { defaultValue: ['a', 'b'] }, ['a', 'b']],
    ['color-picker', 'ColorPickerRoot', { defaultValue: '#ff0000' }, ['#ff0000']],
  ];
  for (const [entry, exported, props, expected] of cases) {
    const Control = (await import(`../.verification-dist/${entry}.js`))[exported];
    const browser = createTestWindow();
    try {
      const html = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => h(FormField, { name: 'choice' }, () => [
        h(FormLabel, {}, () => 'Choice'), h('section', {}, [h(Fragment, {}, [h(Control, props)])]),
      ])) }));
      browser.document.body.innerHTML = html;
      const label = browser.document.querySelector('[data-part="label"]');
      assert.equal(label.tagName, 'SPAN', entry);
      assert.equal(label.hasAttribute('for'), false, entry);
      assert.ok(browser.document.querySelector(`[aria-labelledby="${label.id}"]`), entry);
      const entries = [...new browser.FormData(browser.document.querySelector('form'))];
      assert.deepEqual(entries.map(([, value]) => value), expected, entry);
      assert.deepEqual(entries.map(([name]) => name), entry === 'multi-thumb-slider' ? ['choice[0]', 'choice[1]'] : expected.map(() => 'choice'), entry);
      let state;
      await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => h(FormField, {
        name: 'choice', disabled: true, readonly: true,
      }, () => h(Control, props, { default: current => { state = current; return null; } }))) }));
      assert.equal(state.disabled, true, entry);
      assert.equal(state.readonly, true, entry);
      browser.document.body.innerHTML = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => h(FormField, {
        name: 'choice', form: 'outer', disabled: true, readonly: true, required: true,
      }, () => h(Control, { ...props, name: 'override', form: undefined, disabled: false, readonly: false, required: false }))) }));
      const semantic = browser.document.querySelector('[aria-labelledby]');
      assert.notEqual(semantic?.getAttribute('aria-disabled'), 'true', entry);
      assert.notEqual(semantic?.getAttribute('aria-readonly'), 'true', entry);
      assert.notEqual(semantic?.getAttribute('aria-required'), 'true', entry);
      const native = [...browser.document.querySelectorAll('input,select')];
      assert.ok(native.length > 0, entry);
      for (const element of native) {
        assert.equal(element.name, 'override', entry);
        assert.equal(element.disabled, false, entry);
        assert.equal(element.required, false, entry);
        assert.equal(element.hasAttribute('form'), false, entry);
      }
    } finally { await browser.happyDOM.close(); }
  }
});

test('a nested FormField owns its own declarative semantics and explicit IDs remain consumer-owned', async () => {
  const { RadioGroupRoot } = await import('../.verification-dist/radio-group.js');
  const html = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => h(FormField, { id: 'outer', name: 'outer' }, () => [
    h(FormLabel, {}, () => 'Outer'), h('input', { id: 'outer-control', name: 'outer' }),
    h(FormField, { id: 'inner', name: 'inner' }, () => [h(FormLabel, {}, () => 'Inner'), h(RadioGroupRoot, { items: ['a'], defaultValue: 'a' })]),
  ])) }));
  const browser = createTestWindow();
  try {
    browser.document.body.innerHTML = html;
    assert.equal(browser.document.querySelector('#outer-label').control?.id, 'outer-control');
    assert.equal(browser.document.querySelector('#inner-label').tagName, 'SPAN');
    assert.equal(browser.document.querySelector('#inner-control').getAttribute('aria-labelledby'), 'inner-label');
  } finally { await browser.happyDOM.close(); }
});

test('opaque wrapper fields can declare SSR label semantics without pre-executing component slots', async () => {
  const { RadioGroupRoot } = await import('../.verification-dist/radio-group.js');
  let calls = 0;
  const Wrapped = defineComponent({ setup(_props, { slots }) { return () => { calls++; return h(RadioGroupRoot, { items: ['a'], defaultValue: 'a' }, slots); }; } });
  const html = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => h(FormField, { name: 'choice', labelMode: 'labelledby' }, () => [
    h(FormLabel, {}, () => 'Choice'), h(Wrapped, {}, () => h('span', 'One')),
  ])) }));
  assert.equal(calls, 1);
  assert.match(html, /<span[^>]*data-part="label"/u);
  assert.match(html, /aria-labelledby="form-field-[^"]+-label"/u);
});

test('native control owners inherit SSR names and form association while preserving authored overrides', async () => {
  const { TextField } = await import('../.verification-dist/text.js');
  const { ComboboxRoot, ComboboxInput } = await import('../.verification-dist/combobox.js');
  const { SpinButtonRoot, SpinButtonInput } = await import('../.verification-dist/spin-button.js');
  const { EditableRoot, EditableInput } = await import('../.verification-dist/editable.js');
  const controls = [
    metadata => h(TextField, { defaultValue: 'hello', ...metadata }),
    metadata => h(ComboboxRoot, { items: [{ id: 'a', label: 'Alpha' }], defaultInputValue: 'Alpha' }, () => h(ComboboxInput, metadata)),
    metadata => h(SpinButtonRoot, { defaultValue: 5 }, () => h(SpinButtonInput, metadata)),
    metadata => h(EditableRoot, { defaultValue: 'hello', defaultEditing: true }, () => h(EditableInput, metadata)),
  ];
  const browser = createTestWindow();
  try {
    for (const control of controls) for (const explicit of [false, true]) {
      browser.document.body.innerHTML = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => h(FormField, {
        name: ['profile', 'value'], form: 'external', required: true,
      }, () => [h(FormLabel, {}, () => 'Value'), control(explicit ? { name: undefined, form: undefined, required: false } : {})])) }));
      const input = browser.document.querySelector('input,textarea');
      assert.equal(input.getAttribute('name'), explicit ? null : 'profile.value');
      assert.equal(input.getAttribute('form'), explicit ? null : 'external');
      assert.equal(input.required, !explicit);
      assert.equal(browser.document.querySelector('label').control, input);
    }
  } finally { await browser.happyDOM.close(); }
});

test('explicit nested fields establish fresh ownership inside a composite control', async () => {
  const { CheckboxGroupRoot } = await import('../.verification-dist/checkbox-group.js');
  const { TextField } = await import('../.verification-dist/text.js');
  const html = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => h(FormField, { name: 'outer', disabled: true }, () =>
    h(CheckboxGroupRoot, { items: ['a'], defaultValue: ['a'] }, () => h(FormField, { id: 'inner', name: 'inner' }, () => [
      h(FormLabel, {}, () => 'Inner'), h(TextField, { defaultValue: 'hello' }),
    ])))) }));
  const browser = createTestWindow();
  try {
    browser.document.body.innerHTML = html;
    assert.deepEqual([...new browser.FormData(browser.document.querySelector('form'))], [['inner', 'hello']]);
    assert.equal(browser.document.querySelector('#inner-control').disabled, false);
    assert.equal(browser.document.querySelector('#inner-label').control?.name, 'inner');
  } finally { await browser.happyDOM.close(); }
});

test('native parts retain explicit interaction overrides from their Sectile owner', async () => {
  const { ComboboxRoot, ComboboxInput } = await import('../.verification-dist/combobox.js');
  const { SpinButtonRoot, SpinButtonInput } = await import('../.verification-dist/spin-button.js');
  const { EditableRoot, EditableInput } = await import('../.verification-dist/editable.js');
  const { QuantityFieldRoot, QuantityFieldInput, createStandardQuantityPolicies } = await import('../.verification-dist/quantity-field.js');
  const cases = [
    [ComboboxRoot, ComboboxInput, { items: [{ id: 'a', label: 'Alpha' }] }],
    [SpinButtonRoot, SpinButtonInput, {}],
    [EditableRoot, EditableInput, { defaultEditing: true }],
    [QuantityFieldRoot, QuantityFieldInput, { policies: createStandardQuantityPolicies('metre') }],
  ];
  const browser = createTestWindow();
  try {
    for (const [Root, Input, props] of cases) {
      browser.document.body.innerHTML = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => h(FormField, {
        name: 'value', disabled: true, readonly: true,
      }, () => h(Root, { ...props, disabled: false, readonly: false }, () => h(Input)))) }));
      const input = browser.document.querySelector('input,textarea');
      assert.equal(input.disabled, false, Root.name);
      assert.equal(input.readOnly, false, Root.name);
      assert.equal(input.name, 'value', Root.name);
    }
  } finally { await browser.happyDOM.close(); }
});

test('TreeSelect and Transfer project field submission identity into initial native encodings', async () => {
  const { TreeSelectRoot, TreeSelectInput } = await import('../.verification-dist/tree-select.js');
  const { TransferRoot, TransferList } = await import('../.verification-dist/transfer.js');
  const tree = [{ id: 'a', parentID: null }];
  const transfer = [{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'right' }];
  const browser = createTestWindow();
  try {
    browser.document.body.innerHTML = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, () => [
      h(FormField, { name: 'tree' }, () => [h(FormLabel, {}, () => 'Tree'), h(TreeSelectRoot, { nodes: tree, defaultValue: ['a'], position: false }, () => h(TreeSelectInput))]),
      h(FormField, { name: 'transfer' }, () => [h(FormLabel, {}, () => 'Transfer'), h(TransferRoot, { nodes: transfer, sourceId: 'left', targetId: 'right' }, () => h(TransferList, { side: 'target' }))]),
    ]) }));
    assert.deepEqual([...new browser.FormData(browser.document.querySelector('form'))], [['tree', 'a'], ['transfer', 'a']]);
    const labels = [...browser.document.querySelectorAll('[data-part="label"]')];
    assert.equal(labels[0].control?.tagName, 'INPUT');
    assert.equal(labels[1].tagName, 'SPAN');
    assert.ok(browser.document.querySelector(`[aria-labelledby="${labels[1].id}"]`));
  } finally { await browser.happyDOM.close(); }
});

test('field-default readers expose initial SSR flags without waiting for mounted metadata', async () => {
  const { defineComponent } = await import('vue');
  const { useFormFieldDefaults } = await import('../.verification-dist/form-boundary.js');
  const Reader = defineComponent({ setup() { const defaults = useFormFieldDefaults();
    return () => h('output', `${defaults.value.disabled}/${defaults.value.readonly}/${defaults.value.required}`);
  } });
  const html = await renderToString(createSSRApp({ render: () => h(FormRoot, {}, {
    default: () => h(FormField, { name: 'amount', disabled: true, readonly: false, required: true }, { default: () => h(Reader) }),
  }) }));
  assert.ok(html.includes('<output>true/false/true</output>'));
});

test('Vue Form renders native semantics and stable compound part boundaries during SSR', async () => {
  const app = createSSRApp({
    render: () => h(FormRoot, { action: '/account', method: 'post' }, {
      default: ({ validation }) => [
        h(FormSummary, null, { default: () => `Status: ${validation.status}` }),
        h(FormField, { id: 'email', name: 'email' }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Email address' }),
            h(FormDescription, null, { default: () => 'Used for release notices.' }),
            h('input', {
              id: 'email-control',
              name: 'email',
              type: 'email',
              required: true,
              'aria-describedby': 'email-description email-message',
            }),
            h(FormMessage),
          ],
        }),
        h(FormReset, null, { default: () => 'Reset account' }),
        h(FormSubmit, null, { default: () => 'Save account' }),
      ],
    }),
  });

  const html = await renderToString(app);
  assert.match(html, /^<form/);
  assert.match(html, /action="\/account"/);
  assert.match(html, /method="post"/);
  assert.match(html, /data-scope="form"/);
  for (const part of ['root', 'summary', 'field', 'label', 'description', 'message', 'reset', 'submit']) {
    assert.match(html, new RegExp(`data-part="${part}"`));
  }
  assert.match(html, /for="email-control"/);
  assert.match(html, /id="email-control"/);
  assert.match(html, /aria-describedby="email-description email-message"/);
  assert.match(html, /type="submit"/);
  assert.match(html, /type="reset"/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.equal((html.match(/aria-live="off"/g) ?? []).length, 2);
  assert.equal((html.match(/data-state="hidden"/g) ?? []).length, 2);
});
