#!/usr/bin/env node
// Print local Supabase stack endpoints as `url=... / anon=... / service=...`
// for GitHub Actions `$GITHUB_OUTPUT`. Tolerant of the CLI's exact env key
// names / quoting across versions; dumps raw output on failure for diagnosis.
import { execFileSync } from "node:child_process";

let raw = "";
try {
	raw = execFileSync("supabase", ["status", "-o", "env"], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
} catch (e) {
	console.error("supabase status exited non-zero:", e.message);
}

const map = {};
for (const line of raw.split("\n")) {
	// optional `export` prefix, optional surrounding quotes, strip \r
	const m = line.match(/^\s*(?:export\s+)?(\w+)\s*=\s*("?)(.*?)\2\s*$/);
	if (m) map[m[1]] = m[3].replace(/\r$/, "");
}

const pick = (...names) => names.map((n) => map[n]).find((v) => v && v.length);
const url = pick("SUPABASE_URL", "API_URL");
const anon = pick("SUPABASE_ANON_KEY", "ANON_KEY");
const service = pick("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY");

if (!url || !anon || !service) {
	console.error("parsed keys:", JSON.stringify(map, null, 2));
	console.error("raw status output:\n" + raw);
	throw new Error(
		`could not extract local supabase endpoints (url=${!!url} anon=${!!anon} service=${!!service})`,
	);
}

console.log(`url=${url}`);
console.log(`anon=${anon}`);
console.log(`service=${service}`);
