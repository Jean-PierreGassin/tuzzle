/**
 * tuzzle — a 1:1 TypeScript port of Guzzle, the PHP HTTP client.
 * Placeholder export until the client slice lands; wires the workspace
 * dependency on `@tuzzle/message` and `@tuzzle/promises`.
 */
import { MESSAGE_PLACEHOLDER } from '@tuzzle/message';
import { PROMISES_PLACEHOLDER } from '@tuzzle/promises';

export const TUZZLE_PLACEHOLDER = {
  message: MESSAGE_PLACEHOLDER,
  promises: PROMISES_PLACEHOLDER,
} as const;
