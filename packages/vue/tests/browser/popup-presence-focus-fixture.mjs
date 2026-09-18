import { createApp, h, nextTick, ref } from 'vue';
import { createMenu } from '@sectile/dom/menu';
import { DialogClose, DialogContent, DialogRoot, DialogTrigger } from '../../.verification-dist/overlay/dialog.js';
import { PopoverClose, PopoverContent, PopoverRoot, PopoverTrigger } from '../../.verification-dist/overlay/popover.js';
import { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuItem, MenuSubContent } from '../../.verification-dist/menu.js';

const motion = Object.freeze({ transitionProperty: 'opacity', transitionDuration: '20ms' });
const menuMotion = Object.freeze({ transitionProperty: 'opacity', transitionDuration: '100ms' });

export async function runPopupPresenceFocusScenarios() {
  return Object.freeze({
    'popup-dialog-uncontrolled-retained-reopen-focus': await popupScenario('dialog', false),
    'popup-dialog-controlled-retained-reopen-focus': await popupScenario('dialog', true),
    'popup-popover-uncontrolled-retained-reopen-focus': await popupScenario('popover', false),
    'popup-popover-controlled-retained-reopen-focus': await popupScenario('popover', true),
    'menu-button-uncontrolled-retained-reopen-focus': await menuScenario(false, false),
    'menu-button-controlled-retained-reopen-focus': await menuScenario(true, false),
    'menu-submenu-uncontrolled-retained-reopen-focus': await menuScenario(false, true),
    'menu-submenu-controlled-retained-reopen-focus': await menuScenario(true, true),
    'menu-button-uncontrolled-positioned-retained-reopen-focus': await menuScenario(false, false, true),
    'menu-button-controlled-positioned-retained-reopen-focus': await menuScenario(true, false, true),
    'menu-composed-click-routing': menuComposedClickScenario(),
  });
}

function menuComposedClickScenario() {
  const host = document.createElement('div');
  const root = document.createElement('div');
  const openHost = document.createElement('div');
  const closedHost = document.createElement('div');
  const unmatched = document.createElement('span');
  const inside = document.createElement('button');
  const closedInside = document.createElement('button');
  openHost.attachShadow({ mode: 'open' }).append(inside);
  closedHost.attachShadow({ mode: 'closed' }).append(closedInside);
  root.append(openHost, closedHost, unmatched);
  host.append(root);
  document.body.append(host);
  const invoked = [];
  const menu = createMenu({
    root, items: [{ id: 'inside' }, { id: 'closed-host' }, { id: 'outside' }],
    onInvoke: (id) => invoked.push(id),
  });
  menu.setItemAttributes(inside, 'inside');
  menu.setItemAttributes(closedHost, 'closed-host');
  menu.setItemAttributes(host, 'outside');
  let retargeted = false;
  const observe = (event) => { if (event.target === openHost) retargeted = true; };
  root.addEventListener('click', observe);
  try {
    inside.click();
    const openShadow = invoked.length === 1 && invoked[0] === 'inside' && retargeted;
    menu.send('open-popup');
    closedInside.click();
    const closedShadow = invoked.length === 2 && invoked[1] === 'closed-host';
    menu.send('open-popup');
    const before = menu.getSnapshot();
    unmatched.click();
    const rootBoundary = invoked.length === 2 && menu.getSnapshot() === before;
    menu.destroy();
    inside.click();
    const disconnected = invoked.length === 2;
    return Object.freeze({ ok: openShadow && closedShadow && rootBoundary && disconnected,
      openShadow, closedShadow, rootBoundary, disconnected });
  } finally {
    menu.destroy();
    root.removeEventListener('click', observe);
    host.remove();
  }
}

