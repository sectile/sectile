import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, Fragment, h } from 'vue';
import { createTestWindow } from './happy-dom.mjs';
import { ComboboxContent, ComboboxInput, ComboboxItem, ComboboxRoot, ComboboxResults } from '../.verification-dist/combobox.js';
import { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuItem, MenuRoot, MenubarRoot, MenuSubContent } from '../.verification-dist/menu.js';
import { ContextMenuRoot, ContextMenuTrigger, ContextMenuContent } from '../.verification-dist/context-menu.js';
import { NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuRoot, NavigationMenuTrigger } from '../.verification-dist/navigation-menu.js';
import { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from '../.verification-dist/select.js';
import { ToolbarItem, ToolbarRoot, ToolbarSeparator } from '../.verification-dist/toolbar.js';

async function render(component) { return renderToString(createSSRApp({ render: component })); }

test('menu SSR relationships are complete and stable before DOM registration', async () => {
  const items = [{ id: 'products / 1', parentID: null }, { id: 'overview', parentID: 'products / 1' }];
  const body = () => [h(MenuItem, { value: 'products / 1', as: 'button' }, { default: () => 'Products' }),
    h(MenuSubContent, { for: 'products / 1' }, { default: () => h(MenuItem, { value: 'overview', as: 'button' }, { default: () => 'Overview' }) })];
  const fixture = () => h(Fragment, null, [
    ...[MenuRoot, MenubarRoot, NavigationMenuRoot].map(Root => h(Root, { items }, { default: body })),
    h(MenuButtonRoot, { items }, { default: () => [h(MenuButtonTrigger, null, { default: () => 'Actions' }), h(MenuButtonContent, null, { default: body })] }),
    h(ContextMenuRoot, { items }, { default: () => [h(ContextMenuTrigger, null, { default: () => 'Context actions' }), h(ContextMenuContent, null, { default: body })] }),
  ]);
  const window = createTestWindow(), ids = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    window.document.body.innerHTML = await render(fixture);
    const controls = [...window.document.querySelectorAll('[aria-controls]')]; assert.equal(controls.length, 7);
    const targets = controls.map(element => element.getAttribute('aria-controls'));
    assert.equal(new Set(targets).size, 7);
    for (const id of targets) { assert.ok(id); assert.equal(/\s/u.test(id), false); assert.ok(window.document.getElementById(id)); }
    const labels = [...window.document.querySelectorAll('[aria-labelledby]')]; assert.equal(labels.length, 6);
    for (const panel of labels) {
      const label = window.document.getElementById(panel.getAttribute('aria-labelledby'));
      assert.ok(label); assert.ok(label.textContent.trim());
    }
    ids.push(targets);
    const context = window.document.querySelector('[data-scope=context-menu][data-part=content]');
    assert.equal(context.hidden, true); assert.equal(context.style.position, 'fixed'); assert.equal(context.style.visibility, 'hidden');
  }
  assert.deepEqual(ids[0], ids[1]);
  for (const [Part, name] of [[ContextMenuTrigger, 'ContextMenuTrigger'], [ContextMenuContent, 'ContextMenuContent']]) {
    await assert.rejects(render(() => h(Part)), error => error instanceof TypeError
      && error.message === `${name} must be used inside a menu root.`);
  }
});

