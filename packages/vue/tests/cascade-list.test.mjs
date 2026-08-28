import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import {
  CascadeListColumn,
  CascadeListItem,
  CascadeListItemChevron,
  CascadeListItemIndicator,
  CascadeListRoot,
  CascadeListValue,
} from '../.verification-dist/cascade-list.js';

const nodes = [
  { id: 'asia', parentID: null },
  { id: 'europe', parentID: null },
  { id: 'korea', parentID: 'asia' },
  { id: 'japan', parentID: 'asia' },
  { id: 'seoul', parentID: 'korea' },
  { id: 'tokyo', parentID: 'japan' },
];

const labels = {
  asia: 'Asia',
  europe: 'Europe',
  korea: 'Korea',
  japan: 'Japan',
  seoul: 'Seoul',
  tokyo: 'Tokyo',
};

test('Vue cascade list renders visible named columns without popup semantics during SSR', async () => {
  const app = createSSRApp({
    render: () => h(CascadeListRoot, {
      nodes,
      defaultValue: 'seoul',
      label: 'Location',
      textValue: (id) => labels[id],
      name: 'location',
    }, {
      default: (state) => [
        h(CascadeListValue),
        ...state.columns.map((_, depth) => h(CascadeListColumn, {
          depth,
          label: `Location level ${depth + 1}`,
        }, {
          default: ({ items }) => items.map((item) => h(CascadeListItem, { value: item }, {
            default: ({ branch }) => [
              labels[item],
              h(CascadeListItemIndicator, null, { default: () => 'Selected' }),
              branch ? h(CascadeListItemChevron, null, { default: () => 'Next' }) : null,
            ],
          })),
        })),
      ],
    }),
  });

  const html = await renderToString(app);
  assert.match(html, /data-scope="cascade-list"/);
  assert.match(html, /role="group"/);
  assert.equal((html.match(/role="listbox"/g) ?? []).length, 3);
  assert.match(html, /aria-label="Location level 1"/);
  assert.match(html, /aria-label="Location level 2"/);
  assert.match(html, /aria-label="Location level 3"/);
  assert.match(html, /role="option"/);
  assert.match(html, /Asia \/ Korea \/ Seoul/);
  assert.match(html, /name="location"/);
  assert.match(html, /value="seoul" selected/);
  assert.doesNotMatch(html, /data-part="trigger"/);
  assert.doesNotMatch(html, /data-part="content"/);
  assert.doesNotMatch(html, /aria-expanded="true"[^>]*data-part="root"/);
});
