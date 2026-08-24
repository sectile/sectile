import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { CheckboxGroupIndicator, CheckboxGroupItem, CheckboxGroupRoot } from '../dist/checkbox-group.js';
import { MultiThumbSliderRoot, MultiThumbSliderThumb, MultiThumbSliderTrack } from '../dist/multi-thumb-slider.js';
import { PaginationItem, PaginationRoot } from '../dist/pagination.js';
import { PinInputInput, PinInputRoot } from '../dist/pin-input.js';
import { TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText, TagsInputRoot } from '../dist/tags-input.js';
import { WindowSplitterHandle, WindowSplitterPane, WindowSplitterRoot } from '../dist/window-splitter.js';

async function render(component) { return renderToString(createSSRApp({ render: component })); }

test('Vue checkbox group keeps native checkbox form controls', async () => {
  const html = await render(() => h(CheckboxGroupRoot, { defaultValue: ['alpha'], name: 'channels' }, {
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
    default: ({ items, pageCount }) => [String(pageCount), ...items.map((item) => h(PaginationItem, { item }, { default: () => item.type }))],
  }));
  assert.match(html, /role="navigation"/);
  assert.match(html, />12</);
  assert.match(html, /data-part="page"/);
});

test('Vue PIN and tags inputs render persistent native inputs', async () => {
  const pin = await render(() => h(PinInputRoot, { length: 4, defaultValue: '12' }, {
    default: () => [0, 1, 2, 3].map((index) => h(PinInputInput, { index })),
  }));
  const tags = await render(() => h(TagsInputRoot, { defaultValue: ['Vue'] }, {
    default: ({ value }) => [
      ...value.map((_tag, index) => h(TagsInputItem, { index }, { default: () => [h(TagsInputItemText), h(TagsInputItemDelete)] })),
      h(TagsInputInput),
    ],
  }));
  assert.equal((pin.match(/data-part="input"/g) ?? []).length, 4);
  assert.match(tags, /data-part="item-text"/);
  assert.match(tags, /data-part="item-delete"/);
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
  assert.match(splitter, /data-side="after"/);
  assert.equal((splitter.match(/data-scope="window-splitter"/g) ?? []).length, 4);
  assert.match(splitter, /data-part="handle"/);
  assert.doesNotMatch(splitter, /data-scope="slider"|data-part="thumb"/);
});
