// Separate build for the glyph logger (debug/) so it can be packaged
// and deployed as its own temporary app, independent of the main game
// (see docs/spec/glyph-discovery.md).
export default {
  root: 'debug',
  base: './',
  publicDir: '../public',
  build: {
    outDir: '../dist-debug',
    emptyOutDir: true,
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5174,
    strictPort: false,
  },
};
