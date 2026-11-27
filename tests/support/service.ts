// Service-role Supabase client for admin-level test operations (user/tenant
// creation, cross-tenant RLS checks). Never used in app code.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./db";

export const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY ?? "";

export function hasServiceCreds(): boolean {
  return !!(SUPABASE_URL && SERVICE_ROLE_KEY);
}

let svc: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (!svc) svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  return svc;
}
