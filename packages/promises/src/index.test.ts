import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PROMISES_PLACEHOLDER } from './index.js';

void test('exports a placeholder value', () => {
  assert.equal(PROMISES_PLACEHOLDER, '@tuzzle/promises');
});
