import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { CheckboxGroupIndicator, CheckboxGroupItem, CheckboxGroupRoot } from '../.verification-dist/checkbox-group.js';
import { MultiThumbSliderRoot, MultiThumbSliderThumb, MultiThumbSliderTrack, MultiThumbSliderRange } from '../.verification-dist/multi-thumb-slider.js';
import { PaginationItem, PaginationRoot } from '../.verification-dist/pagination.js';
import { PinInputInput, PinInputRoot } from '../.verification-dist/pin-input.js';
import { TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText, TagsInputRoot } from '../.verification-dist/tags-input.js';
import { WindowSplitterHandle, WindowSplitterPane, WindowSplitterRoot } from '../.verification-dist/window-splitter.js';
import { MenuRoot, MenuItem } from '../.verification-dist/menu.js';

test('Vue menu SSR projects branch metadata from its shared canonical model', async () => {
  let model;
  const html = await render(() => h(MenuRoot, { items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }] }, {
    default: state => { model = state.model; assert.equal(state.presentation, undefined); return h(MenuItem, { value: 'file' }, {
      default: item => { assert.equal(item.branch, true); return 'File'; },
    }); },
  }));
  assert.equal(model.tree.isLeaf('file'), false); assert.match(html, /aria-haspopup="menu"/); assert.match(html, /aria-expanded="false"/);
});

async function render(component) { return renderToString(createSSRApp({ render: component })); }
test('Vue MultiThumbSlider projects finite empty and crossed range extents', async () => {
  for (const [thumbs, values, start, end] of [[[], [], 0, 0], [['low', 'high'], [80, 20], 20, 80]]) {
    const html = await render(() => h(MultiThumbSliderRoot, { thumbs, defaultValue: values, policies: { allowCross: true } }, { default: () => h(MultiThumbSliderRange) }));
    assert.match(html, new RegExp(`--sectile-range-start:${start}%`)); assert.match(html, new RegExp(`--sectile-range-end:${end}%`));
  }
});

test('Vue MultiThumbSlider SSR exposes each exact constrained thumb value and caller name', async () => {
  const html = await render(() => h(MultiThumbSliderRoot, { thumbs: ['low', 'high'], min: '0', max: '10', step: '1', defaultValue: [2, 8],
    policies: { minGap: 2 }, readonly: true, getThumbLabel: id => 'Thumb ' + id, formatValue: value => value + ' units',
  }, { default: () => [h(MultiThumbSliderThumb, { value: 'low' }), h(MultiThumbSliderThumb, { value: 'high' })] }));
  const thumb = id => html.match(new RegExp(`<span\\b[^>]*data-sectile-multi-thumb="${id}"[^>]*>`))?.[0];
  assert.match(thumb('low'), /role="slider"/); assert.match(thumb('low'), /aria-valuenow="2"/); assert.match(thumb('low'), /aria-valuemax="6"/);
  assert.match(thumb('high'), /aria-valuenow="8"/); assert.match(thumb('high'), /aria-valuemin="4"/);
  assert.match(thumb('high'), /aria-label="Thumb high"/); assert.match(thumb('high'), /aria-valuetext="8 units"/); assert.match(thumb('high'), /aria-readonly="true"/);
});

test('Vue checkbox group keeps native checkbox form controls', async () => {
  const html = await render(() => h(CheckboxGroupRoot, { items: ['alpha'], defaultValue: ['alpha'], name: 'channels' }, {
    default: () => h(CheckboxGroupItem, { value: 'alpha' }, { default: ({ checked }) => [String(checked), h(CheckboxGroupIndicator)] }),
  }));
  assert.match(html, /role="group"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /name="channels"/);
  assert.equal((html.match(/data-scope="checkbox-group"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /data-scope="checkbox"/);
});

test('Vue pagination exposes the calculated item model through its default slot', async () => {
  const html = await render(() => h(PaginationRoot, { total: 120, defaultItemsPerPage: 10 }, {
    default: ({ items, pageCount }) => [String(pageCount), ...items.map((item) => h(PaginationItem, {
      item: item.type === 'page' ? { ...item, selected: false } : item,
    }, { default: () => item.type }))],
  }));
  assert.match(html, /role="navigation"/);
  assert.match(html, />12</);
  assert.match(html, /data-part="page"/);
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
});

test('Vue PIN and tags inputs render persistent native inputs', async () => {
  const pin = await render(() => h(PinInputRoot, { length: 4, defaultValue: '12' }, {
    default: () => [0, 1, 2, 3].map((index) => h(PinInputInput, { index })),
  }));
  const otp = await render(() => h(PinInputRoot, { length: 4, otp: true }, {
    default: () => [0, 1, 2, 3].map((index) => h(PinInputInput, { index })),
  }));
  const tags = await render(() => h(TagsInputRoot, { defaultValue: ['Vue'], removeLabel: (value, index) => `${index + 1}: ${value} 삭제` }, {
    default: ({ value }) => [
      ...value.map((_tag, index) => h(TagsInputItem, { index }, { default: () => [h(TagsInputItemText), h(TagsInputItemDelete)] })),
      h(TagsInputInput),
    ],
  }));
  assert.equal((pin.match(/data-part="input"/g) ?? []).length, 4);
  assert.doesNotMatch(pin, /autocomplete="one-time-code"/);
  assert.equal((otp.match(/autocomplete="one-time-code"/g) ?? []).length, 1);
  assert.match(tags, /data-part="item-text"/);
  assert.match(tags, /data-part="item-delete"/);
  assert.match(tags, /aria-label="1: Vue 삭제"/);
});

test('Vue multi-thumb slider and window splitter project structural sizing hooks', async () => {
  const slider = await render(() => h(MultiThumbSliderRoot, { thumbs: ['min', 'max'], defaultValue: [20, 80] }, {
    default: () => h(MultiThumbSliderTrack, null, { default: () => [
      h(MultiThumbSliderThumb, { value: 'min' }), h(MultiThumbSliderThumb, { value: 'max' }),
    ] }),
  }));
  const splitter = await render(() => h(WindowSplitterRoot, { defaultValue: 40 }, {
    default: () => [h(WindowSplitterPane, { side: 'before' }), h(WindowSplitterHandle), h(WindowSplitterPane, { side: 'after' })],
  }));
  assert.match(slider, /--sectile-thumb-0-percentage:20%/);
  assert.match(slider, /data-sectile-multi-thumb="max"/);
  assert.match(splitter, /--sectile-slider-percentage:40%/);
  assert.match(splitter, /--sectile-window-splitter-percentage:40%/);
  assert.match(splitter, /data-constraint-track(?:="")?/);
  assert.match(splitter, /data-side="after"/);
  assert.equal((splitter.match(/data-scope="window-splitter"/g) ?? []).length, 5);
  assert.match(splitter, /data-part="handle"/);
  assert.doesNotMatch(splitter, /data-scope="slider"|data-part="thumb"/);
});
