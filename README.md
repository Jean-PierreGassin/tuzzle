# tuzzle

`tuzzle` is a from-scratch TypeScript port of [Guzzle](https://docs.guzzlephp.org/), the PHP HTTP
client, aimed at 1:1 functional parity — same architecture, same class/method names where TS
conventions allow, same `RequestOptions` surface, same middleware/handler model.

[docs.guzzlephp.org](https://docs.guzzlephp.org/) is the fidelity reference for every slice of this
port: when in doubt about a name, option, or behavior, that's the source of truth.

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

Requires Node.js >= 20 and [pnpm](https://pnpm.io/).

```sh
pnpm install
pnpm build      # tsup: dual ESM+CJS build with .d.ts for every package
pnpm typecheck  # tsc --build across the TS project references graph
pnpm lint       # ESLint (strict, type-checked)
pnpm test       # node:test, run via tsx, per package
```

Each package builds independently versioned releases via [Changesets](https://github.com/changesets/changesets):
run `pnpm changeset` to record a change.

## Status

This is an early-stage port. No HTTP/message/promise logic has landed yet — the packages currently
export placeholder values only, wired end-to-end so later slices can port real behavior into a
working, publishable structure.
