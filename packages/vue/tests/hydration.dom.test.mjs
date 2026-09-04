import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  HTMLFormElement: browserWindow.HTMLFormElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  FormData: browserWindow.FormData,
  MutationObserver: browserWindow.MutationObserver,
  getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
});

const { createSSRApp, h, nextTick } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { DisclosureContent, DisclosureRoot, DisclosureTrigger } = await import('../.verification-dist/disclosure.js');
const { DialogContent, DialogRoot, DialogTrigger } = await import('../.verification-dist/dialog.js');
const { PinInputInput, PinInputRoot } = await import('../.verification-dist/pin-input.js');
const { FormField, FormFieldSelector, FormRoot, FormSelector } = await import('../.verification-dist/form.js');
const { TextField } = await import('../.verification-dist/text.js');

async function hydrate(component) {
  const html = await renderToString(createSSRApp(component));
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const warnings = [];
  const app = createSSRApp(component);
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host);
  await nextTick();
  return { app, host, html, warnings };
}

test('[HYD-03] host-generated IDs preserve server-to-client identity', async () => {
  const component = {
    render: () => h(DisclosureRoot, null, {
      default: () => [
        h(DisclosureTrigger, null, { default: () => 'Details' }),
        h(DisclosureContent, null, { default: () => 'Content' }),
      ],
    }),
  };
  const rendered = await hydrate(component);
  try {
    const trigger = rendered.host.querySelector('[data-part="trigger"]');
    const content = rendered.host.querySelector('[data-part="content"]');
    assert.ok(trigger instanceof HTMLButtonElement);
    assert.ok(content instanceof HTMLElement);
    assert.equal(trigger.getAttribute('aria-controls'), content.id);
    assert.match(rendered.html, new RegExp(`id="${content.id}"`));
    assert.deepEqual(rendered.warnings, []);
  } finally {
    rendered.app.unmount();
    rendered.host.remove();
  }
});

test('[HYD-04] conditional popup presence hydrates both initial variants', async () => {
  for (const open of [false, true]) {
    const component = {
      render: () => h(DialogRoot, {
        defaultOpen: open,
        modal: false,
        label: 'Hydration dialog',
        unmountOnExit: true,
      }, {
        default: () => [
          h(DialogTrigger, null, { default: () => 'Open' }),
          h(DialogContent, null, { default: () => 'Conditional content' }),
        ],
      }),
    };
    const rendered = await hydrate(component);
    try {
      const content = rendered.host.querySelector('[data-part="content"]');
      assert.equal(content !== null, open);
      if (content instanceof HTMLElement) {
        assert.equal(content.hidden, false);
        assert.equal(content.inert, false);
        assert.equal(content.getAttribute('aria-hidden'), null);
      }
      assert.deepEqual(rendered.warnings, []);
    } finally {
      rendered.app.unmount();
      rendered.host.remove();
    }
  }
});

test('[HYD-05] hidden form controls preserve SSR hydration and submission state', async () => {
  const component = {
    render: () => h('form', { id: 'pin-form' }, [
      h(PinInputRoot, {
        length: 4,
        defaultValue: '1234',
        name: 'pin',
      }, {
        default: () => Array.from({ length: 4 }, (_, index) => h(PinInputInput, { index })),
      }),
    ]),
  };
  const rendered = await hydrate(component);
  try {
    const hidden = rendered.host.querySelector('input[type="hidden"][name="pin"]');
    assert.ok(hidden instanceof HTMLInputElement);
    assert.equal(hidden.value, '1234');
    assert.equal(rendered.host.querySelectorAll('[data-part="input"]').length, 4);
    assert.equal(new FormData(rendered.host.querySelector('form')).get('pin'), '1234');
    assert.deepEqual(rendered.warnings, []);
  } finally {
    rendered.app.unmount();
    rendered.host.remove();
  }
});

test('[HYD-07] Form hydration registers one participant and preserves controlled ownership', async () => {
  const states = [];
  const component = {
    render: () => h(FormRoot, {
      id: 'account-form',
      onStateChange: (state) => states.push(state),
    }, {
      default: () => h(FormField, {
        id: 'email',
        name: ['profile', 'email'],
      }, {
        default: () => [
          h(TextField, {
            modelValue: 'owner@sectile.dev',
            'onUpdate:modelValue': () => {},
          }),
          h(FormFieldSelector, {
            id: 'email',
            select: (field) => field?.valid ?? true,
          }, { default: ({ selected }) => h('output', { 'data-field-valid': '' }, String(selected)) }),
          h(FormSelector, {
            select: (state) => state.submission.status,
          }, { default: ({ selected }) => h('output', { 'data-submit-status': '' }, selected) }),
        ],
      }),
    }),
  };
  const rendered = await hydrate(component);
  try {
    await nextTick();
    const form = rendered.host.querySelector('form');
    const input = rendered.host.querySelector('input');
    assert.ok(form instanceof HTMLFormElement);
    assert.ok(input instanceof HTMLInputElement);
    assert.equal(input.name, 'profile.email');
    assert.equal(input.value, 'owner@sectile.dev');
    assert.equal(new FormData(form).get('profile.email'), 'owner@sectile.dev');
    assert.equal(states.at(-1).fields.length, 1);
    assert.equal(states.at(-1).fields[0].id, 'email');
    assert.equal(rendered.host.querySelector('[data-field-valid]').textContent, 'true');
    assert.equal(rendered.host.querySelector('[data-submit-status]').textContent, 'idle');
    assert.deepEqual(rendered.warnings, []);
  } finally {
    rendered.app.unmount();
    rendered.host.remove();
  }
});
