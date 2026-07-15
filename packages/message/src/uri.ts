import { MalformedUriError } from './exception/malformed-uri-error.js';
import { CHAR_SUB_DELIMS, CHAR_UNRESERVED, rawurldecode, rawurlencode } from './rfc3986.js';

/**
 * The components produced by parsing a URI reference, matching the shape of
 * PHP's `parse_url` output that Guzzle's `Uri::applyParts`/`Uri::fromParts`
 * consume.
 */
export interface UriParts {
  scheme?: string;
  user?: string;
  pass?: string;
  host?: string;
  port?: number;
  path?: string;
  query?: string;
  fragment?: string;
}

/**
 * Value-object contract for a URI, mirroring PSR-7's `UriInterface`. Consumers
 * (Request, the handlers) depend on this rather than the concrete {@link Uri}
 * so alternate implementations remain possible.
 *
 * Every `withX` method returns a new instance and leaves the receiver
 * unchanged.
 */
export interface UriInterface {
  getScheme(): string;
  getAuthority(): string;
  getUserInfo(): string;
  getHost(): string;
  getPort(): number | null;
  getPath(): string;
  getQuery(): string;
  getFragment(): string;

  withScheme(scheme: string): UriInterface;
  withUserInfo(user: string, password?: string | null): UriInterface;
  withHost(host: string): UriInterface;
  withPort(port: number | null): UriInterface;
  withPath(path: string): UriInterface;
  withQuery(query: string): UriInterface;
  withFragment(fragment: string): UriInterface;

  toString(): string;
}

/**
 * Absolute http(s) URIs require a host per RFC 7230 §2.7; this default is
 * applied to an otherwise-hostless http(s) URI to keep it valid.
 */
const HTTP_DEFAULT_HOST = 'localhost';

const DEFAULT_PORTS: Record<string, number> = {
  http: 80,
  https: 443,
  ftp: 21,
  gopher: 70,
  nntp: 119,
  news: 119,
  telnet: 23,
  tn3270: 23,
  imap: 143,
  pop: 110,
  ldap: 389,
};

const MIN_PORT = 0;
const MAX_PORT = 0xffff;

/**
 * Query-string separators and literal plus signs are percent-encoded in a
 * query key/value before it is spliced into a raw query string, so they cannot
 * be mistaken for structure.
 */
const QUERY_SEPARATORS_REPLACEMENT: Record<string, string> = {
  '=': '%3D',
  '&': '%26',
  '+': '%2B',
};

/**
 * RFC 3986 Appendix B reference parser: scheme, authority, path, query,
 * fragment. Authority and the query/fragment introducers are optional, so this
 * matches any string.
 */
const URI_REFERENCE_PATTERN =
  /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/;

const USER_INFO_PATTERN = new RegExp(
  `(?:[^%${CHAR_UNRESERVED}${CHAR_SUB_DELIMS}]+|%(?![A-Fa-f0-9]{2}))`,
  'g',
);
const PATH_PATTERN = new RegExp(
  `(?:[^${CHAR_UNRESERVED}${CHAR_SUB_DELIMS}%:@/]+|%(?![A-Fa-f0-9]{2}))`,
  'g',
);
const QUERY_FRAGMENT_PATTERN = new RegExp(
  `(?:[^${CHAR_UNRESERVED}${CHAR_SUB_DELIMS}%:@/?]+|%(?![A-Fa-f0-9]{2}))`,
  'g',
);

/**
 * PSR-7 URI implementation — a 1:1 port of `GuzzleHttp\Psr7\Uri`.
 */
export class Uri implements UriInterface {
  private scheme = '';
  private userInfo = '';
  private host = '';
  private port: number | null = null;
  private path = '';
  private query = '';
  private fragment = '';

  /**
   * @throws MalformedUriError If the URI string cannot be parsed or is invalid.
   */
  constructor(uri = '') {
    if (uri !== '') {
      this.applyParts(parseUri(uri));
    }
  }

  getScheme(): string {
    return this.scheme;
  }

