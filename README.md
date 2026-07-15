# tuzzle

`tuzzle` is a from-scratch TypeScript port of [Guzzle](https://docs.guzzlephp.org/), the PHP HTTP
client, aimed at 1:1 functional parity — same architecture, same class/method names where TS
conventions allow, same `RequestOptions` surface, same middleware/handler model.

[docs.guzzlephp.org](https://docs.guzzlephp.org/) is the fidelity reference for every slice of this
port: when in doubt about a name, option, or behavior, that's the source of truth. The port targets
the latest Guzzle release line (**7.14.x**) as its comparison baseline.

Implemented in **TypeScript 6.0.x** and published as **ESM-only**. TypeScript 6 is the newest release
the full toolchain (notably `typescript-eslint`) supports today; migrating to the 7.x native compiler
is a deliberate future step, taken once `typescript-eslint` ships TypeScript 7 support.

## Package layout

A pnpm workspace monorepo mirroring Guzzle's own package split:

| Package             | npm name           | Guzzle equivalent     |
| ------------------- | ------------------ | --------------------- |
| `packages/tuzzle`   | `tuzzle`           | `guzzlehttp/guzzle`   |
| `packages/message`  | `@tuzzle/message`  | `guzzlehttp/psr7`     |
| `packages/promises` | `@tuzzle/promises` | `guzzlehttp/promises` |

`@tuzzle/message` is renamed off "psr7" since PSR-7 is a PHP-FIG spec identifier with no TypeScript
equivalent.

## Development

Requires Node.js >= 20 to consume the packages; the dev toolchain (pnpm 11) needs Node >= 22.13.

```sh
pnpm install
pnpm build         # tsc: ESM build (index.js + index.d.ts) per package
pnpm typecheck     # tsc --build across the TS project references graph
pnpm lint          # ESLint (strict, type-checked)
pnpm format:check  # Prettier
pnpm test          # node:test, run via tsx, per package
```

The build is **tsc-only** — no bundler, and nothing that reaches into the TypeScript compiler API to
generate output, so the build itself never lags behind a TypeScript upgrade. TypeScript is pinned to
the 6.0.x line (`~6.0.3`) so it stays within `typescript-eslint`'s supported range; that keeps the
type-checked lint rules (e.g. `no-floating-promises`) working, which matters for this async-heavy
port. Bumping past it is what unlocks the eventual move to the TypeScript 7 native compiler.

Each package builds independently versioned releases via [Changesets](https://github.com/changesets/changesets):
run `pnpm changeset` to record a change.

## Status

This is an early-stage port. No HTTP/message/promise logic has landed yet — the packages currently
export placeholder values only, wired end-to-end so later slices can port real behavior into a
working, publishable structure.