async function popupScenario(kind, controlled) {
  const host = document.createElement('div');
  document.body.append(host);
  const open = ref(false);
  const triggerID = `browser-${kind}-${controlled ? 'controlled' : 'uncontrolled'}-trigger`;
  const closeID = `browser-${kind}-${controlled ? 'controlled' : 'uncontrolled'}-close`;
  const parts = kind === 'dialog'
    ? { Root: DialogRoot, Trigger: DialogTrigger, Content: DialogContent, Close: DialogClose }
    : { Root: PopoverRoot, Trigger: PopoverTrigger, Content: PopoverContent, Close: PopoverClose };
  const rootProps = {
    ...(kind === 'dialog' ? { modal: false } : { position: false }),
    ...(controlled
      ? { open: open.value, 'onUpdate:open': (next) => { open.value = next; } }
      : { defaultOpen: false }),
  };
  const app = createApp({
    render: () => h(parts.Root, {
      ...rootProps,
      ...(controlled ? { open: open.value } : {}),
    }, {
      default: () => [
        h(parts.Trigger, { id: triggerID }, { default: () => 'Open' }),
        h(parts.Content, { style: motion }, {
          default: () => h(parts.Close, { id: closeID }, { default: () => 'Close' }),
        }),
      ],
    }),
  });

  try {
    app.mount(host);
    await settle();
    const trigger = host.querySelector(`#${triggerID}`);
    const content = host.querySelector('[data-part="content"]');
    if (!(trigger instanceof HTMLButtonElement) || !(content instanceof HTMLElement)) {
      return Object.freeze({ ok: false, reason: 'popup fixture elements unavailable' });
    }

    trigger.click();
    await settle();
    const close = host.querySelector(`#${closeID}`);
    const firstOpenFocus = close instanceof HTMLButtonElement && document.activeElement === close;

    close?.click();
    await settle();
    const restoredFocus = document.activeElement === trigger;
    const retainedExit = !content.hidden && content.inert && content.getAttribute('aria-hidden') === 'true';

    trigger.click();
    await settle();
    const retainedNode = host.querySelector('[data-part="content"]') === content;
    const reopenedFocus = document.activeElement === close;
    const reopenedInteractive = !content.hidden && !content.inert && content.getAttribute('aria-hidden') === null;

    close?.click();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 25));
    content.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await settle();
    const exited = content.hidden && !content.inert;

    trigger.click();
    await settle();
    const fullExitReopenFocus = document.activeElement === close;

    return Object.freeze({
      ok: firstOpenFocus && restoredFocus && retainedExit && retainedNode && reopenedFocus
        && reopenedInteractive && exited && fullExitReopenFocus,
      firstOpenFocus,
      restoredFocus,
      retainedExit,
      retainedNode,
      reopenedFocus,
      reopenedInteractive,
      exited,
      fullExitReopenFocus,
    });
  } finally {
    app.unmount();
    host.remove();
  }
}

