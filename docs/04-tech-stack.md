# Tech Stack

## Recommendation (100% free)
| Layer | Choice | Reason |
|---|---|---|
| Frontend | **SvelteKit + `adapter-static`** | Compiles to static HTML/CSS/JS → runs on GitHub Pages without a server. File-based routing, standard scaffold. |
| UI components | **shadcn-svelte** (bits-ui + Tailwind CSS) | Accessible copy-paste component collection, themed via Tailwind — mature and tested. |
| Frontend hosting | **GitHub Pages** | Free, static, CI via GitHub Actions. |
| Backend/data/auth | **Supabase** | Postgres + Auth + RLS + Edge Functions — all free tier for this scale. |

## Why SvelteKit
- `adapter-static` turns the app into a static artifact; GitHub Pages serves it directly.
- SvelteKit = Svelte + standard routing; if only a single dashboard page, plain Svelte suffices.
- Without an app server → **all data integrity is enforced in Postgres**.

## Architecture impact (no server)
- **Invariant** `1 active contract per room` → `partial unique index` in Postgres.
- **Data protection** → Supabase Row Level Security (RLS), not server validation.
- **Monthly bill generation** → Supabase Edge Function (scheduled) or generate on-demand when a page opens.
- **Auth** → Supabase Auth (single admin today).

## Alternatives
- **Next.js + Supabase** — valid, but heavier for the same result; SvelteKit is lighter on GitHub Pages.
- Laravel/backend server **dropped** — not free, not needed.

## Notes
- `shadcn-svelte` depends on **Tailwind CSS** + bits-ui → include `@tailwindcss/vite` in the Vite setup.
- Code in Indonesian (IDR, dates `Y-m-d`).
- Env vars from Supabase (URL + anon key) stored as secrets in GitHub Secrets, never in code.
