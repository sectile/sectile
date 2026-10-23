import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const window = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
  Element: window.Element,
  Node: window.Node,
  MutationObserver: window.MutationObserver,
  Event: window.Event,
});

const { createApp, h, nextTick, onMounted, shallowRef } = await import('vue');
const { HostProvider, HostPortal } = await import('../.verification-dist/host-provider.js');
const { DialogContent, DialogPortal, DialogRoot } = await import('../.verification-dist/overlay/dialog.js');

test('HostProvider supplies the default portal target and local targets override it', () => {
  const host = document.createElement('div');
  const suppliedTarget = document.createElement('div');
  const localTarget = document.createElement('div');
  document.body.append(host, suppliedTarget, localTarget);

  const app = createApp({
    render: () => h(HostProvider, { portalTarget: suppliedTarget }, {
      default: () => [
        h(DialogRoot, { defaultOpen: true }, {
          default: () => h(DialogPortal, null, {
            default: () => h(DialogContent, null, { default: () => 'Supplied target' }),
          }),
        }),
        h(DialogRoot, { defaultOpen: true }, {
          default: () => h(DialogPortal, { to: localTarget }, {
            default: () => h(DialogContent, null, { default: () => 'Local target' }),
          }),
        }),
      ],
    }),
  });
  app.mount(host);

  assert.match(suppliedTarget.textContent, /Supplied target/);
  assert.doesNotMatch(suppliedTarget.textContent, /Local target/);
  assert.match(localTarget.textContent, /Local target/);

  app.unmount();
  host.remove();
  suppliedTarget.remove();
  localTarget.remove();
});

test('HostPortal applies the requested destination after disabled target changes without remounting its content', async () => {
  const host = document.createElement('div'), first = document.createElement('div'), second = document.createElement('div');
  document.body.append(host, first, second);
  const to = shallowRef(first), disabled = shallowRef(false);
  let mounts = 0;
  const Content = { setup() { onMounted(() => mounts++); return () => h('input', { value: 'Retained draft' }); } };
  const app = createApp({ render: () => h(HostPortal, { to: to.value, disabled: disabled.value }, { default: () => h(Content) }) });
  try {
    app.mount(host); const input = first.querySelector('input'); assert.ok(input);
    disabled.value = true; to.value = second; await nextTick();
    assert.ok(host.querySelector('input') === input);
    disabled.value = false; await nextTick();
    assert.ok(second.querySelector('input') === input, 're-enabling honors the last requested target');
    disabled.value = true; to.value = first; await nextTick();
    to.value = 'body'; await nextTick();
    assert.ok(host.querySelector('input') === input);
    disabled.value = false; await nextTick();
    assert.ok(input.parentElement === document.body, 'changes while disabled do not leave the old physical target cached');
    assert.equal(input.value, 'Retained draft'); assert.equal(mounts, 1);
  } finally { app.unmount(); host.remove(); first.remove(); second.remove(); }
  assert.equal(document.body.querySelector('input'), null);
});

test('popup Portal moves retain native focus without overriding a deliberate external destination', async () => {
  const host = document.createElement('div'), first = document.createElement('div'), second = document.createElement('div'), outside = document.createElement('button');
  document.body.append(host, first, second, outside);
  const to = shallowRef(first), disabled = shallowRef(false);
  const app = createApp({ render: () => h(DialogRoot, { defaultOpen: true, modal: false, autoFocus: false, trapFocus: false }, {
    default: () => h(DialogPortal, { to: to.value, disabled: disabled.value }, {
      default: () => h(DialogContent, null, { default: () => h('input', { value: 'Retained focus draft' }) }),
    }),
  }) });
  try {
    app.mount(host); await nextTick(); await nextTick();
    const input = first.querySelector('input'); assert.ok(input);
    // Model native reinsertion blur at the platform boundary; happy-dom does not
    // consistently drop focus when an existing ancestor is inserted elsewhere.
    const restores = [];
    for (const target of [host, first, second]) {
      const insert = target.insertBefore.bind(target);
      target.insertBefore = (node, anchor) => { const result = insert(node, anchor); if (node.contains(input)) input.blur(); return result; };
      restores.push(() => { target.insertBefore = insert; });
    }
    try {
      input.focus(); input.setSelectionRange(2, 7);
      to.value = second; await nextTick();
      assert.ok(second.contains(input)); assert.ok(document.activeElement === input);
      assert.equal(input.selectionStart, 2); assert.equal(input.selectionEnd, 7);
      disabled.value = true; to.value = document.body; await nextTick();
      assert.ok(host.contains(input)); assert.ok(document.activeElement === input);
      to.value = first; outside.focus(); await nextTick();
      assert.ok(document.activeElement === outside, 'an external focus owner is not replaced');
      input.focus(); disabled.value = false; await nextTick();
      assert.ok(first.contains(input)); assert.ok(document.activeElement === input);
      assert.equal(input.value, 'Retained focus draft');
    } finally { for (const restore of restores) restore(); }
  } finally { app.unmount(); host.remove(); first.remove(); second.remove(); outside.remove(); }
  assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
});
