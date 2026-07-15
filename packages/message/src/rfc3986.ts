/**
 * RFC 3986 character classes and percent-encoding codec.
 *
 * The two character-class fragments are meant to be embedded inside a larger
 * regular expression's character set, mirroring `GuzzleHttp\Psr7\Rfc3986`. The
 * codec functions reproduce PHP's `rawurlencode`/`rawurldecode`/`urlencode`/
 * `urldecode` so that `Uri` and `Query` encode byte-for-byte like Guzzle does
 * — JavaScript's built-in `encodeURIComponent`/`decodeURIComponent` differ from
 * PHP on several characters and on their tolerance of malformed input.
 *
 * @internal
 */

/**
 * Unreserved characters for use inside a regex character class.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-2.3
 */
export const CHAR_UNRESERVED = 'a-zA-Z0-9_\\-.~';

/**
 * Sub-delimiters for use inside a regex character class.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-2.2
 */
export const CHAR_SUB_DELIMS = "!$&'()*+,;=";

/**
 * `encodeURIComponent` leaves these untouched, but PHP's `rawurlencode` (which
 * only ever leaves the unreserved set) percent-encodes them, so we finish the
 * job by hand.
 */
const RAWURLENCODE_EXTRA = /[!'()*]/g;

/**
 * Maximal runs of percent-triplets, decoded together so multi-byte UTF-8
 * sequences round-trip; a stray `%` that is not part of a triplet is left as-is.
 */
const PERCENT_TRIPLET_RUN = /(?:%[0-9A-Fa-f]{2})+/g;

/**
 * Percent-encode per RFC 3986, encoding everything except the unreserved set
 * and emitting uppercase hex — the equivalent of PHP's `rawurlencode`.
 */
export function rawurlencode(value: string): string {
  return encodeURIComponent(value).replace(
    RAWURLENCODE_EXTRA,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Decode percent-triplets leniently, leaving invalid `%` sequences untouched —
 * the equivalent of PHP's `rawurldecode`. `+` is preserved (not turned into a
 * space).
 */
export function rawurldecode(value: string): string {
  return value.replace(PERCENT_TRIPLET_RUN, (sequence) => {
    try {
      return decodeURIComponent(sequence);
    } catch {
      return sequence;
    }
  });
}

/**
 * Percent-encode per RFC 1738 — like {@link rawurlencode} but spaces become `+`
 * and `~` is encoded. The equivalent of PHP's `urlencode`.
 */
export function urlencode(value: string): string {
  return rawurlencode(value).replace(/%20/g, '+').replace(/~/g, '%7E');
}

/**
 * Decode per RFC 1738 — like {@link rawurldecode} but `+` becomes a space. The
 * equivalent of PHP's `urldecode`.
 */
export function urldecode(value: string): string {
  return rawurldecode(value.replace(/\+/g, ' '));
}
