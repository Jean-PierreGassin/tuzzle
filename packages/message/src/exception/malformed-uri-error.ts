/**
 * Thrown when a URI cannot be parsed or would form an invalid URI. The
 * TypeScript equivalent of `GuzzleHttp\Psr7\Exception\MalformedUriException`.
 *
 * Guzzle's exception extends `InvalidArgumentException`; the full tuzzle
 * exception hierarchy lands in a later slice, so for now this extends the
 * built-in `Error` directly.
 */
export class MalformedUriError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedUriError';
  }
}
