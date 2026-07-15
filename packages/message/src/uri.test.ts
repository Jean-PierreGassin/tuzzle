import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MalformedUriError, Uri } from './index.js';

void test('parses and round-trips a full URI', () => {
  const uri = new Uri('https://user:pass@example.com:8080/path?q=1#frag');

  assert.equal(uri.getScheme(), 'https');
  assert.equal(uri.getUserInfo(), 'user:pass');
  assert.equal(uri.getHost(), 'example.com');
  assert.equal(uri.getPort(), 8080);
  assert.equal(uri.getPath(), '/path');
  assert.equal(uri.getQuery(), 'q=1');
  assert.equal(uri.getFragment(), 'frag');
  assert.equal(uri.getAuthority(), 'user:pass@example.com:8080');
  assert.equal(uri.toString(), 'https://user:pass@example.com:8080/path?q=1#frag');
});

void test('lower-cases scheme and host but preserves path case', () => {
  const uri = new Uri('HTTP://EXAMPLE.COM/PATH');

  assert.equal(uri.getScheme(), 'http');
  assert.equal(uri.getHost(), 'example.com');
  assert.equal(uri.getPath(), '/PATH');
  assert.equal(uri.toString(), 'http://example.com/PATH');
});

void test('drops the default port for the scheme', () => {
  assert.equal(new Uri('https://example.com:443/').getPort(), null);
  assert.equal(new Uri('http://example.com:80').toString(), 'http://example.com');
  assert.equal(new Uri('http://example.com:8080').getPort(), 8080);
});

void test('parses a relative-path reference as a path, not a host', () => {
  const uri = new Uri('example.com/foo');

  assert.equal(uri.getHost(), '');
  assert.equal(uri.getPath(), 'example.com/foo');
  assert.equal(Uri.isRelativePathReference(uri), true);
});

void test('parses reference forms', () => {
  assert.equal(Uri.isAbsolute(new Uri('http://x/y')), true);
  assert.equal(Uri.isAbsolute(new Uri('/path')), false);
  assert.equal(Uri.isNetworkPathReference(new Uri('//example.com/p')), true);
  assert.equal(Uri.isAbsolutePathReference(new Uri('/path')), true);
  assert.equal(Uri.isRelativePathReference(new Uri('a/b')), true);
  assert.equal(Uri.isSameDocumentReference(new Uri('#frag')), true);
  assert.equal(Uri.isSameDocumentReference(new Uri('/p#frag')), false);
});

void test('reports the default port', () => {
  assert.equal(Uri.isDefaultPort(new Uri('http://example.com')), true);
  assert.equal(Uri.isDefaultPort(new Uri('http://example.com:8080')), false);
});

void test('parses a bracketed IPv6 host with a port', () => {
  const uri = new Uri('http://[::1]:8080/p');

  assert.equal(uri.getHost(), '[::1]');
  assert.equal(uri.getPort(), 8080);
  assert.equal(uri.toString(), 'http://[::1]:8080/p');
});

void test('withScheme is immutable and skips a no-op change', () => {
  const uri = new Uri('http://example.com/p');
  const updated = uri.withScheme('https');

  assert.equal(uri.getScheme(), 'http');
  assert.equal(updated.getScheme(), 'https');
  assert.equal(updated.toString(), 'https://example.com/p');
  assert.equal(uri.withScheme('http'), uri);
});

void test('withPort(null) removes the port and withUserInfo updates authority', () => {
  const uri = new Uri('http://example.com:8080/p');

  assert.equal(uri.withPort(null).getAuthority(), 'example.com');
  assert.equal(uri.withUserInfo('bob', 'secret').getAuthority(), 'bob:secret@example.com:8080');
  assert.equal(uri.withUserInfo('bob').getUserInfo(), 'bob');
});

void test('percent-encodes path components while preserving valid triplets', () => {
  const base = new Uri();

  assert.equal(base.withPath('/a b').getPath(), '/a%20b');
  assert.equal(base.withPath('/a%20b').getPath(), '/a%20b');
  assert.equal(base.withPath('/100%').getPath(), '/100%25');
});

void test('percent-encodes query and fragment but keeps sub-delimiters', () => {
  const base = new Uri('http://example.com');

  assert.equal(base.withQuery('a=b c&d=e').getQuery(), 'a=b%20c&d=e');
  assert.equal(base.withFragment('a b').getFragment(), 'a%20b');
});

void test('withQueryValue replaces and withoutQueryValue removes matching keys', () => {
  const uri = new Uri('http://example.com?a=1&b=2');

  assert.equal(Uri.withQueryValue(uri, 'a', '5').getQuery(), 'b=2&a=5');
  assert.equal(Uri.withoutQueryValue(uri, 'a').getQuery(), 'b=2');
  assert.equal(Uri.withQueryValue(uri, 'c', null).getQuery(), 'a=1&b=2&c');
  assert.equal(Uri.withQueryValues(uri, { a: '9', c: '3' }).getQuery(), 'b=2&a=9&c=3');
});

void test('fromParts builds and validates a URI', () => {
  const uri = Uri.fromParts({ scheme: 'https', host: 'Example.com', path: '/p' });

  assert.equal(uri.getHost(), 'example.com');
  assert.equal(uri.toString(), 'https://example.com/p');
});

void test('composeComponents keeps the file-scheme authority separator', () => {
  assert.equal(Uri.composeComponents('file', '', '/etc/hosts', '', ''), 'file:///etc/hosts');
  assert.equal(new Uri('file:///etc/hosts').toString(), 'file:///etc/hosts');
});

void test('serializes to its string form via toJSON', () => {
  const uri = new Uri('http://example.com/p');

  assert.equal(uri.toJSON(), 'http://example.com/p');
  assert.equal(JSON.stringify(uri), '"http://example.com/p"');
});

void test('rejects invalid URIs with MalformedUriError', () => {
  assert.throws(() => new Uri('http://exa mple.com'), MalformedUriError);
  assert.throws(() => new Uri('http://example.com:99999'), MalformedUriError);
  assert.throws(() => new Uri().withPath('//evil'), MalformedUriError);
  assert.throws(() => new Uri().withPath('foo:bar'), MalformedUriError);
});
