import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  FormData: browserWindow.FormData,
  MutationObserver: browserWindow.MutationObserver,
  getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
});

const { createSSRApp, h, nextTick } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { DisclosureContent, DisclosureRoot, DisclosureTrigger } = await import('../dist/disclosure.js');
const { DialogContent, DialogRoot, DialogTrigger } = await import('../dist/dialog.js');
const { PinInputInput, PinInputRoot } = await import('../dist/pin-input.js');

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
      assert.equal(rendered.host.querySelector('[data-part="content"]') !== null, open);
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
