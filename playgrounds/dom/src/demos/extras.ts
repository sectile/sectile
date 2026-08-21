import { createAccordion } from '@sectile/dom/accordion'; import { createAlertDialog } from '@sectile/dom/alert-dialog'; import { createCarousel } from '@sectile/dom/carousel'; import { createCheckbox } from '@sectile/dom/checkbox'; import { createDialog } from '@sectile/dom/dialog'; import { createDisclosure } from '@sectile/dom/disclosure'; import { createFeed } from '@sectile/dom/feed'; import { createGridControl } from '@sectile/dom/grid'; import { createMenu } from '@sectile/dom/menu'; import { createMenuButton } from '@sectile/dom/menu-button'; import { createMenubar } from '@sectile/dom/menubar'; import { createMultiThumbSlider } from '@sectile/dom/multi-thumb-slider'; import { createRadioGroup } from '@sectile/dom/radio-group'; import { createSpinButton } from '@sectile/dom/spin-button'; import { createSwitch } from '@sectile/dom/switch'; import { createTabs } from '@sectile/dom/tabs'; import { createToggleButton } from '@sectile/dom/toggle-button'; import { createToolbar } from '@sectile/dom/toolbar'; import { createTooltip } from '@sectile/dom/tooltip'; import { createWindowSplitter } from '@sectile/dom/window-splitter'; import { unwrap } from '@sectile/primitives/result'; import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';
import { Bold, createElement } from 'lucide';

interface SnapshotConnection { getSnapshot(): { readonly revision: number; readonly state: unknown }; disconnect?: () => void }
interface Setup { readonly connection: SnapshotConnection; readonly actions: readonly (readonly [string, () => void])[]; readonly focus?: () => void }
type SetupFactory = (root: HTMLElement, render: () => void) => Setup;
function definition(id: string, label: string, setup: SetupFactory, description = 'Public @sectile/dom facade · click the controls or use its keyboard vocabulary.'): DemoDefinition { return { id, label, title: label, description, shortcuts: [], mount(context: DemoContext): DemoSession { const root = document.createElement('section'); root.className = 'extra-control'; root.tabIndex = 0; const controls = document.createElement('div'); controls.className = 'extra-actions'; context.surface.append(root, controls); let active: Setup | null = null; const render = () => { if (active === null) return; const snapshot = active.connection.getSnapshot(); context.showState(snapshot.revision, snapshot.state); }; active = setup(root, render); for (const [labelText, action] of active.actions) { const button = document.createElement('button'); button.type = 'button'; button.textContent = labelText; button.addEventListener('click', () => { action(); render(); }); controls.append(button); } render(); return { focus: active.focus ?? (() => root.focus()), disconnect: () => active?.connection.disconnect?.() }; } }; }
function element(tag = 'button'): HTMLElement { const value = document.createElement(tag); value.textContent = tag === 'input' ? '' : 'interactive target'; return value; }

function toggleButtonSetup(root: HTMLElement, render: () => void): Setup {
  root.classList.add('toggle-button-demo');
  root.removeAttribute('tabindex');

  const toolbar = document.createElement('div');
  toolbar.className = 'toggle-button-toolbar';
  const target = document.createElement('button');
  target.type = 'button';
  target.className = 'toggle-button-control secondary';
  target.append(
    createElement(Bold, { 'aria-hidden': 'true', height: 17, width: 17 }),
    'Bold',
  );
  const status = document.createElement('p');
  status.className = 'toggle-button-status';
  status.setAttribute('aria-live', 'polite');
  toolbar.append(target, status);

  const preview = document.createElement('p');
  preview.className = 'toggle-button-preview';
  preview.textContent = 'Visible state makes an interface easier to trust.';
  root.append(toolbar, preview);

  const connection = unwrap(createToggleButton({
    element: target,
    onUpdate: sync,
  }));

  function sync(): void {
    const pressed = connection.getSnapshot().state.pressed;
    root.dataset['pressed'] = String(pressed);
    status.textContent = pressed
      ? 'On — the preview is bold.'
      : 'Off — the preview uses regular weight.';
    render();
  }

  sync();
  return { connection, actions: [], focus: () => target.focus() };
}

