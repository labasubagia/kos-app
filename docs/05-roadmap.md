# Roadmap

## Phase 1 — Foundation
- Scaffold SvelteKit + `adapter-static`, deploy empty to GitHub Pages via GitHub Actions.
- Postgres schema (SQL) in Supabase: `tenants`, `memberships`, business tables + RLS.
- Enable Auth; bootstrap signup → create tenant + owner.

## Phase 2 — Core models & CRUD
- Tables: `rooms`, `renters`, `contracts` (partial unique index active, `tenant_id`) in Supabase.
- SvelteKit pages: room/renter list forms, contracts (check-in/out).
- Room status logic + 1-active-contract invariant per tenant.
- Member management (owner): add/remove admins.

## Phase 3 — Billing & payment engine
- Tables: `bills`, `payments`.
- Generate bills (scheduled Edge Function / on-demand) + per-contract bill page.
- Record payments (full/partial), auto status, FIFO.
- Late fees & arrears.

## Phase 4 — Dashboard & reports
- Dashboard widgets: occupancy, monthly income, arrears, expiring contracts.
- CSV export + printable receipt view.

## Phase 5 — Hardening & release
- Client-side input validation + RLS on the DB side.
- End-to-end test of check-in → bill → pay → check-out.

## After release
- P2 (optional): reminders, then multi-property.
