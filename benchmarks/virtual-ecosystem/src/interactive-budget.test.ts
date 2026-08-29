import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMBEDDED_LONG_TASK_BUDGET_MS,
  exceedsEmbeddedLongTaskBudget,
} from './interactive-budget.ts';

test('stops repeated embedded work at the long-task budget', () => {
  assert.equal(exceedsEmbeddedLongTaskBudget(true, EMBEDDED_LONG_TASK_BUDGET_MS), true);
});

test('keeps responsive embedded samples running', () => {
  assert.equal(exceedsEmbeddedLongTaskBudget(true, EMBEDDED_LONG_TASK_BUDGET_MS - 1), false);
});

test('does not cap standalone benchmark runs', () => {
  assert.equal(exceedsEmbeddedLongTaskBudget(false, EMBEDDED_LONG_TASK_BUDGET_MS * 4), false);
  assert.equal(exceedsEmbeddedLongTaskBudget(true, null), false);
});
