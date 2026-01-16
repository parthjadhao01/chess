import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  bundle: true,
  // Externalize Prisma and its dependencies - they need to be available at runtime
  external: [
    /^@prisma\/.*/,
    /^\.prisma\/.*/,
    '@prisma/adapter-pg',
    'pg',
    'express',
      '@repo/db'
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
