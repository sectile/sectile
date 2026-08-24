import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarRows,
  calendarSelectionLabel,
  calendarTitle,
  isCalendarWeekend,
  isSameCalendarMonth,
  shiftCalendarAnchor,
} from '../.vitepress/theme/calendar-demo-state.ts';

test('month and week views expose complete deterministic date rows', () => {
  const month = calendarRows('2026-08-24', 'month');
  assert.equal(month.length, 6);
  assert.ok(month.every((row) => row.length === 7));
  assert.equal(month[0][0], '2026-07-27');
  assert.equal(month[5][6], '2026-09-06');

  const week = calendarRows('2026-08-24', 'week');
  assert.deepEqual(week, [[
    '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
    '2026-08-28', '2026-08-29', '2026-08-30',
  ]]);
});

test('calendar paging follows the active view unit', () => {
  assert.equal(shiftCalendarAnchor('2026-08-24', 'month', 1), '2026-09-24');
  assert.equal(shiftCalendarAnchor('2026-08-24', 'month', -1), '2026-07-24');
  assert.equal(shiftCalendarAnchor('2026-08-24', 'week', 1), '2026-08-31');
  assert.equal(shiftCalendarAnchor('2026-08-24', 'week', -1), '2026-08-17');
});

test('calendar labels and eligibility are derived from live state', () => {
  assert.equal(calendarSelectionLabel(null, 'en-US'), 'No date selected');
  assert.equal(calendarSelectionLabel('2026-08-05', 'en-US'), 'Aug 5, 2026');
  assert.equal(calendarTitle('2026-08-24', 'month', 'en-US'), 'August 2026');
  assert.equal(isCalendarWeekend('2026-08-22'), true);
  assert.equal(isCalendarWeekend('2026-08-24'), false);
  assert.equal(isSameCalendarMonth('2026-08-31', '2026-08-24'), true);
  assert.equal(isSameCalendarMonth('2026-09-01', '2026-08-24'), false);
});
