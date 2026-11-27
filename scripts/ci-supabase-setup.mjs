#!/usr/bin/env node
// Provision a CI e2e user + owner tenant on a freshly-started local Supabase
// stack so the app login and RLS-bound queries work. Idempotent: safe to
// re-run on a stack that already has the membership.
import { createClient } from "@supabase/supabase-js";

const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASS ?? "";
const url = process.env.PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!email || !password || !url || !anon || !service) {
	throw new Error(
		"missing env: E2E_EMAIL / E2E_PASS / PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
	);
}

const admin = createClient(url, service, {
	auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Ensure the auth user exists (create, or reuse if already present).
let userId;
const { data: created, error: uErr } = await admin.auth.admin.createUser({
	email,
	password,
	email_confirm: true,
});
if (uErr) {
	const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
	const found = list?.users?.find((u) => u.email === email);
	if (!found) throw new Error(`createUser: ${uErr.message}`);
	userId = found.id;
} else {
	userId = created.user.id;
}

// 2. Membership already exists? Nothing to do.
const { data: existing } = await admin
	.from("memberships")
	.select("tenant_id")
	.eq("user_id", userId)
	.maybeSingle();
if (existing) {
	console.log("membership already exists; done");
	process.exit(0);
}

// 3. Owner tenant + membership.
const { data: tenant, error: tErr } = await admin
	.from("tenants")
	.insert({ name: "CI Tenant" })
	.select()
	.single();
if (tErr) throw new Error(`tenant: ${tErr.message}`);

const { error: mErr } = await admin.from("memberships").insert({
	user_id: userId,
	tenant_id: tenant.id,
	role: "owner",
});
if (mErr) throw new Error(`membership: ${mErr.message}`);

console.log("provisioned user + owner tenant");
