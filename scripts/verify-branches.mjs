#!/usr/bin/env node
/**
 * Per-branch build + smoke verification.
 *
 * For each branch: adds a clean git worktree at /tmp/kos-verify/<branch> with a
 * symlinked node_modules (no reinstall), runs `npm run build`, serves the
 * static output, and asserts every generated page answers 200.
 *
 * Usage: node scripts/verify-branches.mjs [branch ...]
 *   default branches: the 11 feature PR branches.
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const VERIFY = "/tmp/kos-verify";
const port = 4180;

const currentBranch = spawnSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
const branches = (process.argv[2] ? process.argv.slice(2) : [
		"feat/auth-bootstrap",
		"feat/app-shell",
		"feat/members",
		"feat/rooms",
		"feat/contracts",
		"feat/bills",
		"feat/payments",
		"feat/dashboard",
		"feat/csv-receipt",
		"chore/hardening-e2e",
	]).filter((b) => b !== currentBranch);

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
};

async function walk(dir, out = []) {
	for (const e of await readdir(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) await walk(p, out);
		else if (e.name.endsWith(".html")) out.push(p);
	}
	return out;
}

function routeFrom(file, buildDir) {
	const rel = file.slice(buildDir.length + 1).replaceAll(sep, "/");
	if (rel === "index.html") return "/";
	return "/" + rel.replace(/\.html$/, "");
}

async function serveOnce(buildDir, files) {
	const server = createServer(async (req, res) => {
		let responded = false;
		const answer = (code, body, type = "text/html; charset=utf-8") => {
			if (responded) return;
			responded = true;
			res.writeHead(code, { "content-type": type });
			res.end(body);
		};
		try {
			let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
			if (path === "/") path = "/index.html";
			if (path.endsWith("/")) path += "index.html";
			let body;
			try {
				body = await readFile(join(buildDir, normalize(path)));
			} catch {
				body = await readFile(join(buildDir, normalize(path) + ".html"));
			}
			answer(200, body, MIME[extname(path)] ?? "text/html; charset=utf-8");
		} catch {
			answer(404, "not found");
		}
	});
	await new Promise((r) => server.listen(port, r));
	let ok = true;
	for (const f of files) {
		const r = routeFrom(f, buildDir);
		const res = await fetch(`http://127.0.0.1:${port}${r}`);
		if (res.status !== 200) {
			console.error(`  FAIL ${r} → ${res.status}`);
			ok = false;
		} else {
			console.log(`  ok  ${r}`);
		}
	}
	server.close();
	return ok;
}

mkdirSync(VERIFY, { recursive: true });

const failures = [];
for (const b of branches) {
	console.log(`\n=== ${b} ===`);
	const wt = join(VERIFY, b.replaceAll("/", "_"));
	if (existsSync(wt)) spawnSync("git", ["worktree", "remove", "--force", wt]);
	const add = spawnSync("git", ["worktree", "add", wt, b], { cwd: ROOT });
	assert.strictEqual(add.status, 0, `worktree add ${b}: ${add.stderr}`);
	if (existsSync(join(ROOT, ".env"))) spawnSync("cp", [join(ROOT, ".env"), join(wt, ".env")]);
	if (!existsSync(join(wt, "node_modules"))) symlinkSync(join(ROOT, "node_modules"), join(wt, "node_modules"));

	spawnSync("rm", ["-rf", join(wt, ".svelte-kit"), join(wt, "build")]);
	const build = spawnSync("npm", ["run", "build"], { cwd: wt, stdio: ["ignore", "pipe", "pipe"] });
	if (build.status !== 0) {
		console.error(`  BUILD FAILED\n${build.stdout}${build.stderr}`);
		failures.push(b);
		continue;
	}
	console.log("  build ok");
	const files = await walk(join(wt, "build"));
	const ok = await serveOnce(join(wt, "build"), files);
	if (!ok) failures.push(b);
}

console.log(`\n=== RESULT ===`);
if (failures.length) {
	console.log(`FAILED: ${failures.join(", ")}`);
	process.exit(1);
}
console.log(`All branches built and all pages served 200.`);
