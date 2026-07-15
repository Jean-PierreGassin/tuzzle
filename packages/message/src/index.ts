/**
 * HTTP message value objects for tuzzle — the TypeScript equivalent of
 * `guzzlehttp/psr7`.
 */
export { Uri } from './uri.js';
export type { UriInterface, UriParts } from './uri.js';

export { Query } from './query.js';
export type {
  QueryDecoding,
  QueryEncoding,
  QueryParamValue,
  QueryParams,
  ParsedQuery,
} from './query.js';

export { MalformedUriError } from './exception/malformed-uri-error.js';
