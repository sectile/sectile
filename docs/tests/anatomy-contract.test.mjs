import assert from 'node:assert/strict';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import {
  anatomyPartContract,
  componentAnatomy,
} from '../.vitepress/theme/component-anatomy.ts';

test('every catalog component has one complete public parts contract', () => {
  const catalogIds = catalog.components.map(({ id }) => id).sort();
  assert.deepEqual(Object.keys(componentAnatomy).sort(), catalogIds);

  for (const [component, definition] of Object.entries(componentAnatomy)) {
    assert.ok(definition.parts.length > 0, component);
    assert.equal(new Set(definition.parts).size, definition.parts.length, component);

    for (const part of definition.parts) {
      const contract = anatomyPartContract(definition, part);
      assert.deepEqual(contract.attributes.slice(0, 2), [
        ['data-scope', definition.partDetails[part]?.scope ?? definition.scope],
        ['data-part', part],
      ], `${component}:${part}`);
      assert.ok(contract.purpose.en.length > 0, `${component}:${part}:en purpose`);
      assert.ok(contract.purpose.ko.length > 0, `${component}:${part}:ko purpose`);
    }
  }
});

test('menu hierarchy attributes remain explicit in the static contract', () => {
  for (const component of ['menu', 'menu-button', 'menubar', 'navigation-menu']) {
    const item = anatomyPartContract(componentAnatomy[component], 'item');
    assert.deepEqual(item.attributes.at(-1), ['data-level', '<depth>'], component);
  }
  assert.deepEqual(
    anatomyPartContract(componentAnatomy.menubar, 'sub-content').attributes,
    [['data-scope', 'menu'], ['data-part', 'sub-content'], ['data-level', '<depth>']],
  );
});

test('unknown parts fail instead of silently producing incomplete anatomy', () => {
  assert.throws(
    () => anatomyPartContract(componentAnatomy.checkbox, 'missing'),
    /Unknown anatomy part for checkbox: missing/u,
  );
});