test('borrowed context target retains its primary attributes and requires an explicit popup name', async () => {
  const items = [{ id: 'save', parentID: null }];
  const target = () => h('button', { id: 'primary-submit', type: 'submit', disabled: true, 'aria-label': 'Save form',
    'aria-controls': 'confirmation', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', class: 'primary-target' }, 'Save');
  const fixture = label => h(ContextMenuRoot, { items, label, defaultOpen: true, disabled: false }, {
    default: () => [h(ContextMenuTrigger, { asChild: true }, { default: target }), h(ContextMenuContent)],
  });
  const window = createTestWindow(); window.document.body.innerHTML = await render(() => fixture('More actions'));
  const button = window.document.querySelector('button'), content = window.document.querySelector('[role=menu]');
  assert.equal(button.id, 'primary-submit'); assert.equal(button.type, 'submit'); assert.equal(button.disabled, true);
  assert.equal(button.className, 'primary-target'); assert.equal(button.getAttribute('aria-label'), 'Save form');
  assert.equal(button.getAttribute('aria-haspopup'), 'dialog'); assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(button.getAttribute('aria-controls'), 'confirmation'); assert.equal(content.getAttribute('aria-label'), 'More actions');
  await assert.rejects(render(() => fixture(undefined)), /nonempty label/);
});

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

test('Vue Select selected Form options keep bounded native SSR and reject foreign values', async () => {
  const window = createTestWindow(), items = Array.from({ length: 5000 }, (_, index) => 'row-' + index);
  const ordinary = await render(() => h(SelectRoot, { items: ['a', 'b'], name: 'service', defaultValue: 'a' }));
  window.document.body.innerHTML = ordinary;
  assert.equal(window.document.querySelectorAll('select option').length, 3);
  for (const value of ['row-4999', null, 'foreign']) {
    let labels = 0;
    const html = await render(() => h(SelectRoot, { items, modelValue: value, formOptions: 'selected', name: 'service', form: 'external',
      textValue: id => { labels++; return 'Label ' + id; } }));
    window.document.body.innerHTML = '<form id="external"></form>' + html;
    const select = window.document.querySelector('select');
    assert.equal(select.options.length, value === 'row-4999' ? 2 : 1);
    assert.equal(select.getAttribute('form'), 'external');
    assert.equal(labels, value === 'row-4999' ? 1 : 0);
    assert.deepEqual(new window.FormData(window.document.querySelector('form')).getAll('service'), [value === 'row-4999' ? value : '']);
  }
  const disabled = await render(() => h(SelectRoot, { items: ['a'], defaultValue: 'a', disabledItems: ['a'], name: 'service', formOptions: 'selected' }));
  window.document.body.innerHTML = disabled;
  assert.equal(window.document.querySelector('option[value=a]').disabled, true);
  await assert.rejects(render(() => h(SelectRoot, { items: [], formOptions: 'visible' })), /formOptions requires all or selected/u);
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
  assert.match(html, /id="sectile-select-[^"]+-content-item-s%3Aalpha"/);
});

test('Vue Select declared windows gate only active-descendant publication in SSR', async () => {
  const window = createTestWindow();
  for (const renderedItems of [undefined, [], ['alpha', 'foreign', 'alpha']]) {
    window.document.body.innerHTML = await render(() => h(SelectRoot, { items: ['alpha'], defaultValue: 'alpha', defaultOpen: true, renderedItems }, {
      default: () => [h(SelectTrigger), h(SelectContent, null, { default: () => h(SelectItem, { value: 'alpha' }, () => 'Alpha') })],
    }));
    const popup = window.document.querySelector('[role=listbox]'), option = window.document.querySelector('[role=option]');
    assert.equal(popup.getAttribute('aria-activedescendant'), renderedItems?.length === 0 ? null : option.id);
    assert.equal(option.getAttribute('aria-selected'), 'true');
  }
  await assert.rejects(render(() => h(SelectRoot, { items: ['alpha'], defaultValue: 'alpha', renderedItems: [1] }, {
    default: () => h(SelectContent),
  })), /renderedItems requires an array of IDs/u);
});

test('Vue combobox renders one native editing input and persistent listbox content', async () => {
  const items = [{ id: 'alpha', label: 'Alpha' }, { id: 'beta', label: 'Beta' }];
  const html = await render(() => h(ComboboxRoot, { items, defaultInputValue: 'Al', defaultOpen: true }, {
    default: () => [h(ComboboxInput), h(ComboboxContent, null, { default: () => items.map(({ id }) => h(ComboboxItem, { value: id })) })],
  }));
  assert.match(html, /role="combobox"/);
  assert.match(html, /value="Al"/);
  assert.equal((html.match(/role="listbox"/g) ?? []).length, 1);
  const inline = await render(() => h(ComboboxRoot, { items, presentation: 'inline', defaultOpen: true }, {
    default: () => [h(ComboboxInput, { 'aria-controls': 'inline-results' }), h(ComboboxContent, { id: 'inline-results' }, { default: () => h(ComboboxItem, { value: 'alpha' }) })],
  }));
  assert.equal((inline.match(/role="listbox"/g) ?? []).length, 1); assert.ok(inline.includes('aria-controls='));
  assert.equal(inline.includes('position:'), false);
});

test('Vue ComboboxResults renders the matching records without its own DOM wrapper during SSR', async () => {
  const html = await render(() => h(ComboboxRoot, { items: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }],
    defaultInputValue: 'Al', policies: { matches: (label, query) => label.startsWith(query) },
  }, { default: () => h(ComboboxResults, null, { default: ({ items }) => items.map(item => h('span', null, item.label)) }) }));
  assert.equal(html.includes('Alpha'), true); assert.equal(html.includes('Beta'), false);
  assert.equal((html.match(/<div/g) ?? []).length, 1);
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
  assert.doesNotMatch(html, /aria-haspopup="menu"/);
});

test('Vue toolbar uses roving-control structure without styling', async () => {
  const html = await render(() => h(ToolbarRoot, { items: ['bold', 'italic'], label: 'Formatting' }, {
    default: () => [h(ToolbarItem, { value: 'bold' }), h(ToolbarSeparator), h(ToolbarItem, { value: 'italic' })],
  }));
  assert.match(html, /role="toolbar"/);
  assert.match(html, /aria-label="Formatting"/);
  assert.match(html, /role="separator"/);
});
