# Deployment & Environment

## Initial status
- All development, data, and testing run in **staging** (free stack; accounts `owner1`/`admin1` are test accounts).
- **Production** has its wiring prepared but activates later, once staging is stable.
- Purpose of env: make testing easier — staging is free for experiments, prod stays clean.

## Environment strategy
| Env | Supabase | Frontend |
|---|---|---|
| Staging (active) | Project `kos-app-staging` | **Netlify** (free, URL preview per PR/branch) |
| Production (later) | Project `kos-app` | GitHub Pages |

- GitHub Pages = **1 site per repo** → prod uses Pages; staging uses **Netlify** to keep a single source repo.
- Secrets per env (Supabase URL + anon key) stored in GitHub Secrets per environment.

## GitHub Development Flow (trunk-based)
- **`main`** = integration; currently deployed as staging on Netlify.
- Short feature branches (`feat/...`, `fix/...`) off `main`; **PR required**.
- Each PR → **Netlify deploy preview** (unique URL) + CI (`svelte-check`, lint).
- Review/test on the preview against staging Supabase data.
- Merge to `main` → refresh the staging site.
- **Prod release**: push to `main` → GitHub Actions build → GitHub Pages.
- Protect `main`: required status check + review.

## Prod release (implemented)
- Workflow `.github/workflows/deploy.yml` handles the prod release: push to `main` → build → GitHub Pages; tags are SemVer release markers.
- App uses `BASE_PATH` env (build-time): empty (root) by default, `/kos-app` in the Pages workflow. All internal links are base-aware via `import.meta.env.BASE_URL`.
- Repo settings needed: Pages source = GitHub Actions; Actions **variables** `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` (same names `ci.yml` uses).

## Supabase migrations
- SQL migrations handled per PR (`supabase db diff`); review before merge. Ensure forward/backward compatibility.
- Apply via Supabase CLI: `supabase link --project-ref <id>` then `supabase db push` per env.
- Never manual migrations in the dashboard.
- After pushing a migration that changes an RPC signature (e.g. `generate_bills` gaining `p_contract_id`), PostgREST must reload its schema cache or clients hit `Could not find the function … in the schema cache`. `20260101000013` ends with `pg_notify('pgrst','reload schema')` to self-heal on apply. For a DB that already ran the migration before that line existed, run once: `select pg_notify('pgrst','reload schema');`.

## Multi-tenant (SaaS)
- Each env (staging/prod) has its own tenant dataset — staging data never mixes with prod.
- Within one env: each owner works in their own tenant, isolated by RLS.
- Test accounts (`owner1`/`admin1`) live in the staging tenant; prod will later have its own `owner1`/`admin1` accounts, recreated.
