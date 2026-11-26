#!/usr/bin/env node
/**
 * Build smoke test for a SvelteKit static build.
 *
 * Usage:
 *   node scripts/smoke.mjs [buildDir] [port]
 *   node scripts/smoke.mjs            # buildDir=build, port=4173
 *
 * Builds (if buildDir absent) via `npm run build`, serves the static output
 * over a throwaway HTTP server, and asserts key routes answer the200 (or a
 * server-side redirect where applicable). Client-side auth/goto are not
 * exercised — DB-backed flows are covered by supabase/tests/e2e.mjs.
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { existsSync } from "node:fs";
import assert from "node:assert/strict";

function build() {
	const r = spawnSync("npm", ["run", "build"], { stdio: "inherit" });
	assert.strictEqual(r.status, 0, "npm run build failed");
}

const port = Number(process.argv[3] ?? 4173);
const buildDir = process.argv[2] ?? "build";

if (!existsSync(buildDir)) build();

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".ico": "image/x-icon",
	".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
	try {
		let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
		if (path === "/") path = "/index.html";
		let file = join(buildDir, normalize(path));
		if (!file.startsWith(normalize(buildDir))) throw new Error("path traversal");
		const body = await readFile(file);
		res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
		res.end(body);
	} catch {
		res.writeHead(404);
		res.end("not found");
	}
});

await new Promise((res) => server.listen(port, res));

const routes = ["/login", "/signup", "/create-tenant", "/dashboard", "/members", "/rooms", "/renters", "/contracts", "/bills", "/payments"];

for (const route of routes) {
	const res = await fetch(`http://127.0.0.1:${port}${route}`);
	try {
		assert.strictEqual(res.status, 200, `route ${route} → ${res.status}`);
		console.log(`ok  ${route} → ${res.status}`);
	} catch (e) {
		console.error(`FAIL ${route} → ${res.status}`);
		server.close();
		throw e;
	}
}

server.close();
console.log(`Smoke passed: ${routes.length} routes 200 · port ${port}`);
