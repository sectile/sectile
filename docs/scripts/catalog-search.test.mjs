import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogMatchRank } from '../.vitepress/theme/catalog-search.ts';

const select = {
  id: 'select',
  family: 'linear-choice',
  capabilities: ['single-selection', 'typeahead'],
};
const numberField = {
  id: 'number-field',
  family: 'editing',
  capabilities: ['selection-and-caret', 'exact-decimal-value'],
};

test('component catalog ranks names ahead of family and capability matches', () => {
  assert.equal(catalogMatchRank(select, 'select', {
    title: 'Select',
    family: '목록 선택',
  }), 0);
  assert.ok(
    catalogMatchRank(select, 'select', { title: 'Select', family: '목록 선택' })
      < catalogMatchRank(numberField, 'select', { title: 'Number Field', family: '입력과 편집' }),
  );
});

test('component catalog keeps prefix matches ahead of partial capability matches', () => {
  assert.ok(
    catalogMatchRank(select, 'sel', { title: 'Select', family: '목록 선택' })
      < catalogMatchRank(numberField, 'sel', { title: 'Number Field', family: '입력과 편집' }),
  );
});
