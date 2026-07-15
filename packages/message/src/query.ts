import { rawurldecode, rawurlencode, urldecode, urlencode } from './rfc3986.js';

/**
 * How {@link Query.build} percent-encodes keys and values: RFC 3986
 * (`rawurlencode`), RFC 1738 (`urlencode`), or `false` for no encoding. Replaces
 * PHP's `PHP_QUERY_RFC3986`/`PHP_QUERY_RFC1738` integer constants.
 */
export type QueryEncoding = 'RFC3986' | 'RFC1738' | false;

/**
 * How {@link Query.parse} decodes keys and values. `true` decodes RFC 3986 and
 * also turns `+` into a space (Guzzle's default); `'RFC3986'`/`'RFC1738'` pick a
 * specific scheme; `false` disables decoding.
 */
export type QueryDecoding = boolean | 'RFC3986' | 'RFC1738';

/**
 * A scalar query value. `null` renders as a bare key with no `=`.
 */
export type QueryParamValue = string | number | boolean | null;

/**
 * Query parameters accepted by {@link Query.build}. A key mapping to an array
 * repeats that key once per element.
 */
export type QueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

/**
 * The result of {@link Query.parse}. A key seen more than once maps to an array
 * of its values in order; a key with no `=` maps to `null`.
 */
export type ParsedQuery = Record<string, string | null | (string | null)[]>;

/**
 * Parse and build query strings — a 1:1 port of `GuzzleHttp\Psr7\Query`.
 *
 * Nested PHP-style keys (`foo[a]=1`) are not expanded; the literal `foo[a]` is
 * kept as the key.
 */
export const Query = {
  /**
   * Parse a query string into a record. Repeated keys become arrays; a key with
   * no `=` yields a `null` value.
   */
  parse(query: string, urlEncoding: QueryDecoding = true): ParsedQuery {
    const parsed = Object.create(null) as ParsedQuery;
    if (query === '') {
      return parsed;
    }

    const decode = queryDecoder(urlEncoding);

    for (const pair of query.split('&')) {
      const separatorIndex = pair.indexOf('=');
      const key = decode(separatorIndex === -1 ? pair : pair.slice(0, separatorIndex));
      const value = separatorIndex === -1 ? null : decode(pair.slice(separatorIndex + 1));

      if (!Object.hasOwn(parsed, key)) {
        parsed[key] = value;
        continue;
      }

      const existing = parsed[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        parsed[key] = [existing ?? null, value];
      }
    }

    return parsed;
  },

  /**
   * Build a query string from a record. Array values repeat their key; `null`
   * values render as a bare key; booleans follow `treatBoolsAsInts`.
   */
  build(params: QueryParams, encoding: QueryEncoding = 'RFC3986', treatBoolsAsInts = true): string {
    const entries = Object.entries(params);
    if (entries.length === 0) {
      return '';
    }

    const encode = queryEncoder(encoding);

    const pairs: string[] = [];
    for (const [key, value] of entries) {
      const encodedKey = encode(key);
      const values = Array.isArray(value) ? value : [value];
      for (const singleValue of values) {
        const normalizedValue = normalizeQueryValue(singleValue, treatBoolsAsInts);
        pairs.push(
          normalizedValue === null ? encodedKey : `${encodedKey}=${encode(normalizedValue)}`,
        );
      }
    }

    return pairs.join('&');
  },
};

function queryDecoder(urlEncoding: QueryDecoding): (value: string) => string {
  if (urlEncoding === true) {
    return (value) => rawurldecode(value.replace(/\+/g, ' '));
  }
  if (urlEncoding === 'RFC3986') {
    return rawurldecode;
  }
  if (urlEncoding === 'RFC1738') {
    return urldecode;
  }

  return (value) => value;
}

function queryEncoder(encoding: QueryEncoding): (value: string) => string {
  if (encoding === false) {
    return (value) => value;
  }
  if (encoding === 'RFC1738') {
    return urlencode;
  }

  return rawurlencode;
}

function normalizeQueryValue(value: QueryParamValue, treatBoolsAsInts: boolean): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'boolean') {
    if (treatBoolsAsInts) {
      return value ? '1' : '0';
    }

    return value ? 'true' : 'false';
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    if (Number.isNaN(value)) {
      return 'NAN';
    }

    return value > 0 ? 'INF' : '-INF';
  }

  return String(value);
}
