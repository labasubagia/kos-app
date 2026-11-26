#!/usr/bin/env node
/**
 * E2E + RLS isolation harness.
 *
 * Requires a linked Supabase project + service role key (setup/teardown) and
 * the public anon key (tenant-scoped RLS assertions).
 *
 *   PUBLIC_SUPABASE_URL=... SERVICE_ROLE_KEY=... PUBLIC_SUPABASE_ANON_KEY=... \
 *     node supabase/tests/e2e.mjs
 */
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SERVICE_ROLE_KEY;
const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
assert(url && serviceKey && anonKey, "set PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY, PUBLIC_SUPABASE_ANON_KEY");

const admin = createClient(url, serviceKey);
const createdUserIds = [];

async function makeUser(prefix) {
	const email = `${prefix}-${Date.now()}@test.dev`;
	const { data, error } = await admin.auth.admin.createUser({
		email,
		password: "test-pass-123",
		email_confirm: true,
	});
	assert(!error, `createUser ${email}: ${error?.message}`);
	createdUserIds.push(data.user.id);
	return { id: data.user.id, email };
}

async function signIn(email) {
	const client = createClient(url, anonKey);
	const { error } = await client.auth.signInWithPassword({ email, password: "test-pass-123" });
	assert(!error, `signIn ${email}: ${error?.message}`);
	return client;
}

async function createTenant(client, name) {
	const { error } = await client.rpc("create_tenant_as_owner", { tenant_name: name });
	assert(!error, `create tenant ${name}: ${error?.message}`);
}

async function main() {
	const ownerA = await makeUser("owner-a");
	const ownerB = await makeUser("owner-b");

	const clientA = await signIn(ownerA.email);
	const clientB = await signIn(ownerB.email);

	await createTenant(clientA, "Tenant A");
	await createTenant(clientB, "Tenant B");

	// A creates a room and a renter
	const { error: roomErr } = await clientA
		.from("rooms")
		.insert({ name: "Room A1", capacity: 1, monthly_rent: 500000 })
		.select()
		.single();
	assert(!roomErr, `insert room A: ${roomErr?.message}`);

	const { error: renterErr } = await clientA
		.from("renters")
		.insert({ name: "Renter A", phone: "0812" });
	assert(!renterErr, `insert renter A: ${renterErr?.message}`);

	// RLS: cross-tenant reads return zero rows
	const { data: seesA = [], error: ge } = await clientA.from("rooms").select("id");
	assert(!ge, `A read rooms: ${ge?.message}`);
	assert.equal(seesA.length, 1, "A sees exactly own room");

	const { data: seesB = [], error: gb } = await clientB.from("rooms").select("id");
	assert(!gb, `B read rooms: ${gb?.message}`);
	assert.equal(seesB.length, 0, "B sees zero of A's rooms");

	const { data: rentersB = [] } = await clientB.from("renters").select("id");
	assert.equal(rentersB.length, 0, "B sees zero of A's renters");

	console.log("RLS isolation OK (rooms/renters)");

	// Full cash-flow flow needs an active contract + generated bills:
	// check_in_contract → generate_bills → bill_payment → check_out_contract.
	// Without a contract, generate_bills yields nothing; the flow below is a
	// no-op guard until a contract is seeded.
	const { error: billErr } = await clientA.rpc("generate_bills", {});
	assert(!billErr, `generate_bills: ${billErr?.message}`);

	const { data: billsList = [] } = await clientA.from("bills").select("id, amount, status").eq("status", "unpaid");
	if (billsList.length) {
		console.log("Unpaid bills exist — run check_in→pay→check_out flow in UI/SQL.");
	} else {
		console.log("No unpaid bills (no active contracts) — contract flow needs check_in_contract first.");
	}

	// teardown
	const { error: delErr } = await admin.auth.admin.deleteUser(createdUserIds);
	assert(!delErr, `teardown users: ${delErr?.message}`);
	console.log("teardown OK");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
