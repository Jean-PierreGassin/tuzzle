import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TUZZLE_PLACEHOLDER } from './index.js';

void test('wires placeholder exports from @tuzzle/message and @tuzzle/promises', () => {
  assert.equal(TUZZLE_PLACEHOLDER.message, '@tuzzle/message');
  assert.equal(TUZZLE_PLACEHOLDER.promises, '@tuzzle/promises');
});
