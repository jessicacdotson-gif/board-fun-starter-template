// Board apps are served from a device folder, not a web root — every
// asset src/href must be relative (see docs/wiki/raw/
// board-deploy-findings.md).
export default {
  base: './',
  server: {
    // Honor whatever port the dev environment assigns via PORT.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
};
