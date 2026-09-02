import assert from 'node:assert/strict';
import test from 'node:test';
import {
  stableIDElementToken,
  stableIDToken,
} from '../.verification-dist/identity.js';

test('DOM stable identity tokens preserve exact primitive identity injectively', () => {
  const distinctPairs = [
    ['%', '-25'],
    ['/', '-2F'],
    [1, '1'],
    ['a%b', 'a-25b'],
    ['é', 'e\u0301'],
  ];

  for (const [left, right] of distinctPairs) {
    assert.notEqual(stableIDElementToken(left), stableIDElementToken(right));
  }

  for (const id of ['%', '-25', '/', '-2F', 1, '1', 'a%b', 'a-25b', 'é', 'e\u0301', '💡']) {
    assert.equal(decodeURIComponent(stableIDElementToken(id)), stableIDToken(id));
  }
});
