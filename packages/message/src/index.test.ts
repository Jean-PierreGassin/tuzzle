import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MESSAGE_PLACEHOLDER } from './index.js';

void test('exports a placeholder value', () => {
  assert.equal(MESSAGE_PLACEHOLDER, '@tuzzle/message');
});
