import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../.vitepress/theme/components/CalendarAnatomy.vue', import.meta.url),
  'utf8',
);

test('calendar anatomy exposes real paging, view, and selection controls', () => {
  assert.match(source, /<CalendarRoot/);
  assert.match(source, /<CalendarCell/);
  assert.match(source, /@page="move\(\$event\.direction\)"/);
  assert.match(source, /@click="move\(-1\)"/);
  assert.match(source, /@click="move\(1\)"/);
  assert.match(source, /@click="setView\('week'\)"/);
  assert.match(source, /@click="setView\('month'\)"/);
  assert.match(source, /calendarSelectionLabel\(selectedDate\.value/);
  assert.doesNotMatch(source, /default-value="2026-08-22"/);
});
