import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGeneratedPageText } from './generated-page-text.mjs';

test('generated page comparison is stable across LF and CRLF hosts', () => {
  const lf = 'Generated\npage\n';
  const crlf = 'Generated\r\npage\r\n';

  assert.equal(normalizeGeneratedPageText(lf), lf);
  assert.equal(normalizeGeneratedPageText(crlf), lf);
  assert.equal(normalizeGeneratedPageText(lf), normalizeGeneratedPageText(crlf));
});

test('generated page comparison still detects content changes', () => {
  assert.notEqual(
    normalizeGeneratedPageText('Generated\npage\n'),
    normalizeGeneratedPageText('Changed\r\npage\r\n'),
  );
});