async function menuScenario(controlled, nested, position = false) {
  const host = document.createElement('div');
  document.body.append(host);
  const open = ref(false);
  const caption = ref('Item');
  const items = nested
    ? [{ id: 'parent', parentID: null }, { id: 'child', parentID: 'parent' }]
    : [{ id: 'item', parentID: null }];
  const app = createApp({
    render: () => h(MenuButtonRoot, {
      items, position,
      ...(controlled
        ? { open: open.value, 'onUpdate:open': (next) => { open.value = next; } }
        : { defaultOpen: false }),
    }, {
      default: () => [
        h(MenuButtonTrigger, null, { default: () => 'Actions' }),
        h(MenuButtonContent, { style: menuMotion }, {
          default: () => nested ? [
            h(MenuItem, { value: 'parent' }, { default: () => 'Parent' }),
            h(MenuSubContent, { for: 'parent', style: menuMotion }, {
              default: () => h(MenuItem, { value: 'child' }, { default: () => caption.value }),
            }),
          ] : h(MenuItem, { value: 'item' }, { default: () => caption.value }),
        }),
      ],
    }),
  });
  let mounted = false;
  let releaseProbe = () => {};
  try {
    app.mount(host);
    mounted = true;
    await settle();
    const trigger = host.querySelector('[data-part="trigger"]');
    const surfaceSelector = nested ? '[data-part="sub-content"]' : '[data-part="content"]';
    const surface = host.querySelector(surfaceSelector);
    const target = host.querySelector(`[data-sectile-menu-id="${nested ? 'child' : 'item'}"]`);
    const parent = host.querySelector('[data-sectile-menu-id="parent"]');
    if (!(trigger instanceof HTMLButtonElement) || !(surface instanceof HTMLElement)
      || !(target instanceof HTMLElement) || (nested && !(parent instanceof HTMLElement))) {
      return Object.freeze({ ok: false, reason: 'menu fixture elements unavailable' });
    }

    const listeners = trackPresenceListeners(surface);
    const originalFocus = target.focus;
    let focusCalls = 0;
    target.focus = function (...args) { focusCalls += 1; return originalFocus.apply(this, args); };
    releaseProbe = () => { delete target.focus; listeners.restore(); };
    const key = (element, value) => element.dispatchEvent(new KeyboardEvent('keydown', {
      key: value, bubbles: true, cancelable: true,
    }));
    const openSurface = async () => {
      if (nested) key(parent, 'ArrowRight');
      else trigger.click();
      await settle();
      // Positioned surfaces publish visibility and pending focus in their layout frame.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await settle();
    };
    const closeSurface = () => nested ? key(target, 'ArrowLeft') : trigger.click();
    const interactive = () => !surface.hidden && !surface.inert && surface.getAttribute('aria-hidden') === null;
    const retained = () => !surface.hidden && surface.inert && surface.getAttribute('aria-hidden') === 'true';
    if (nested) { trigger.click(); await settle(); }
    await openSurface();
    await settle();
    const firstOpenFocus = document.activeElement === target && focusCalls === 1;

    caption.value = 'Updated item';
    await settle();
    const ordinaryUpdateFocus = document.activeElement === target && focusCalls === 1;
    const retainedReopens = [];
    for (let cycle = 0; cycle < 3; cycle += 1) {
      closeSurface();
      await settle();
      const closed = retained() && document.activeElement === (nested ? parent : trigger)
        && listeners.count() === 2;
      await openSurface();
      await settle();
      retainedReopens.push(closed && host.querySelector(surfaceSelector) === surface
        && interactive() && document.activeElement === target
        && focusCalls === cycle + 2 && listeners.count() === 0);
    }

    // Outlive the cancelled exit's fallback and deliver its late end event.
    await new Promise((resolve) => setTimeout(resolve, 160));
    surface.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await settle();
    const staleExitIgnored = interactive() && document.activeElement === target
      && focusCalls === 4 && listeners.count() === 0;

    closeSurface();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 105));
    surface.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await settle();
    const fullExit = surface.hidden && !surface.inert && listeners.count() === 0;
    await openSurface();
    await settle();
    const fullExitReopenFocus = interactive() && document.activeElement === target && focusCalls === 5;

    closeSurface();
    await settle();
    const pendingExit = retained() && listeners.count() === 2;
    const reopening = openSurface();
    app.unmount();
    mounted = false;
    await reopening;
    const disconnected = pendingExit && listeners.count() === 0;
    surface.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await settle();
    const noPostUnmountFocus = focusCalls === 5;
    return Object.freeze({
      ok: firstOpenFocus && ordinaryUpdateFocus && retainedReopens.every(Boolean)
        && staleExitIgnored && fullExit && fullExitReopenFocus && disconnected && noPostUnmountFocus,
      firstOpenFocus, ordinaryUpdateFocus, retainedReopens, staleExitIgnored,
      fullExit, fullExitReopenFocus, disconnected, noPostUnmountFocus, focusCalls,
    });
  } finally {
    if (mounted) app.unmount();
    releaseProbe();
    host.remove();
  }
}

function trackPresenceListeners(element) {
  const listeners = new Map([['animationend', new Set()], ['transitionend', new Set()]]);
  const add = element.addEventListener;
  const remove = element.removeEventListener;
  element.addEventListener = function (type, listener, ...args) {
    listeners.get(type)?.add(listener);
    return add.call(this, type, listener, ...args);
  };
  element.removeEventListener = function (type, listener, ...args) {
    listeners.get(type)?.delete(listener);
    return remove.call(this, type, listener, ...args);
  };
  return {
    count: () => [...listeners.values()].reduce((count, entries) => count + entries.size, 0),
    restore: () => { delete element.addEventListener; delete element.removeEventListener; },
  };
}

async function settle() {
  await nextTick();
  await nextTick();
}
