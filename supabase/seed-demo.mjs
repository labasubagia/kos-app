#!/usr/bin/env node
/**
 * Seed demo data for the demo account (demo22@gmail.com / demo22) so the
 * business-rule cases in issue #47 are observable:
 *
 *   - hierarchy: a second location (Kos Permata) with a building → rooms
 *     (proves tenant can own multiple locations);
 *   - billing: bills end in `paid` / `partial` / `unpaid` (arrears order);
 *   - dashboard: empty rooms stay `available`; partial/unpaid renters give
 *     arrears-sorting inputs.
 *
 * Idempotent: skips entities whose unique name already exists. Uses only the
 * anon key + real sign-in (never the service role), so RLS is exercised.
 *
 *   node supabase/seed-demo.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const c = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);

const { error: signErr } = await c.auth.signInWithPassword({
  email: "demo22@gmail.com",
  password: "demo22",
});
if (signErr) {
  console.error("SIGNIN_ERROR:", signErr.message);
  process.exit(1);
}

const { data: member } = await c.from("memberships").select("tenant_id").eq("role", "owner").maybeSingle();
if (!member) {
  console.error("NO_TENANT: demo user is not an owner of any tenant");
  process.exit(1);
}
const T = member.tenant_id;

const findId = async (table, column, value) => {
  const { data } = await c.from(table).select("id").eq(column, value).maybeSingle();
  return data?.id ?? null;
};

// --- 1. second location (multi-location hierarchy) ---
let locId = await findId("locations", "name", "Kos Permata");
if (!locId) {
  const { data, error } = await c
    .from("locations")
    .insert({ name: "Kos Permata", tenant_id: T })
    .select("id")
    .single();
  if (error) throw new Error(`location: ${error.message}`);
  locId = data.id;
  console.log("created location Kos Permata", locId);
} else {
  console.log("location Kos Permata exists", locId);
}

let buildId = await findId("buildings", "name", "Tower A");
if (!buildId) {
  const { data, error } = await c
    .from("buildings")
    .insert({ name: "Tower A", location_id: locId, tenant_id: T })
    .select("id")
    .single();
  if (error) throw new Error(`building: ${error.message}`);
  buildId = data.id;
  console.log("created building Tower A", buildId);
}

// --- 2. rooms: one to occupy, two left empty ---
const ensureRoom = async (name, rent) => {
  let id = await findId("rooms", "name", name);
  if (id) return id;
  const { data, error } = await c
    .from("rooms")
    .insert({ name, building_id: buildId, tenant_id: T, type: "regular", capacity: 1, monthly_rent: rent })
    .select("id")
    .single();
  if (error) throw new Error(`room ${name}: ${error.message}`);
  console.log("created room", name, data.id);
  return data.id;
};
const roomOcc = await ensureRoom("A-01", 850000);
await ensureRoom("A-02", 750000); // empty
await ensureRoom("B-01", 800000); // empty

// --- 3. renter + check-in into A-01 ---
let renterId = await findId("renters", "name", "Budi Santoso");
if (!renterId) {
  const { data, error } = await c
    .from("renters")
    .insert({ name: "Budi Santoso", phone: "0812-0000-0003", tenant_id: T })
    .select("id")
    .single();
  if (error) throw new Error(`renter: ${error.message}`);
  renterId = data.id;
  console.log("created renter Budi Santoso", renterId);
}

const { data: occRoom } = await c.from("rooms").select("status").eq("id", roomOcc).single();
if (occRoom?.status !== "occupied") {
  const { error } = await c.rpc("check_in_contract", {
    p_renter_id: renterId,
    p_room_id: roomOcc,
    p_start_date: new Date().toISOString().slice(0, 10),
    p_end_date: null,
    p_monthly_rent: 850000,
    p_deposit: 850000,
  });
  if (error) throw new Error(`check-in: ${error.message}`);
  console.log("checked in Budi into A-01");
}

// --- 4. generate current-month bills (idempotent per contract+period) ---
const { error: genErr } = await c.rpc("generate_bills", {});
if (genErr) throw new Error(`generate_bills: ${genErr.message}`);
console.log("generated bills");

// --- 5. pay off existing unpaid bills in full (P2 → paid) ---
const renterNames = {
  "551b0eaa-6f79-41db-9064-561e0c63c93d": "P1",
  "b1d135cd-f38b-461e-8635-316d9a916255": "P2",
};
const { data: contracts } = await c.from("contracts").select("id, renter_id");
for (const ct of contracts) {
  const label = renterNames[ct.renter_id] ?? "P3";
  const { data: bills } = await c
    .from("bills")
    .select("id, amount, status")
    .eq("contract_id", ct.id);
  for (const b of bills) {
    if (label === "P2" && b.status === "unpaid") {
      const { error } = await c.rpc("record_payment", {
        p_contract_id: ct.id,
        p_amount: b.amount,
      });
      if (error) throw new Error(`pay ${label}: ${error.message}`);
      console.log(`paid ${label} bill ${b.period} in full`);
    }
    }
}

console.log("seed done");
