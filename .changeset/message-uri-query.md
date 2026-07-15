---
'@tuzzle/message': minor
'tuzzle': minor
---

Add the `Uri` value object (a 1:1 port of Guzzle's PSR-7 `Uri`, exposed via a
new `UriInterface`) and the `Query` parse/build helpers, replacing the package's
placeholder export. Includes `MalformedUriError` for URI parse/validation
failures. `tuzzle` now re-exports this surface from `@tuzzle/message`.