export const extraDemos: readonly DemoDefinition[] = Object.freeze([
  definition('tabs', 'Tabs', (root, render) => { const c = unwrap(createTabs({ root, items: ['one', 'two'], defaultValue: 'one', defaultHighlightedValue: 'one', onUpdate: render })); return { connection: c, actions: [['next', () => c.handleEvent('next')], ['activate', () => c.handleEvent('activate')]] }; }),
  definition('radio-group', 'Radio group', (root, render) => { const c = unwrap(createRadioGroup({ root, items: ['a', 'b'], defaultValue: 'a', onUpdate: render })); return { connection: c, actions: [['next', () => c.handleEvent('next')], ['check B', () => c.handleEvent({ type: 'check', id: 'b' })]] }; }),
  definition('toolbar', 'Toolbar', (root, render) => { const c = unwrap(createToolbar({ root, items: ['bold', 'italic'], defaultHighlightedValue: 'bold', onUpdate: render })); return { connection: c, actions: [['next', () => c.handleEvent('next')], ['invoke', () => c.handleEvent('invoke')]] }; }),
  definition('accordion', 'Accordion', (root, render) => { const c = unwrap(createAccordion({ root, items: ['one', 'two'], defaultHighlightedValue: 'one', onUpdate: render })); return { connection: c, actions: [['toggle', () => c.handleEvent('toggle')], ['next', () => c.handleEvent('next')]] }; }),
  definition('disclosure', 'Disclosure', (root, render) => { const trigger = element(); const panel = element('div'); root.append(trigger, panel); const c = unwrap(createDisclosure({ trigger, panel, onUpdate: render })); return { connection: c, actions: [['toggle', () => c.handleEvent('toggle')]] }; }),
  definition('checkbox', 'Checkbox', (root, render) => { const target = element(); root.append(target); const c = unwrap(createCheckbox({ element: target, defaultValue: 'mixed', onUpdate: render })); return { connection: c, actions: [['toggle', () => c.handleEvent('toggle')]] }; }),
  definition('switch', 'Switch', (root, render) => { const target = element(); root.append(target); const c = unwrap(createSwitch({ element: target, onUpdate: render })); return { connection: c, actions: [['toggle', () => c.handleEvent('toggle')]] }; }),
  definition(
    'toggle-button',
    'Toggle button',
    toggleButtonSetup,
    'A toggle button keeps an action on or off until it is pressed again. This example applies bold formatting to the preview.',
  ),
  definition('window-splitter', 'Window splitter', (root, render) => { const c = unwrap(createWindowSplitter({ root, min: '0', max: '10', step: '1', defaultValue: 5, onUpdate: render })); return { connection: c, actions: [['decrease', () => c.handleEvent('decrement')], ['increase', () => c.handleEvent('increment')]] }; }),
  definition('spin-button', 'Spin Button', (root, render) => { const input = document.createElement('input'); root.append(input); const c = unwrap(createSpinButton({ input, min: '0', max: '10', step: '1', defaultValue: 5, onUpdate: render })); return { connection: c, actions: [['decrease', () => c.handleEvent('decrement')], ['increase', () => c.handleEvent('increment')]], focus: () => input.focus() }; }),
  definition('dialog', 'Dialog', (root, render) => { const trigger = element(); root.append(trigger); const c = unwrap(createDialog({ root, trigger, onUpdate: render })); return { connection: c, actions: [['toggle', () => c.handleEvent('toggle')], ['close', () => c.handleEvent('close')]] }; }),
  definition('alert-dialog', 'Alert dialog', (root, render) => { const trigger = element(); root.append(trigger); const c = unwrap(createAlertDialog({ root, trigger, onUpdate: render })); return { connection: c, actions: [['open', () => c.handleEvent('open')], ['close', () => c.handleEvent('close')]] }; }),
  definition('tooltip', 'Tooltip', (root, render) => { const trigger = element(); root.append(trigger); const c = unwrap(createTooltip({ root, trigger, onUpdate: render })); return { connection: c, actions: [['show', () => c.handleEvent('open')], ['hide', () => c.handleEvent('close')]] }; }),
  definition('multi-thumb-slider', 'Multi-thumb slider', (root, render) => { const c = unwrap(createMultiThumbSlider({ root, thumbs: ['low', 'high'], min: '0', max: '10', step: '1', defaultValues: [2, 8], policies: { minGap: 2 }, onUpdate: render })); return { connection: c, actions: [['increase', () => c.handleEvent('increment')], ['next thumb', () => c.handleEvent('next-thumb')]] }; }),
  definition('grid', 'Grid', (root, render) => { const c = unwrap(createGridControl({ root, rows: [['a', 'b'], ['c', 'd']], defaultHighlightedValue: 'a', onUpdate: render })); return { connection: c, actions: [['right', () => c.handleEvent('right')], ['down', () => c.handleEvent('down')], ['select', () => c.handleEvent('select')]] }; }),
  definition('menu', 'Menu', (root, render) => { const c = unwrap(createMenu({ root, items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }], onUpdate: render })); return { connection: c, actions: [['focus root', () => c.handleEvent({ type: 'focus', id: 'file' })], ['open submenu', () => c.handleEvent('open-submenu')], ['invoke', () => c.handleEvent('invoke')]] }; }),
  definition('menubar', 'Menubar', (root, render) => { const c = unwrap(createMenubar({ root, items: [{ id: 'file', parentID: null }, { id: 'edit', parentID: null }], onUpdate: render })); return { connection: c, actions: [['next', () => c.handleEvent('next')], ['previous', () => c.handleEvent('previous')]] }; }),
  definition('menu-button', 'Menu button', (root, render) => { const trigger = element(); root.append(trigger); const c = unwrap(createMenuButton({ root, trigger, items: [{ id: 'copy', parentID: null }], onUpdate: render })); return { connection: c, actions: [['toggle popup', () => c.handleEvent(c.getSnapshot().state.open ? 'close-popup' : 'open-popup')], ['invoke', () => c.handleEvent('invoke')]] }; }),
  definition('carousel', 'Carousel', (root, render) => { const c = unwrap(createCarousel({ root, slides: ['one', 'two', 'three'], onUpdate: render })); return { connection: c, actions: [['previous', () => c.handleEvent('previous')], ['next', () => c.handleEvent('next')], ['pause', () => c.handleEvent('toggle-pause')]] }; }),
  definition('feed', 'Feed', (root, render) => { const c = unwrap(createFeed({ root, items: ['one', 'two'], onUpdate: render })); return { connection: c, actions: [['previous', () => c.handleEvent('previous')], ['next', () => c.handleEvent('next')], ['request after', () => c.handleEvent('request-after')]] }; }),
]);