  getAuthority(): string {
    let authority = this.host;
    if (this.userInfo !== '') {
      authority = `${this.userInfo}@${authority}`;
    }
    if (this.port !== null) {
      authority += `:${this.port.toString()}`;
    }

    return authority;
  }

  getUserInfo(): string {
    return this.userInfo;
  }

  getHost(): string {
    return this.host;
  }

  getPort(): number | null {
    return this.port;
  }

  getPath(): string {
    return this.path;
  }

  getQuery(): string {
    return this.query;
  }

  getFragment(): string {
    return this.fragment;
  }

  withScheme(scheme: string): UriInterface {
    const filteredScheme = filterScheme(scheme);
    if (this.scheme === filteredScheme) {
      return this;
    }

    const updated = this.cloneUri();
    updated.scheme = filteredScheme;
    updated.removeDefaultPort();
    updated.validateState();

    return updated;
  }

  withUserInfo(user: string, password: string | null = null): UriInterface {
    let info = filterUserInfoComponent(user);
    if (password !== null) {
      info += `:${filterUserInfoComponent(password)}`;
    }
    if (this.userInfo === info) {
      return this;
    }

    const updated = this.cloneUri();
    updated.userInfo = info;
    updated.validateState();

    return updated;
  }

  withHost(host: string): UriInterface {
    const filteredHost = filterHost(host);
    if (this.host === filteredHost) {
      return this;
    }

    const updated = this.cloneUri();
    updated.host = filteredHost;
    updated.validateState();

    return updated;
  }

  withPort(port: number | null): UriInterface {
    const filteredPort = filterPort(port);
    if (this.port === filteredPort) {
      return this;
    }

    const updated = this.cloneUri();
    updated.port = filteredPort;
    updated.removeDefaultPort();
    updated.validateState();

    return updated;
  }

  withPath(path: string): UriInterface {
    const filteredPath = filterPath(path);
    if (this.path === filteredPath) {
      return this;
    }

    const updated = this.cloneUri();
    updated.path = filteredPath;
    updated.validateState();

    return updated;
  }

  withQuery(query: string): UriInterface {
    const filteredQuery = filterQueryAndFragment(query);
    if (this.query === filteredQuery) {
      return this;
    }

    const updated = this.cloneUri();
    updated.query = filteredQuery;

    return updated;
  }

  withFragment(fragment: string): UriInterface {
    const filteredFragment = filterQueryAndFragment(fragment);
    if (this.fragment === filteredFragment) {
      return this;
    }

    const updated = this.cloneUri();
    updated.fragment = filteredFragment;

    return updated;
  }

  toString(): string {
    return Uri.composeComponents(
      this.scheme,
      this.getAuthority(),
      this.path,
      this.query,
      this.fragment,
    );
  }

  toJSON(): string {
    return this.toString();
  }

  /**
   * Compose a URI reference string from its components.
   *
   * PSR-7 treats an empty component the same as a missing one, which explains
   * the slight divergence from RFC 3986 §5.3. The `file` scheme always keeps
   * its authority separator (`file:///path`) since PHP stream functions require
   * it.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.3
   */
  static composeComponents(
    scheme: string,
    authority: string,
    path: string,
    query: string,
    fragment: string,
  ): string {
    let uri = '';
    if (scheme !== '') {
      uri += `${scheme}:`;
    }
    if (authority !== '' || scheme === 'file') {
      uri += `//${authority}`;
    }

    let composedPath = path;
    if (authority !== '' && composedPath !== '' && !composedPath.startsWith('/')) {
      composedPath = `/${composedPath}`;
    }
    uri += composedPath;

    if (query !== '') {
      uri += `?${query}`;
    }
    if (fragment !== '') {
      uri += `#${fragment}`;
    }

    return uri;
  }

  /**
   * Whether the URI carries the default port for its scheme (or no port).
   */
  static isDefaultPort(uri: UriInterface): boolean {
    const port = uri.getPort();

    return port === null || port === DEFAULT_PORTS[uri.getScheme()];
  }

  /**
   * Whether the URI is absolute, i.e. it has a scheme.
   */
  static isAbsolute(uri: UriInterface): boolean {
    return uri.getScheme() !== '';
  }

