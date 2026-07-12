// Level-builder dev tool. Dev-server only — there is deliberately no
// build/pack path for this config; the builder never ships to the
// device.
//
// The save middleware is what closes the authoring loop: the builder
// POSTs the edited level definition and it lands directly in
// src/levels/, where the game (and its own dev server, if running)
// picks it up. Writes are restricted to that one directory, filenames
// to a strict whitelist pattern, and the content must pass the same
// validateLevel() the game enforces — an invalid level can be edited
// in the builder but never saved into the game.
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLevel } from './src/demo/level-loader.js';

const FILE_PATTERN = /^[a-z0-9][a-z0-9-]*\.json$/;

function saveLevelPlugin() {
  return {
    name: 'starter-save-level',
    configureServer(server) {
      // Level list + content, straight from disk (an import glob would
      // miss files created at runtime, and fetching means saving never
      // forces a full page reload of the builder itself).
      server.middlewares.use('/api/levels', (req, res) => {
        res.setHeader('content-type', 'application/json');
        try {
          const dir = fileURLToPath(new URL('./src/levels/', import.meta.url));
          if (req.method !== 'GET') {
            res.statusCode = 405;
            return res.end(JSON.stringify({ ok: false, error: 'GET only' }));
          }
          if (req.url === '/' || req.url === '') {
            const files = readdirSync(dir).filter((f) => FILE_PATTERN.test(f)).sort();
            return res.end(JSON.stringify({ ok: true, files }));
          }
          const match = req.url.match(/^\/([a-z0-9][a-z0-9-]*\.json)$/);
          if (match) return res.end(readFileSync(join(dir, match[1]), 'utf8'));
          res.statusCode = 404;
          res.end(JSON.stringify({ ok: false, error: `no such level: ${req.url}` }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
      server.middlewares.use('/api/save-level', (req, res) => {
        res.setHeader('content-type', 'application/json');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end(JSON.stringify({ ok: false, error: 'POST only' }));
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { file, def } = JSON.parse(body);
            if (!FILE_PATTERN.test(file ?? '')) {
              throw new Error(`bad filename: ${file}`);
            }
            const errors = validateLevel(def);
            if (errors.length > 0) {
              throw new Error(`level failed validation: ${errors.join('; ')}`);
            }
            const target = fileURLToPath(new URL(`./src/levels/${file}`, import.meta.url));
            writeFileSync(target, JSON.stringify(def, null, 2) + '\n');
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: error.message }));
          }
        });
      });
    },
  };
}

export default {
  root: 'builder',
  base: './',
  plugins: [saveLevelPlugin()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5175,
    strictPort: false,
  },
};
