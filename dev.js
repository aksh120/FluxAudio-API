/**
 * FluxAudio API - Standalone Local Dev Server
 * 
 * Serves API endpoints and static files using only Node built-ins.
 * No Vercel CLI or login required.
 * 
 * Usage: node dev.js
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 3000;

// ── Dynamic API route loader (hot-reloaded for development) ─────────
async function loadRoute(name) {
  const mod = await import(`./api/${name}.js?update=${Date.now()}`);
  return mod.default;
}

// ── MIME types for static files ─────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// ── Parse query string into req.query ───────────────────────────────
function parseQuery(url) {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  const params = new URLSearchParams(url.slice(idx));
  const query = {};
  for (const [k, v] of params) query[k] = v;
  return query;
}

// ── Server ──────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = req.url || "/";
  const pathname = url.split("?")[0];

  // ── API routes: /api/{name} ──
  const apiMatch = pathname.match(/^\/api\/(\w+)\/?$/);
  if (apiMatch) {
    const routeName = apiMatch[1];
    try {
      const handler = await loadRoute(routeName);
      req.query = parseQuery(url);
      await handler(req, res);
    } catch (err) {
      if (err.code === "ERR_MODULE_NOT_FOUND" || err.code === "MODULE_NOT_FOUND") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Unknown endpoint: /api/${routeName}` }));
      } else {
        console.error(`[/api/${routeName}]`, err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error", detail: err.message }));
      }
    }
    return;
  }

  // ── Static files from /public ──
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = join(__dirname, "public", filePath);

  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log("\nFluxAudio Development Server");
  console.log(`- Local:   http://localhost:${PORT}`);
  console.log(`- API:     http://localhost:${PORT}/api/search?q=test`);
  console.log(`- Embed:   http://localhost:${PORT}/api/embed?q=test\n`);
  console.log("Ready for connections. Press Ctrl+C to stop.\n");
});
