/**
 * tuzzle — a 1:1 TypeScript port of Guzzle, the PHP HTTP client.
 *
 * Re-exports the landed `@tuzzle/message` surface; the client, handlers, and
 * the remaining slices port in on top of it. `@tuzzle/promises` is still a
 * stub, kept wired via the placeholder below until its slice lands.
 */
import { PROMISES_PLACEHOLDER } from '@tuzzle/promises';

export { Uri, Query, MalformedUriError } from '@tuzzle/message';
export type {
  UriInterface,
  UriParts,
  QueryEncoding,
  QueryDecoding,
  QueryParams,
  QueryParamValue,
  ParsedQuery,
} from '@tuzzle/message';

export const TUZZLE_PLACEHOLDER = {
  promises: PROMISES_PLACEHOLDER,
} as const;
