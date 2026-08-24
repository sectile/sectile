import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/account' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLFormElement: browserWindow.HTMLFormElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  SubmitEvent: browserWindow.SubmitEvent,
  FormData: browserWindow.FormData,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, defineComponent, h, mergeProps, nextTick, ref } = await import('vue');
const {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormRoot,
  FormSubmit,
  FormSummary,
  useFormControl,
} = await import('../dist/form.js');

test('Vue Form coordinates native validation, focus, FormData, and reset without owning values', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const submissions = [];
  const states = [];
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (details) => {
        details.event.preventDefault();
        submissions.push([...details.formData.entries()]);
      },
      onStateChange: (state) => states.push(state.status),
    }, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'email', name: ['account', 'email'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Email' }),
            h(FormDescription, null, { default: () => 'Account email' }),
            h('input', {
              type: 'email',
              defaultValue: 'initial@sectile.dev',
            }),
            h(FormMessage),
          ],
        }),
        h(FormSubmit, null, { default: () => 'Save' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const form = host.querySelector('form');
  const input = host.querySelector('input');
  const summary = host.querySelector('[data-part="summary"]');
  assert.ok(form instanceof HTMLFormElement);
  assert.ok(input instanceof HTMLInputElement);
  assert.equal(input.id, 'email-control');
  assert.equal(input.name, 'account.email');
  assert.equal(input.required, true);
  assert.equal(input.getAttribute('aria-describedby'), 'email-description email-message');

  input.value = '';
  form.requestSubmit();
  await Promise.resolve();
  await nextTick();
  assert.equal(document.activeElement?.id, input.id);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(summary.hidden, false);
  assert.equal(submissions.length, 0);
  assert.equal(states.includes('invalid'), true);

  input.value = 'release@sectile.dev';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  form.requestSubmit();
  await nextTick();
  assert.deepEqual(submissions, [[['account.email', 'release@sectile.dev']]]);

  form.reset();
  await nextTick();
  assert.equal(input.value, 'initial@sectile.dev');
  assert.equal(states.at(-1), 'idle');

  app.unmount();
  host.remove();
});

test('Vue FormField uses native fieldset semantics and preserves explicit child metadata', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'channels',
        name: 'channels',
        required: true,
        disabled: true,
      }, {
        default: () => h('fieldset', null, [
          h(FormLabel, null, { default: () => 'Channels' }),
          h(FormDescription, null, { default: () => 'Choose notification channels.' }),
          h('input', { id: 'explicit-email', name: 'explicit-channel', type: 'checkbox', value: 'email' }),
          h('input', { type: 'checkbox', value: 'sms' }),
        ]),
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const fieldset = host.querySelector('fieldset');
  const legend = host.querySelector('legend');
  const inputs = [...host.querySelectorAll('input')];
  assert.ok(fieldset instanceof browserWindow.HTMLFieldSetElement);
  assert.ok(legend instanceof browserWindow.HTMLLegendElement);
  assert.equal(legend.hasAttribute('for'), false);
  assert.equal(fieldset.getAttribute('aria-required'), 'true');
  assert.equal(fieldset.getAttribute('aria-describedby'), 'channels-description channels-message');
  assert.equal(fieldset.disabled, true);
  assert.equal(inputs[0].id, 'explicit-email');
  assert.equal(inputs[0].name, 'explicit-channel');
  assert.equal(inputs[1].name, 'channels');

  app.unmount();
  host.remove();
});

test('native fallback prefers a visible control over hidden submission elements', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, { id: 'search', name: 'query' }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Search' }),
          h('input', { name: 'source', type: 'hidden', value: 'metadata' }),
          h('input', { type: 'search' }),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const hidden = host.querySelector('input[type="hidden"]');
  const search = host.querySelector('input[type="search"]');
  const label = host.querySelector('label');
  assert.ok(hidden instanceof HTMLInputElement);
  assert.ok(search instanceof HTMLInputElement);
  assert.ok(label instanceof browserWindow.HTMLLabelElement);
  assert.equal(search.id, 'search-control');
  assert.equal(label.htmlFor, search.id);
  assert.equal(hidden.id, '');
  assert.equal(hidden.name, 'source');
  assert.equal(search.name, 'query');

  app.unmount();
  host.remove();
});

test('useFormControl maps compound semantics and nested submission names to separate elements', async () => {
  const CompoundControl = defineComponent({
    name: 'CompoundControl',
    inheritAttrs: false,
    setup(_, { attrs }) {
      const semantic = ref(null);
      const hidden = ref(null);
      const participation = useFormControl({
        element: semantic,
        semanticControl: semantic,
        focusTarget: semantic,
        labelMode: 'labelledby',
        capabilities: {
          id: true,
          describedBy: true,
          invalid: true,
          labelledBy: true,
        },
        submissions: [{
          element: hidden,
          relativeName: 'value',
          capabilities: { name: true, form: true, disabled: true },
        }],
      });
      return () => h('div', mergeProps(participation.controlProps.value, attrs, {
        ref: semantic,
        role: 'group',
        tabindex: 0,
      }), [h('input', { ref: hidden, type: 'hidden', value: 'release' })]);
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'channel',
        name: ['notifications', 0],
        required: true,
        readonly: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Channel' }),
          h(FormDescription, null, { default: () => 'Primary notification channel.' }),
          h(CompoundControl),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const semantic = host.querySelector('[role="group"]');
  const hidden = host.querySelector('input[type="hidden"]');
  const label = host.querySelector('[data-part="label"]');
  assert.ok(semantic instanceof HTMLElement);
  assert.ok(hidden instanceof HTMLInputElement);
  assert.ok(label instanceof HTMLElement);
  assert.equal(label.tagName, 'SPAN');
  assert.equal(label.hasAttribute('for'), false);
  assert.equal(semantic.id, 'channel-control');
  assert.equal(semantic.getAttribute('aria-labelledby'), 'channel-label');
  assert.equal(semantic.getAttribute('aria-describedby'), 'channel-description channel-message');
  assert.equal(semantic.getAttribute('aria-required'), 'true');
  assert.equal(semantic.getAttribute('aria-readonly'), 'true');
  assert.equal(semantic.hasAttribute('name'), false);
  assert.equal(hidden.name, 'notifications[0].value');
  assert.equal(hidden.required, false);

  app.unmount();
  host.remove();
});
