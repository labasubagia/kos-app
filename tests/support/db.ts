// Shared Supabase test support for the vitest DB-flow test (tests/) and the
// Playwright e2e suites (e2e/). Pure TS — no vitest/playwright imports.
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function loadDotEnv(): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

const dot = loadDotEnv();
const pick = (k: string): string => process.env[k] ?? dot[k] ?? "";

export const E2E_EMAIL = pick("E2E_EMAIL");
export const E2E_PASS = pick("E2E_PASS");
export const SUPABASE_URL = pick("PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = pick("PUBLIC_SUPABASE_ANON_KEY");

export function hasCreds(): boolean {
  return !!(E2E_EMAIL && E2E_PASS && SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Hard-fail in CI when creds are missing; local runs skip instead. */
export function requireCreds(): void {
  if (hasCreds()) return;
  if (process.env.CI) {
    throw new Error(
      "Supabase credentials not set (E2E_EMAIL/E2E_PASS/PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
}

/** Authenticated client; throws with the sign-in error. */
export async function dbClient(): Promise<SupabaseClient> {
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await c.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASS });
  if (error) throw new Error(`sign in: ${error.message}`);
  return c;
}

/** Generate the current month's bills via RPC (idempotent). */
export async function generateBillsApi(c: SupabaseClient): Promise<void> {
  const period = new Date().toISOString().slice(0, 7);
  const { error } = await c.rpc("generate_bills", { p_period: period, p_contract_id: null });
  if (error) throw new Error(`generate_bills: ${error.message}`);
}