  /**
   * Whether the URI is a network-path reference (begins with `//`).
   */
  static isNetworkPathReference(uri: UriInterface): boolean {
    return uri.getScheme() === '' && uri.getAuthority() !== '';
  }

  /**
   * Whether the URI is an absolute-path reference (begins with a single `/`).
   */
  static isAbsolutePathReference(uri: UriInterface): boolean {
    return uri.getScheme() === '' && uri.getAuthority() === '' && uri.getPath().startsWith('/');
  }

  /**
   * Whether the URI is a relative-path reference (does not begin with `/`).
   */
  static isRelativePathReference(uri: UriInterface): boolean {
    return uri.getScheme() === '' && uri.getAuthority() === '' && !uri.getPath().startsWith('/');
  }

  /**
   * Whether the URI is a same-document reference — empty apart from its
   * fragment.
   *
   * The base-relative overload (`isSameDocumentReference(uri, base)`) depends on
   * reference resolution and lands with the `UriResolver` slice.
   */
  static isSameDocumentReference(uri: UriInterface): boolean {
    return (
      uri.getScheme() === '' &&
      uri.getAuthority() === '' &&
      uri.getPath() === '' &&
      uri.getQuery() === ''
    );
  }

  /**
   * Return a new URI with every query pair whose key matches `key` removed.
   */
  static withoutQueryValue(uri: UriInterface, key: string): UriInterface {
    const remainingPairs = filterQueryPairs(uri, [key]);

    return uri.withQuery(remainingPairs.join('&'));
  }

  /**
   * Return a new URI with pairs matching `key` replaced by a single `key=value`
   * pair. A `null` value sets the key with no value (`key` instead of
   * `key=value`).
   */
  static withQueryValue(uri: UriInterface, key: string, value: string | null): UriInterface {
    const pairs = filterQueryPairs(uri, [key]);
    pairs.push(generateQueryPair(key, value));

    return uri.withQuery(pairs.join('&'));
  }

  /**
   * Like {@link withQueryValue} but for a record of key/value pairs.
   */
  static withQueryValues(
    uri: UriInterface,
    keyValues: Record<string, string | null>,
  ): UriInterface {
    const pairs = filterQueryPairs(uri, Object.keys(keyValues));
    for (const [key, value] of Object.entries(keyValues)) {
      pairs.push(generateQueryPair(key, value));
    }

    return uri.withQuery(pairs.join('&'));
  }

  /**
   * Build a URI from a hash of parsed components.
   *
   * @throws MalformedUriError If the components do not form a valid URI.
   */
  static fromParts(parts: UriParts): UriInterface {
    const uri = new Uri();
    uri.applyParts(parts);
    uri.validateState();

    return uri;
  }

