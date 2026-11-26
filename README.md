# kos-app

SaaS multi-tenant boarding-house management app. SvelteKit (Svelte 5, runes) + TypeScript + Tailwind CSS v4 + shadcn-svelte + Supabase. Free stack, single source repo.

## Stack

- **Framework**: SvelteKit (`adapter-static` → static site)
- **UI**: Tailwind CSS v4 (`@tailwindcss/vite`), shadcn-svelte (vega preset)
- **Lint/format**: oxlint + oxvelte (Svelte) + oxfmt (Rust)
- **Backend**: Supabase (Postgres + Auth + RLS + Edge Functions)

## Setup

```sh
npm install
cp .env.example .env   # fill with real Supabase values
npm run dev
```

Env vars are declared in `src/env.ts` via `defineEnvVars`. Public (`PUBLIC_*`) vars are inlined from `.env`; private vars go to `$app/env/private`.

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | production build → `build/` (adapter-static) |
| `npm run preview` | preview production build |
| `npm run check` | svelte-check |
| `npm run lint` | oxlint + oxvelte |
| `npm run format` / `format:check` | oxfmt write / check |

## Deploy

- Staging: Netlify (`netlify.toml`)
- Production: GitHub Pages

## Docs

See `docs/` (PRD, business rules, data model, tech stack, roadmap, deployment).
