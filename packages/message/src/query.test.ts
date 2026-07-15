import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Query } from './index.js';

void test('parses simple pairs', () => {
  assert.deepEqual({ ...Query.parse('a=1&b=2') }, { a: '1', b: '2' });
});

void test('parses an empty string to an empty record', () => {
  assert.deepEqual({ ...Query.parse('') }, {});
});

void test('promotes repeated keys to arrays', () => {
  assert.deepEqual({ ...Query.parse('a=1&a=2&a=3') }, { a: ['1', '2', '3'] });
});

void test('distinguishes a missing value from an empty value', () => {
  assert.deepEqual({ ...Query.parse('a') }, { a: null });
  assert.deepEqual({ ...Query.parse('a=') }, { a: '' });
});

void test('decodes per the urlEncoding argument', () => {
  assert.deepEqual({ ...Query.parse('a=b%20c') }, { a: 'b c' });
  assert.deepEqual({ ...Query.parse('a=b+c') }, { a: 'b c' });
  assert.deepEqual({ ...Query.parse('a=b+c', 'RFC3986') }, { a: 'b+c' });
  assert.deepEqual({ ...Query.parse('a=b+c', false) }, { a: 'b+c' });
});

void test('keeps only the first "=" as the separator', () => {
  assert.deepEqual({ ...Query.parse('a=b=c') }, { a: 'b=c' });
});

void test('does not inherit from Object.prototype', () => {
  const parsed = Query.parse('__proto__=1');

  assert.equal(Object.getPrototypeOf(parsed), null);
  assert.deepEqual(Object.values(Query.parse('__proto__=1&__proto__=2')), [['1', '2']]);
});

void test('builds simple pairs', () => {
  assert.equal(Query.build({ a: '1', b: '2' }), 'a=1&b=2');
});

void test('builds an empty record to an empty string', () => {
  assert.equal(Query.build({}), '');
});

void test('repeats the key for array values', () => {
  assert.equal(Query.build({ a: ['1', '2'] }), 'a=1&a=2');
});

void test('renders null as a bare key and empty string as key=', () => {
  assert.equal(Query.build({ a: null }), 'a');
  assert.equal(Query.build({ a: '' }), 'a=');
});

void test('encodes keys and values per the encoding argument', () => {
  assert.equal(Query.build({ 'a b': 'c&d' }), 'a%20b=c%26d');
  assert.equal(Query.build({ a: 'b c' }, 'RFC1738'), 'a=b+c');
  assert.equal(Query.build({ a: 'b c' }, false), 'a=b c');
});

void test('encodes booleans as ints by default and as words on request', () => {
  assert.equal(Query.build({ a: true, b: false }), 'a=1&b=0');
  assert.equal(Query.build({ a: true }, 'RFC3986', false), 'a=true');
  assert.equal(Query.build({ a: [true, false] }, 'RFC3986', false), 'a=true&a=false');
});

void test('normalizes non-finite floats the way PHP coerces them', () => {
  assert.equal(Query.build({ a: Infinity }), 'a=INF');
  assert.equal(Query.build({ a: -Infinity }), 'a=-INF');
  assert.equal(Query.build({ a: NaN }), 'a=NAN');
});

void test('round-trips build(parse(...))', () => {
  assert.equal(Query.build(Query.parse('a=1&a=2&b=3')), 'a=1&a=2&b=3');
});
