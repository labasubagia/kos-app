# Repository Guidelines

## Project Overview
SaaS multi-tenant web app for boarding-house management (rooms, tenants, contracts, monthly bills, payments). Each owner (tenant) gets an isolated data area and can add admins (e.g., spouse/children). **Status: scaffolded** — SvelteKit + Tailwind + shadcn-svelte + Supabase client live (PR #6); feature work follows. **Language: the entire development process is in English** — docs, issues, PRs, commits, code, comments, and discussions. Only end-user-facing UI strings/data are Indonesian.

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
```bash
# scaffold SvelteKit (sv CLI, successor to create-svelte)
npx sv create . --template minimal --types ts --no-add-ons
# Tailwind + shadcn-svelte
npx shadcn-svelte@latest init --preset vega --base-color neutral --css src/app.css
# lint/format (Rust): oxlint + oxvelte (.svelte) + oxfmt
npm run lint && npm run format
# Supabase migrations (per env)
supabase link --project-ref <staging|prod>
supabase db push
# deploy
git push origin staging   # → Netlify
git push origin main      # → GitHub Pages (prod)
```

## Development Workflow (GitHub)
- **Every task** (feature, bug, refactor) → create an **Issue** first with a label (`bug`, `enhancement`, `chore`, `docs`). Tiny typo/doc fixes may go straight to PR without an issue.
- **Branching**: `feat/<desc>` / `fix/<desc>` off `main`; PR required. The PR body MUST include the closing keyword `fixes #<id>` (or `closes #<id>`) for its issue so GitHub auto-closes it on merge; otherwise the issue stays open after merge.
- **PR** → Netlify deploy preview + CI (`svelte-check`, lint). Review before merging to `main`.
- **Status tracking**: GitHub Projects (3-column board) — *Todo / In Progress / Done*. Assign the issue, drag columns.
- **Prod release**: tag `v*` → GitHub Actions → GitHub Pages.
- Supabase migrations handled per PR (`supabase db diff`); review before merge.
- **Merge policy**: never merge a PR without explicit user approval. Propose the PR, then wait for the user to approve before merging.

## Code Conventions & Common Patterns
- **Naming**: kebab-case tables/emails, lowercase enum types (`kosong`, `owner`).
- **Error handling**: guardrails client-side; final integrity in DB (RLS + constraints). No empty try/catch.
- **Async**: SvelteKit `load` functions + `supabase` client; `await` all queries.
- **State management**: props/events + small stores; avoid complex stores (YAGNI).
- **Tenant context**: inject `tenant_id` from user session (via `memberships`); never hardcode.
- **Format & language**: English for every development artifact — code, identifiers, comments, commits, issues, PRs, docs, discussions. Indonesian only in end-user UI strings & data (IDR, `Y-m-d`).

## Important Files
- `docs/03-data-model.md` — authoritative schema (tenants, memberships, kamar, penyewa, kontrak, tagihan, pembayaran).
- `docs/02-business-rules.md` — invariants: 1 active contract/room; monthly bill; FIFO payment; deposit.
- `docs/06-deployment.md` — env wiring (staging active, prod later).

## Runtime/Tooling Preferences
- **Runtime**: Node (LTS) + npm; SvelteKit via Vite.
- **Package manager**: npm.
- **DB**: PostgreSQL (Supabase).
- **Tooling**: Supabase CLI for migrations; GitHub Actions for CI/deploy; shadcn-svelte (Tailwind) for UI; oxlint/oxvelte/oxfmt (Rust) for lint/format.

## Testing & QA
- Planning phase: no test suite yet.
- On implementation: test the end-to-end flow check-in → bill → pay → check-out (see roadmap Phase 5); verify RLS blocks cross-tenant access (test with 2 different-tenant accounts).
- Static verification: TypeScript (`svelte-check`) + lint after every change.
