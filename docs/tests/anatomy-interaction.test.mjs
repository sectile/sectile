import assert from 'node:assert/strict';
import test from 'node:test';
import { anatomyPartContract, componentAnatomy } from '../.vitepress/theme/component-anatomy.ts';
import {
  activateAnatomyInteraction,
  adjustTemporalAnatomyValue,
  anatomyDisplayIcon,
  initializeAnatomyInteraction,
  isAnatomyNodeActive,
  isAnatomyNodeHidden,
  isAnatomyNodeKeyboardInteractive,
} from '../.vitepress/theme/anatomy-interaction.ts';

test('temporal anatomy inputs apply ArrowUp and ArrowDown to the caret segment', () => {
  assert.deepEqual(
    adjustTemporalAnatomyValue('date-field', '2026 / 08 / 23', 8, 1),
    { value: '2026 / 09 / 23', selectionStart: 7, selectionEnd: 9 },
  );
  assert.deepEqual(
    adjustTemporalAnatomyValue('time-field', '09 : 30', 6, -1),
    { value: '09 : 29', selectionStart: 5, selectionEnd: 7 },
  );
  assert.deepEqual(
    adjustTemporalAnatomyValue('date-time-field', '2026 / 08 / 23   23 : 59', 25, 1),
    { value: '2026 / 08 / 24   00 : 00', selectionStart: 22, selectionEnd: 24 },
  );
});

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function find(component, part, predicate = () => true) {
  let match;
  walk(componentAnatomy[component].preview, (node) => {
    if (match === undefined && node.part === part && predicate(node)) match = node;
  });
  assert.ok(match, `${component} must render ${part}`);
  return match;
}

function activate(component, part, predicate) {
  const values = {};
  const state = {};
  initializeAnatomyInteraction(component, values, state);
  const node = find(component, part, predicate);
  activateAnatomyInteraction(component, node, values, state);
  return { node, state, values };
}

test('every public visual anatomy part has a real preview region', () => {
  for (const [component, definition] of Object.entries(componentAnatomy)) {
    const rendered = new Set();
    walk(definition.preview, (node) => {
      if (node.part !== undefined) rendered.add(node.part);
    });
    const missing = definition.parts.filter((part) => !rendered.has(part));
    assert.deepEqual(missing, [], component);
  }
});

test('menu family contracts expose hierarchy depth and their real nested scopes', () => {
  for (const component of ['menu', 'menu-button', 'menubar', 'navigation-menu']) {
    const item = anatomyPartContract(componentAnatomy[component], 'item');
    assert.deepEqual(item.attributes.at(-1), ['data-level', '<depth>'], component);
  }
  assert.deepEqual(
    anatomyPartContract(componentAnatomy.menubar, 'sub-content').attributes,
    [['data-scope', 'menu'], ['data-part', 'sub-content'], ['data-level', '<depth>']],
  );
  assert.deepEqual(
    anatomyPartContract(componentAnatomy.menubar, 'separator').attributes,
    [['data-scope', 'menu'], ['data-part', 'separator']],
  );
  assert.equal(Object.values(componentAnatomy).some((definition) => definition.parts.includes('provider')), false);
  assert.equal(componentAnatomy['menu-button'].parts.includes('root'), false);
});

test('anatomy uses the shared icon set instead of text carets and symbols', () => {
  const legacyGlyph = /[⌄⌃›‹«»←→×✓Ⅱ↻⋮▣−≡]/u;
  for (const [component, definition] of Object.entries(componentAnatomy)) {
    walk(definition.preview, (node) => {
      assert.equal(legacyGlyph.test(node.icon ?? ''), false, `${component}:${node.part ?? node.kind}`);
    });
  }

  const values = {};
  const state = {};
  initializeAnatomyInteraction('tree-grid', values, state);
  const disclosure = find('tree-grid', 'disclosure');
  assert.equal(anatomyDisplayIcon('tree-grid', disclosure, state), 'chevron-down');
  activateAnatomyInteraction('tree-grid', disclosure, values, state);
  assert.equal(anatomyDisplayIcon('tree-grid', disclosure, state), 'chevron-right');
});

test('repeated regions remain individually selectable instead of leaving inert placeholders', () => {
  const expectations = [
    ['calendar', 'cell', 35],
    ['date-picker', 'cell', 35],
    ['date-picker', 'month-cell', 3],
    ['date-range-picker', 'cell', 35],
    ['date-time-picker', 'cell', 35],
    ['date-time-range-picker', 'cell', 35],
    ['cascade-select', 'column', 2],
  ];

  for (const [component, part, minimum] of expectations) {
    const matches = [];
    walk(componentAnatomy[component].preview, (node) => {
      if (node.part === part) matches.push(node);
    });
    assert.ok(matches.length >= minimum, `${component} must expose every ${part} occurrence`);
  }
});

