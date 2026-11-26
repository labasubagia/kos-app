# Repository Guidelines

## Project Overview
SaaS multi-tenant web app for boarding-house management (rooms, tenants, contracts, monthly bills, payments). Each owner (tenant) gets an isolated data area and can add admins (e.g., spouse/children). **Status: planning phase** — the repo holds design docs (`docs/`), no code yet. This AGENTS.md captures the blueprint to follow once scaffolding begins.

## Architecture & Data Flow
- **Frontend**: SvelteKit + `adapter-static` → static artifacts on GitHub Pages (prod) / Netlify (staging). No app server.
- **Backend/data**: Supabase (Postgres + Auth + RLS + Edge Functions). All data integrity is enforced in Postgres.
- **Component UI**: shadcn-svelte (bits-ui + Tailwind CSS), dependency `@tailwindcss/vite`.
- **Data flow**: UI → Supabase SDK (JS) → API/RLS → Postgres. No custom REST API; heavy logic lives in DB (constraints + RLS) or Edge Functions (bill generation).
- **Multi-tenant**: `tenants` ↔ `memberships` (role `owner`/`admin`); business tables carry `tenant_id`; RLS `tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())`.

## Key Directories
- `docs/` — design decisions (current source of truth):
  - `01-prd.md` — scope, personas, P0/P1/P2
  - `02-business-rules.md` — invariants, room status, FIFO, deposit
  - `03-data-model.md` — Postgres schema, RLS, partial unique index
  - `04-tech-stack.md` — free stack
  - `05-roadmap.md` — implementation phases
  - `06-deployment.md` — staging/prod env
- (Planned) `src/` — SvelteKit; `supabase/` — SQL migrations + Edge Functions; `src/lib/components/ui/` — shadcn-svelte.

## Development Commands
None yet (planning phase). On scaffold:
```bash
# scaffold SvelteKit + Tailwind + shadcn-svelte
npm create svelte@latest .
npx shadcn-svelte@latest init
# Supabase migrations (per env)
supabase link --project-ref <staging|prod>
supabase db push
# deploy
git push origin staging   # → Netlify
git push origin main      # → GitHub Pages (prod)
```

## Code Conventions & Common Patterns
- **Naming**: kebab-case tables/emails, lowercase enum types (`kosong`, `owner`).
- **Error handling**: guardrails client-side; final integrity in DB (RLS + constraints). No empty try/catch.
- **Async**: SvelteKit `load` functions + `supabase` client; `await` all queries.
- **State management**: props/events + small stores; avoid complex stores (YAGNI).
- **Tenant context**: inject `tenant_id` from user session (via `memberships`); never hardcode.
- **Format & language**: English code/identifiers; Indonesian data & UI (Rupiah, `Y-m-d`).

## Important Files
- `docs/03-data-model.md` — authoritative schema (tenants, memberships, kamar, penyewa, kontrak, tagihan, pembayaran).
- `docs/02-business-rules.md` — invariants: 1 active contract/room; monthly bill; FIFO payment; deposit.
- `docs/06-deployment.md` — env wiring (staging active, prod later).

## Runtime/Tooling Preferences
- **Runtime**: Node (LTS) + npm; SvelteKit via Vite.
- **Package manager**: npm.
- **DB**: PostgreSQL (Supabase).
- **Tooling**: Supabase CLI for migrations; GitHub Actions for CI/deploy; shadcn-svelte (Tailwind) for UI.

## Testing & QA
- Planning phase: no test suite yet.
- On implementation: test the end-to-end flow check-in → bill → pay → check-out (see roadmap Phase 5); verify RLS blocks cross-tenant access (test with 2 different-tenant accounts).
- Static verification: TypeScript (`svelte-check`) + lint after every change.
