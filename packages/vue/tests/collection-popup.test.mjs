import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { ComboboxContent, ComboboxInput, ComboboxItem, ComboboxRoot } from '../dist/combobox.js';
import { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuItem, MenuRoot, MenubarRoot } from '../dist/menu.js';
import { NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuRoot, NavigationMenuTrigger } from '../dist/navigation-menu.js';
import { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from '../dist/select.js';
import { ToolbarItem, ToolbarRoot, ToolbarSeparator } from '../dist/toolbar.js';

async function render(component) { return renderToString(createSSRApp({ render: component })); }

test('Vue select keeps trigger, popup, options, and native form fallback', async () => {
  const html = await render(() => h(SelectRoot, { items: ['alpha', 'beta'], defaultValue: 'alpha', name: 'release' }, {
    default: () => [
      h(SelectTrigger, null, { default: () => h(SelectValue) }),
      h(SelectContent, null, { default: () => ['alpha', 'beta'].map((value) => h(SelectItem, { value }, { default: () => [value, h(SelectItemIndicator)] })) }),
    ],
  }));
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /role="option"/);
  assert.match(html, /name="release"/);
  assert.match(html, /data-part="item-indicator"/);
});

test('Vue select exposes portal-safe anatomy and active descendant linkage', async () => {
  const html = await render(() => h(SelectRoot, { items: ['alpha'], defaultOpen: true }, {
    default: () => [
      h(SelectTrigger, null, { default: () => h(SelectValue) }),
      h(SelectPortal, { disabled: true }, { default: () => h(SelectContent, null, {
        default: () => h(SelectViewport, null, { default: () => h(SelectItem, { value: 'alpha' }, { default: () => h(SelectItemText, null, { default: () => 'Alpha' }) }) }),
      }) }),
    ],
  }));
  assert.match(html, /aria-controls="sectile-select-[^"]+-content"/);
  assert.match(html, /data-part="viewport"/);
  assert.match(html, /data-part="item-text"/);
  assert.match(html, /id="sectile-select-[^"]+-content-item-alpha"/);
});

test('Vue combobox renders one native editing input and persistent listbox content', async () => {
  const items = [{ id: 'alpha', label: 'Alpha' }, { id: 'beta', label: 'Beta' }];
  const html = await render(() => h(ComboboxRoot, { items, defaultInputValue: 'Al', defaultOpen: true }, {
    default: () => [h(ComboboxInput), h(ComboboxContent, null, { default: () => items.map(({ id }) => h(ComboboxItem, { value: id })) })],
  }));
  assert.match(html, /role="combobox"/);
  assert.match(html, /value="Al"/);
  assert.equal((html.match(/role="listbox"/g) ?? []).length, 1);
});

test('Vue menu variants preserve menu, menu button, and menubar roles', async () => {
  const items = [{ id: 'file' }, { id: 'edit' }];
  const menu = await render(() => h(MenuRoot, { items }, { default: () => items.map(({ id }) => h(MenuItem, { value: id })) }));
  const button = await render(() => h(MenuButtonRoot, { items }, { default: () => [
    h(MenuButtonTrigger, null, { default: () => 'Actions' }),
    h(MenuButtonContent, null, { default: () => items.map(({ id }) => h(MenuItem, { value: id })) }),
  ] }));
  const bar = await render(() => h(MenubarRoot, { items }, { default: () => items.map(({ id }) => h(MenuItem, { value: id })) }));
  assert.match(menu, /role="menu"/);
  assert.match(button, /aria-haspopup="menu"/);
  assert.match(button, /data-part="content"/);
  assert.match(bar, /role="menubar"/);
});

test('Vue navigation menu preserves navigation, list, trigger, content, and native link composition', async () => {
  const items = [{ id: 'products', parentID: null }, { id: 'overview', parentID: 'products' }, { id: 'docs', parentID: null }];
  const html = await render(() => h(NavigationMenuRoot, { items, label: 'Primary' }, { default: () => h(NavigationMenuList, null, { default: () => [
    h(NavigationMenuItem, null, { default: () => [
      h(NavigationMenuTrigger, { value: 'products', as: 'button' }, { default: () => 'Products' }),
      h(NavigationMenuContent, { for: 'products' }, { default: () => h(NavigationMenuLink, { value: 'overview', as: 'a', href: '/overview' }, { default: () => 'Overview' }) }),
    ] }),
    h(NavigationMenuItem, null, { default: () => h(NavigationMenuLink, { value: 'docs', as: 'a', href: '/docs' }, { default: () => 'Docs' }) }),
  ] }) }));
  assert.match(html, /role="navigation"/);
  assert.match(html, /aria-label="Primary"/);
  assert.match(html, /href="\/docs"/);
  assert.doesNotMatch(html, /role="menuitem"/);
});

test('Vue toolbar uses roving-control structure without styling', async () => {
  const html = await render(() => h(ToolbarRoot, { items: ['bold', 'italic'], label: 'Formatting' }, {
    default: () => [h(ToolbarItem, { value: 'bold' }), h(ToolbarSeparator), h(ToolbarItem, { value: 'italic' })],
  }));
  assert.match(html, /role="toolbar"/);
  assert.match(html, /aria-label="Formatting"/);
  assert.match(html, /role="separator"/);
});
