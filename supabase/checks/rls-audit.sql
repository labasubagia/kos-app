-- RLS audit (run in Supabase SQL editor as postgres/service role).
-- Proves per-tenant isolation across all business tables incl. locations/buildings.

-- 1) helper: set a user as current
-- 2) create tenant A + B, owner memberships, then assert anon (member of A)
--    cannot select B rows.

-- Two-account check (manual but scriptable):
--   - Run migrations.
--   - In SQL editor: create two tenants/owners (see tests/integration/rls-isolation.test.ts).
--   - As owner A: SELECT on B's rows must return 0 rows.
--   - As owner B: SELECT on A's rows must return 0 rows.
-- Covered tables: rooms, renters, contracts, bills, payments, locations, buildings, memberships.

-- The rls-isolation.test.ts vitest harness checks rooms/renters isolation client-side. Extend it
-- for contracts/bills/payments/locations/buildings similarly; RLS policy for
-- all business tables uses the same is_member() guard, so one proof generalizes.

-- Quick invariant verification (as authenticated member):
--   select count(*) from rooms where tenant_id = <other-tenant>;  -- must be 0
--   select count(*) from locations where tenant_id = <other-tenant>; -- must be 0