  /**
   * @throws MalformedUriError If the host contains control characters, URI
   *   authority delimiters, or unbalanced brackets.
   */
  static assertValidHost(host: string): void {
    if (host === '') {
      return;
    }

    // eslint-disable-next-line no-control-regex -- control chars are rejected by design
    if (/[\x00-\x20\x7f/?#@\\]/.test(host)) {
      throw new MalformedUriError(`Invalid host: "${host}"`);
    }

    if (host.includes('[') || host.includes(']')) {
      if (!host.startsWith('[') || !host.endsWith(']')) {
        throw new MalformedUriError(`Invalid host: "${host}"`);
      }

      return;
    }

    if (host.includes(':')) {
      throw new MalformedUriError(`Invalid host: "${host}"`);
    }
  }

  private cloneUri(): Uri {
    const copy = new Uri();
    copy.scheme = this.scheme;
    copy.userInfo = this.userInfo;
    copy.host = this.host;
    copy.port = this.port;
    copy.path = this.path;
    copy.query = this.query;
    copy.fragment = this.fragment;

    return copy;
  }

  /**
   * @throws MalformedUriError If a component is invalid.
   */
  private applyParts(parts: UriParts): void {
    this.scheme = parts.scheme !== undefined ? filterScheme(parts.scheme) : '';
    this.userInfo = parts.user !== undefined ? filterUserInfoComponent(parts.user) : '';
    this.host = parts.host !== undefined ? filterHost(parts.host) : '';
    this.port = parts.port !== undefined ? filterPort(parts.port) : null;
    this.path = parts.path !== undefined ? filterPath(parts.path) : '';
    this.query = parts.query !== undefined ? filterQueryAndFragment(parts.query) : '';
    this.fragment = parts.fragment !== undefined ? filterQueryAndFragment(parts.fragment) : '';
    if (parts.pass !== undefined) {
      this.userInfo += `:${filterUserInfoComponent(parts.pass)}`;
    }

    this.removeDefaultPort();
  }

  private removeDefaultPort(): void {
    if (this.port !== null && Uri.isDefaultPort(this)) {
      this.port = null;
    }
  }

  /**
   * @throws MalformedUriError If the resulting URI would be invalid.
   */
  private validateState(): void {
    if (this.host === '' && (this.scheme === 'http' || this.scheme === 'https')) {
      this.host = HTTP_DEFAULT_HOST;
    }

    if (this.getAuthority() !== '') {
      return;
    }

    if (this.path.startsWith('//')) {
      throw new MalformedUriError(
        'The path of a URI without an authority must not start with two slashes "//"',
      );
    }
    if (this.scheme === '' && (this.path.split('/', 1)[0] ?? '').includes(':')) {
      throw new MalformedUriError(
        'A relative URI must not have a path beginning with a segment containing a colon',
      );
    }
  }
}

/**
 * Parse a URI reference into its components.
 *
 * @throws MalformedUriError If the reference cannot be parsed.
 */
function parseUri(uri: string): UriParts {
  if (isPathNoSchemeReference(uri)) {
    return parsePathNoSchemeReference(uri);
  }

  const match = URI_REFERENCE_PATTERN.exec(uri);
  if (match === null) {
    throw new MalformedUriError(`Unable to parse URI: ${uri}`);
  }

  const [, scheme, authority, path, query, fragment] = match;
  const parts: UriParts = { path: path ?? '' };
  if (scheme !== undefined) {
    parts.scheme = scheme;
  }
  if (authority !== undefined) {
    assignAuthorityParts(authority, parts);
  }
  if (query !== undefined) {
    parts.query = query;
  }
  if (fragment !== undefined) {
    parts.fragment = fragment;
  }

  return parts;
}

/**
 * A relative reference whose first path segment carries no colon cannot be
 * mistaken for a scheme, so it is parsed as path/query/fragment directly. This
 * keeps hosts like `example.com` in `example.com/path` from being read as an
 * authority.
 */
function isPathNoSchemeReference(uri: string): boolean {
  const firstChar = uri[0];
  if (uri === '' || firstChar === '/' || firstChar === '?' || firstChar === '#') {
    return false;
  }

  const firstSegment = uri.split(/[/?#]/, 1)[0] ?? '';

  return !firstSegment.includes(':');
}

function parsePathNoSchemeReference(uri: string): UriParts {
  const parts: UriParts = { path: '' };

  let remainder = uri;
  const fragmentIndex = remainder.indexOf('#');
  if (fragmentIndex !== -1) {
    parts.fragment = remainder.slice(fragmentIndex + 1);
    remainder = remainder.slice(0, fragmentIndex);
  }

  const queryIndex = remainder.indexOf('?');
  if (queryIndex !== -1) {
    parts.query = remainder.slice(queryIndex + 1);
    remainder = remainder.slice(0, queryIndex);
  }

  parts.path = remainder;

  return parts;
}

function assignAuthorityParts(authority: string, parts: UriParts): void {
  let hostAndPort = authority;

  const userInfoIndex = authority.lastIndexOf('@');
  if (userInfoIndex !== -1) {
    const userInfo = authority.slice(0, userInfoIndex);
    hostAndPort = authority.slice(userInfoIndex + 1);

    const passwordIndex = userInfo.indexOf(':');
    if (passwordIndex === -1) {
      parts.user = userInfo;
    } else {
      parts.user = userInfo.slice(0, passwordIndex);
      parts.pass = userInfo.slice(passwordIndex + 1);
    }
  }

  assignHostAndPort(hostAndPort, parts);
}

/**
 * @throws MalformedUriError If a bracketed IPv6 host is malformed or the port
 *   is not numeric.
 */
function assignHostAndPort(hostAndPort: string, parts: UriParts): void {
  if (hostAndPort.startsWith('[')) {
    const closingBracketIndex = hostAndPort.indexOf(']');
    if (closingBracketIndex === -1) {
      throw new MalformedUriError(`Unable to parse URI; unterminated IPv6 host: ${hostAndPort}`);
    }

    parts.host = hostAndPort.slice(0, closingBracketIndex + 1);

    const afterHost = hostAndPort.slice(closingBracketIndex + 1);
    if (afterHost !== '') {
      if (!afterHost.startsWith(':')) {
        throw new MalformedUriError(`Unable to parse URI; invalid IPv6 host: ${hostAndPort}`);
      }
      assignPort(afterHost.slice(1), parts);
    }

    return;
  }

  const portIndex = hostAndPort.lastIndexOf(':');
  if (portIndex === -1) {
    parts.host = hostAndPort;

    return;
  }

  parts.host = hostAndPort.slice(0, portIndex);
  assignPort(hostAndPort.slice(portIndex + 1), parts);
}

/**
 * @throws MalformedUriError If the port is present but not a run of digits.
 */
function assignPort(port: string, parts: UriParts): void {
  if (port === '') {
    return;
  }
  if (!/^[0-9]+$/.test(port)) {
    throw new MalformedUriError(`Unable to parse URI; invalid port: ${port}`);
  }

  parts.port = Number(port);
}

function filterScheme(scheme: string): string {
  return scheme.toLowerCase();
}

/**
 * @throws MalformedUriError If the user info cannot be filtered.
 */
function filterUserInfoComponent(component: string): string {
  return filterComponent(USER_INFO_PATTERN, component);
}

/**
 * @throws MalformedUriError If the host is invalid.
 */
function filterHost(host: string): string {
  const loweredHost = host.toLowerCase();
  Uri.assertValidHost(loweredHost);

  return loweredHost;
}

/**
 * @throws MalformedUriError If the port is outside 0–65535.
 */
function filterPort(port: number | null): number | null {
  if (port === null) {
    return null;
  }

  const truncatedPort = Math.trunc(port);
  if (truncatedPort < MIN_PORT || truncatedPort > MAX_PORT) {
    throw new MalformedUriError(
      `Invalid port: ${truncatedPort.toString()}. Must be between 0 and 65535`,
    );
  }

  return truncatedPort;
}

/**
 * @throws MalformedUriError If the path cannot be filtered.
 */
function filterPath(path: string): string {
  return filterComponent(PATH_PATTERN, path);
}

/**
 * @throws MalformedUriError If the query or fragment cannot be filtered.
 */
function filterQueryAndFragment(component: string): string {
  return filterComponent(QUERY_FRAGMENT_PATTERN, component);
}

function filterComponent(pattern: RegExp, component: string): string {
  return component.replace(pattern, (match) => rawurlencode(match));
}

function filterQueryPairs(uri: UriInterface, keys: string[]): string[] {
  const currentQuery = uri.getQuery();
  if (currentQuery === '') {
    return [];
  }

  const decodedKeys = keys.map((key) => rawurldecode(key));

  return currentQuery.split('&').filter((pair) => {
    const pairKey = rawurldecode(pair.split('=', 1)[0] ?? '');

    return !decodedKeys.includes(pairKey);
  });
}

function generateQueryPair(key: string, value: string | null): string {
  let pair = replaceQuerySeparators(key);
  if (value !== null) {
    pair += `=${replaceQuerySeparators(value)}`;
  }

  return pair;
}

function replaceQuerySeparators(value: string): string {
  return value.replace(
    /[=&+]/g,
    (character) => QUERY_SEPARATORS_REPLACEMENT[character] ?? character,
  );
}
