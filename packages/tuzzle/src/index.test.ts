import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TUZZLE_PLACEHOLDER, Uri } from './index.js';

void test('re-exports the real @tuzzle/message surface', () => {
  const uri = new Uri('https://example.com/path?q=1');

  assert.equal(uri.toString(), 'https://example.com/path?q=1');
});

void test('keeps @tuzzle/promises wired via its placeholder', () => {
  assert.equal(TUZZLE_PLACEHOLDER.promises, '@tuzzle/promises');
});
