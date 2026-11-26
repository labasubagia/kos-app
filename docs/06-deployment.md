# Deployment & Environment

## Status awal
- Semua pengembangan, data, dan pengujian berjalan di **staging** (tech stack gratis; akun `owner1`/`admin1` sebagai akun uji).
- **Produksi** disiapkan wiring-nya tapi aktif belakangan, setelah staging stabil.
- Tujuan env: mempermudah testing — staging bebas eksperimen, prod dijaga bersih.

## Strategi environment
| Env | Supabase | Frontend |
|---|---|---|
| Staging (aktif) | Proyek `kos-app-staging` | **Netlify** (gratis, URL preview per PR/branch) |
| Produksi (menyusul) | Proyek `kos-app` | GitHub Pages |

- GitHub Pages = **1 situs per repo** → prod pakai Pages; staging pakai **Netlify** agar cukup 1 repo source.
- Secrets per env (Supabase URL + anon key) disimpan di GitHub Secrets sesuai environment.

## GitHub Development Flow (trunk-based)
- **`main`** = integrasi; kini deploy sebagai staging di Netlify.
- Feature branch pendek (`feat/...`, `fix/...`) off main; **PR wajib**.
- Tiap PR → **Netlify deploy preview** (URL unik) + CI (`svelte-check`, lint).
- Review/uji di preview terhadap data staging Supabase.
- Merge ke `main` → refresh situs staging.
- **Rilis prod**: tag `v*` → GitHub Actions build → GitHub Pages (saat prod aktif).
- Lindungi `main`: required status check + review.

## Migrasi Supabase
- Migrasi SQL dikelola per PR (`supabase db diff`); review sebelum merge. Pastikan kompatibel maju-mundur.
- Apply via Supabase CLI: `supabase link --project-ref <id>` lalu `supabase db push` per env.
- Bukan migrasi manual di dashboard.

## Multi-tenant (SaaS)
- Setiap env (staging/prod) punya dataset tenant-nya sendiri — data staging tidak pernah tercampur dengan prod.
- Di dalam satu env: tiap owner bekerja di tenant-nya sendiri, terisolasi RLS.
- Akun uji (`owner1`/`admin1`) hidup di tenant staging; prod nanti punya akun `owner1`/`admin1` yang dibuat ulang.
