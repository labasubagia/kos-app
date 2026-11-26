# Roadmap

## Phase 1 — Foundation
- [x] Scaffold SvelteKit + `adapter-static`, deploy empty to GitHub Pages via GitHub Actions.
- [x] Postgres schema (SQL) in Supabase: `tenants`, `memberships`, business tables + RLS.
- [x] Enable Auth; bootstrap signup → create tenant + owner.

## Phase 2 — Core models & CRUD
- [x] Tables: `rooms`, `renters`, `contracts` (partial unique index active, `tenant_id`) in Supabase.
- [x] SvelteKit pages: room/renter list forms, contracts (check-in/out).
- [x] Room status logic + 1-active-contract invariant per tenant.
- [x] Member management (owner): add/remove admins.

## Phase 3 — Billing & payment engine
- [x] Tables: `bills`, `payments`.
- [x] Generate bills (scheduled Edge Function / on-demand) + per-contract bill page.
- [x] Record payments (full/partial), auto status, FIFO.
- [x] Late fees & arrears.

## Phase 4 — Dashboard & reports
- [x] Dashboard widgets: occupancy, monthly income, arrears, expiring contracts.
- [x] CSV export + printable receipt view.

## Phase 5 — Hardening & release
- [x] Client-side input validation + RLS on the DB side.
- [ ] End-to-end test of check-in → bill → pay → check-out (harness at `supabase/tests/e2e.mjs`; run when a Supabase project is linked).

## After release
- P2 (optional): reminders, then multi-property.