test('generic anatomy interactions change the represented component state', () => {
  {
    const { node, state } = activate('checkbox', 'root');
    assert.equal(state.checked, 'true');
    assert.equal(isAnatomyNodeActive('checkbox', node, state), true);
  }
  {
    const { node, state } = activate('listbox', 'item', ({ value }) => value === 'beta');
    assert.equal(state.selected, 'beta');
    assert.equal(isAnatomyNodeActive('listbox', node, state), true);
  }
  {
    const { node, state } = activate('calendar', 'cell', ({ text }) => text === '13');
    assert.equal(state.selected, '13');
    assert.equal(isAnatomyNodeActive('calendar', node, state), true);
  }
  {
    const { state, values } = activate('spin-button', 'increment');
    assert.equal(values.input, '4');
    assert.equal(state.open, 'true');
  }
  {
    const values = { input: 'invalid' };
    const state = { spinAccepted: '3' };
    const node = find('spin-button', 'increment');
    activateAnatomyInteraction('spin-button', node, values, state);
    assert.equal(values.input, '4');
    assert.equal(state.spinAccepted, '4');
    assert.notEqual(values.input, 'NaN');
  }
  {
    const { state } = activate('pagination', 'next');
    assert.equal(state.page, '3');
  }
  {
    const { state } = activate('carousel', 'next');
    assert.equal(state.slide, '1');
  }
  {
    const values = {};
    const state = {};
    initializeAnatomyInteraction('dialog', values, state);
    const trigger = find('dialog', 'trigger');
    const content = find('dialog', 'content');
    activateAnatomyInteraction('dialog', trigger, values, state);
    assert.equal(state.open, 'false');
    assert.equal(isAnatomyNodeHidden('dialog', content, state), true);
    activateAnatomyInteraction('dialog', trigger, values, state);
    assert.equal(isAnatomyNodeHidden('dialog', content, state), false);
  }
});

test('tree view anatomy expands each parent independently and hides its own descendants', () => {
  const values = {};
  const state = {};
  initializeAnatomyInteraction('tree-view', values, state);
  const atlasDisclosure = find('tree-view', 'disclosure', ({ value }) => value === 'atlas');
  const appsDisclosure = find('tree-view', 'disclosure', ({ value }) => value === 'apps');
  const atlasChildren = find('tree-view', 'group', ({ className }) => className?.includes('children-of-atlas'));
  const appsChildren = find('tree-view', 'group', ({ className }) => className?.includes('children-of-apps'));

  activateAnatomyInteraction('tree-view', appsDisclosure, values, state);
  assert.equal(state['expanded:apps'], 'false');
  assert.equal(state['expanded:atlas'], 'true');
  assert.equal(isAnatomyNodeHidden('tree-view', appsChildren, state), true);
  assert.equal(isAnatomyNodeHidden('tree-view', atlasChildren, state), false);
  assert.equal(anatomyDisplayIcon('tree-view', appsDisclosure, state), 'chevron-right');

  activateAnatomyInteraction('tree-view', atlasDisclosure, values, state);
  assert.equal(isAnatomyNodeHidden('tree-view', atlasChildren, state), true);
});

test('every generic interaction family has a working representative control', () => {
  const cases = [
    ['checkbox-group', 'indicator', ({ value }) => value === 'stable'],
    ['checkbox', 'root'],
    ['switch', 'root'],
    ['toggle-button', 'root'],
    ['dialog', 'trigger'],
    ['alert-dialog', 'trigger'],
    ['popover', 'trigger'],
    ['tooltip', 'trigger'],
    ['menu-button', 'trigger'],
    ['navigation-menu', 'item', ({ value }) => value === 'products'],
    ['select', 'trigger'],
    ['cascade-select', 'trigger'],
    ['menu', 'item', ({ value }) => value === 'new'],
    ['menubar', 'item', ({ value }) => value === 'file'],
    ['accordion', 'trigger', ({ value }) => value === 'general'],
    ['disclosure', 'trigger'],
    ['listbox', 'item', ({ value }) => value === 'beta'],
    ['combobox', 'item', ({ value }) => value === 'alpha'],
    ['radio-group', 'item', ({ value }) => value === 'push'],
    ['toggle-group', 'item', ({ value }) => value === 'I'],
    ['rating', 'item', ({ value }) => value === '5'],
    ['tabs', 'trigger', ({ value }) => value === 'activity'],
    ['stepper', 'step', ({ value }) => value === 'workspace'],
    ['toolbar', 'item', ({ value }) => value === 'Italic'],
    ['calendar', 'cell', ({ text }) => text === '13'],
    ['grid', 'cell', ({ text }) => text === 'Beta'],
    ['tree-grid', 'cell', ({ text }) => text === 'Alex Chen'],
    ['tree-view', 'disclosure'],
    ['feed', 'load-newer'],
    ['tags-input', 'item-delete', ({ value }) => value === 'Vue'],
    ['spin-button', 'increment'],
    ['pagination', 'next'],
    ['carousel', 'next'],
    ['timer', 'action-trigger', ({ value }) => value === 'pause'],
    ['toast', 'close'],
    ['editable', 'edit-trigger'],
  ];

  for (const [component, part, predicate] of cases) {
    const values = {};
    const state = {};
    initializeAnatomyInteraction(component, values, state);
    const node = find(component, part, predicate);
    const before = JSON.stringify({ values, state });
    assert.equal(isAnatomyNodeKeyboardInteractive(component, node), true, `${component}:${part} must accept keyboard input`);
    activateAnatomyInteraction(component, node, values, state);
    assert.notEqual(JSON.stringify({ values, state }), before, `${component}:${part} must change its preview`);
  }
});

test('controls that look interactive never advertise a dead keyboard target', () => {
  const dedicatedComponents = new Set([
    'calendar',
    'date-picker', 'date-range-picker', 'date-time-picker', 'date-time-range-picker',
    'menubar',
    'slider', 'multi-thumb-slider',
  ]);
  const exceptions = new Set([
    // Native inputs/selects and dedicated picker/slider previews own their events directly.
    'color-picker:format-trigger',
    'quantity-field:unit-select',
  ]);

  for (const [component, definition] of Object.entries(componentAnatomy)) {
    if (dedicatedComponents.has(component)) continue;
    walk(definition.preview, (node) => {
      if (node.part === undefined) return;
      if (exceptions.has(`${component}:${node.part}`)) return;
      if (['button', 'icon-button'].includes(node.kind)) {
        assert.equal(
          isAnatomyNodeKeyboardInteractive(component, node),
          true,
          `${component}:${node.part} is rendered as a control but has no keyboard contract`,
        );
      }
    });
  }
});
