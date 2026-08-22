import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick, ref } from 'vue';
import { CheckboxIndicator, CheckboxRoot } from '../dist/checkbox.js';
import { createHostNode, createTestRenderer } from './renderer.mjs';

test('Vue checkbox renders semantic state and forwards styling hooks during SSR', async () => {
  const app = createSSRApp({
    render: () => h(CheckboxRoot, {
      defaultValue: 'indeterminate',
      class: 'release-checkbox',
    }, {
      default: () => [
        'Include preview releases',
        h(CheckboxIndicator, { class: 'indicator' }, () => '−'),
      ],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /<button/);
  assert.match(html, /class="release-checkbox"/);
  assert.match(html, /role="checkbox"/);
  assert.match(html, /aria-checked="mixed"/);
  assert.match(html, /data-scope="checkbox"/);
  assert.match(html, /data-part="root"/);
  assert.match(html, /data-state="indeterminate"/);
  assert.match(html, /class="indicator"/);
  assert.doesNotMatch(html, /style=/);
});

test('Vue checkbox exposes one canonical tri-state slot value', async () => {
  let rootSlot;
  let indicatorSlot;
  const app = createSSRApp({
    render: () => h(CheckboxRoot, { defaultValue: 'indeterminate' }, {
      default: (props) => {
        rootSlot = props;
        return h(CheckboxIndicator, null, {
          default: (indicatorProps) => {
            indicatorSlot = indicatorProps;
            return '−';
          },
        });
      },
    }),
  });

  await renderToString(app);
  const expected = {
    checked: 'indeterminate',
    isChecked: false,
    isIndeterminate: true,
    disabled: false,
    readonly: false,
  };
  assert.deepEqual(rootSlot, expected);
  assert.deepEqual(indicatorSlot, expected);
  assert.equal('value' in rootSlot, false);
});

test('Vue checkbox keeps its indicator mounted across unchecked state', async () => {
  const app = createSSRApp({
    render: () => h(CheckboxRoot, { defaultValue: false }, {
      default: () => h(CheckboxIndicator, null, () => 'check'),
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /data-part="indicator"/);
  assert.match(html, /hidden/);
});

test('Vue checkbox projects disabled state without aesthetic styles', async () => {
  const app = createSSRApp({
    render: () => h(CheckboxRoot, { disabled: true }, () => 'Disabled'),
  });
  const html = await renderToString(app);
  assert.match(html, /disabled/);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /data-disabled(?:="")?(?:\s|>)/);
  assert.doesNotMatch(html, /style=/);
});

test('Vue checkbox asChild merges semantics into the consumer element', async () => {
  const app = createSSRApp({
    render: () => h(CheckboxRoot, { asChild: true, defaultValue: true }, {
      default: () => h('button', { class: 'consumer-button' }, 'Custom'),
    }),
  });
  const html = await renderToString(app);
  assert.equal((html.match(/<button/g) ?? []).length, 1);
  assert.match(html, /class="consumer-button"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /data-state="checked"/);
});

test('Vue checkbox follows controlled v-model ownership', async () => {
  const renderer = createTestRenderer();
  const value = ref(false);
  const proposed = [];
  const app = renderer.createApp({
    render: () => h(CheckboxRoot, {
      modelValue: value.value,
      'onUpdate:modelValue': (next) => {
        proposed.push(next);
        value.value = next;
      },
    }, () => 'Controlled'),
  });
  const container = createHostNode('root');
  app.mount(container);
  const button = container.children[0];
  assert.equal(button.props['aria-checked'], 'false');
  button.props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.deepEqual(proposed, [true]);
  assert.equal(button.props['aria-checked'], 'true');
});

test('Vue checkbox owns uncontrolled state and rejects disabled input', async () => {
  const renderer = createTestRenderer();
  const app = renderer.createApp({
    render: () => h(CheckboxRoot, { defaultValue: false }, () => 'Uncontrolled'),
  });
  const container = createHostNode('root');
  app.mount(container);
  const button = container.children[0];
  button.props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.equal(button.props['aria-checked'], 'true');

  const disabledApp = renderer.createApp({
    render: () => h(CheckboxRoot, { disabled: true }, () => 'Disabled'),
  });
  const disabledContainer = createHostNode('root');
  disabledApp.mount(disabledContainer);
  const disabledButton = disabledContainer.children[0];
  disabledButton.props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.equal(disabledButton.props['aria-checked'], 'false');
});

test('Vue checkbox renders a native form control from DOM projections', async () => {
  const renderer = createTestRenderer();
  const app = renderer.createApp({
    render: () => h(CheckboxRoot, {
      defaultValue: 'indeterminate',
      name: 'terms',
      value: 'accepted',
      required: true,
    }, () => 'Terms'),
  });
  const container = createHostNode('root');
  app.mount(container);
  const button = container.children.find((child) => child.type === 'button');
  const input = container.children.find((child) => child.type === 'input');

  assert.equal(button.props['aria-checked'], 'mixed');
  assert.equal(button.props['aria-required'], 'true');
  assert.equal(input.props.type, 'checkbox');
  assert.equal(input.props.name, 'terms');
  assert.equal(input.props.value, 'accepted');
  assert.equal(input.props.checked, false);
  assert.equal(input.props.indeterminate, true);
  assert.equal(input.props.required, true);
  assert.equal(input.props.tabIndex, -1);

  button.props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.equal(input.props.checked, true);
  assert.equal(input.props.indeterminate, false);
});
