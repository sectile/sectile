import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { componentAnatomy } from '../.vitepress/theme/component-anatomy.ts';

const providerRoots = new Set([
  'alert-dialog', 'date-picker', 'date-range-picker', 'date-time-picker',
  'date-time-range-picker', 'dialog', 'menu-button', 'popover', 'tooltip',
]);
const nativeFields = new Set(['date-field', 'date-time-field', 'number-field', 'text', 'time-field']);

test('every documented part is backed by one public Vue component', async () => {
  const mismatches = [];
  for (const { id } of catalog.components) {
    const source = await readFile(new URL(`../../packages/vue/src/${id}.ts`, import.meta.url), 'utf8');
    const exported = publicValues(source);
    const expected = new Set();

    for (const value of exported) {
      const part = publicPart(id, value);
      if (part !== null) expected.add(part);
    }

    const actualParts = [...componentAnatomy[id].parts].sort();
    const expectedParts = [...expected].sort();
    if (JSON.stringify(actualParts) !== JSON.stringify(expectedParts)) {
      mismatches.push(`${id}: ${JSON.stringify(actualParts)} != ${JSON.stringify(expectedParts)}`);
    }
  }
  assert.deepEqual(mismatches, [], 'Parts must match the public Vue entry points');
});

function publicValues(source) {
  const values = [...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gmu)]
    .map((match) => match[1]);
  for (const match of source.matchAll(/^export\s+\{([\s\S]*?)\}(?:\s+from\s+[^;]+)?;/gmu)) {
    for (const raw of match[1].split(',').map((value) => value.trim()).filter(Boolean)) {
      if (raw.startsWith('type ')) continue;
      values.push(raw.split(/\s+as\s+/u).at(-1));
    }
  }
  return [...new Set(values)];
}

function publicPart(component, value) {
  if (value.startsWith('create')) return null;
  if (nativeFields.has(component)) return 'input';
  if (component === 'toggle-button' && value === 'ToggleButton') return 'root';
  if (value.endsWith('Portal')) return null;
  if (value.endsWith('Provider')) return 'provider';
  if (providerRoots.has(component) && value.endsWith('Root')) return 'provider';

  if (component === 'menu-button') {
    return new Map([
      ['MenuButtonRoot', 'provider'], ['MenuButtonTrigger', 'trigger'],
      ['MenuButtonContent', 'content'], ['MenuItem', 'item'],
      ['MenuSubContent', 'sub-content'], ['MenuSeparator', 'separator'],
    ]).get(value) ?? null;
  }
  if (component === 'menu') {
    return new Map([
      ['MenuRoot', 'root'], ['MenuItem', 'item'], ['MenuSubContent', 'sub-content'],
      ['MenuSeparator', 'separator'],
    ]).get(value) ?? null;
  }
  if (component === 'navigation-menu') {
    return new Map([
      ['NavigationMenuRoot', 'root'], ['NavigationMenuList', 'list'],
      ['NavigationMenuItem', 'item-container'], ['NavigationMenuTrigger', 'item'],
      ['NavigationMenuLink', 'item'], ['NavigationMenuContent', 'sub-content'],
      ['NavigationMenuViewport', 'viewport'], ['NavigationMenuIndicator', 'indicator'],
    ]).get(value) ?? null;
  }
  if (component === 'menubar' && value === 'MenubarContent') return 'sub-content';

  const prefix = component.split('-').map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join('');
  assert.ok(value.startsWith(prefix), `${component}: cannot map public component ${value}`);
  const suffix = value.slice(prefix.length);
  assert.notEqual(suffix, '', `${component}: cannot derive a DOM part from ${value}`);
  return suffix.replace(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase();
}
