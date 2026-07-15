import type { Options } from 'tsup';

export function baseTsupConfig(entry: string[] = ['src/index.ts']): Options {
  return {
    entry,
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    // With package.json "type": "module", plain .js/.d.ts are already the
    // native ESM extensions; only the CJS output needs the distinct .cjs/.d.cts.
    outExtension: ({ format }) => ({
      js: format === 'esm' ? '.mjs' : '.cjs',
    }),
  };
}
