// Multi-tenant RLS isolation against a live Supabase (local Docker stack or a
// disposable test project). Creates two owners/tenants via the service-role
// key, then asserts each anon client sees only its own rows. Ported from the
// former supabase/tests/e2e.mjs.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, hasCreds } from "../support/db";
import { hasServiceCreds, serviceClient } from "../support/service";

// Skip unless both anon creds and a service-role key are configured (CI must
// inject SERVICE_ROLE_KEY to enable RLS coverage). The anon gate still fails
// loudly in CI via requireCreds() in billing-flow.test.ts.
const SKIP = !(hasCreds() && hasServiceCreds());

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password: "test-pass-123" });
  expect(error, `signIn ${email}: ${error?.message}`).toBeNull();
  return client;
}

async function createTenant(client: SupabaseClient, name: string): Promise<void> {
  const { error } = await client.rpc("create_tenant_as_owner", { tenant_name: name });
  expect(error, `create tenant ${name}: ${error?.message}`).toBeNull();
}

describe.skipIf(SKIP)("RLS cross-tenant isolation against live Supabase", () => {
  const createdUserIds: string[] = [];
  let admin: SupabaseClient;

  beforeAll(() => {
    admin = serviceClient();
  }, 30_000);

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  }, 30_000);

  async function makeUser(prefix: string): Promise<{ email: string }> {
    const email = `${prefix}-${Date.now()}@test.dev`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "test-pass-123",
      email_confirm: true,
    });
    expect(error, `createUser ${email}: ${error?.message}`).toBeNull();
    createdUserIds.push(data.user.id);
    return { email };
  }

  it("A sees its own rows; B sees zero of A's", async () => {
    const a = await makeUser("a");
    const b = await makeUser("b");
    const clientA = await signIn(a.email);
    const clientB = await signIn(b.email);
    await createTenant(clientA, "Tenant A");
    await createTenant(clientB, "Tenant B");

    const { error: roomErr } = await clientA
      .from("rooms")
      .insert({ name: "Room A1", capacity: 1, monthly_rent: 500000 })
      .select()
      .single();
    expect(roomErr, `insert room A: ${roomErr?.message}`).toBeNull();

    const { error: renterErr } = await clientA
      .from("renters")
      .insert({ name: "Renter A", phone: "0812" });
    expect(renterErr, `insert renter A: ${renterErr?.message}`).toBeNull();

    const { data: seesA, error: ge } = await clientA.from("rooms").select("id");
    expect(ge, `A read rooms: ${ge?.message}`).toBeNull();
    expect(seesA.length).toBe(1);

    const { data: seesB, error: gb } = await clientB.from("rooms").select("id");
    expect(gb, `B read rooms: ${gb?.message}`).toBeNull();
    expect(seesB.length).toBe(0);

    const { data: rentersB } = await clientB.from("renters").select("id");
    expect(rentersB.length).toBe(0);
  }, 60_000);
});
