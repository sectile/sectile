import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDemoDate, formatDemoDateRange, formatDemoDateTime, formatDemoTime, formatDemoTimeRange,
} from '../.vitepress/theme/temporal-demo-format.ts';

const date = { year: 2026, month: 8, day: 22 };
const time = { hour: 9, minute: 30 };

test('temporal examples present product-readable values instead of object serialization', () => {
  assert.equal(formatDemoDate(date), 'Aug 22, 2026');
  assert.equal(formatDemoTime(time), '9:30 AM');
  assert.equal(formatDemoDateTime({ date, time }), 'Aug 22, 2026 · 9:30 AM');
  assert.equal(formatDemoDateRange({ start: date, end: { year: 2026, month: 8, day: 25 } }), 'Aug 22–25, 2026');
  assert.equal(formatDemoTimeRange({ start: time, end: { hour: 17, minute: 45 } }), '9:30 AM – 5:45 PM');
});
