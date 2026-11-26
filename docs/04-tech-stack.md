# Tech Stack

## Rekomendasi (100% gratis)
| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend | **SvelteKit + `adapter-static`** | Kompilasi ke HTML/CSS/JS statis → jalan di GitHub Pages tanpa server. Routing berbasis file, skeleton standar. |
| Komponen UI | **shadcn-svelte** (bits-ui + Tailwind CSS) | Koleksi komponen asesibel, salin-tempel, tema lewat Tailwind — matang dan teruji. |
| Hosting frontend | **GitHub Pages** | Gratis, statis, CI via GitHub Actions. |
| Backend/data/auth | **Supabase** | Postgres + Auth + RLS + Edge Functions — semua tier gratis untuk skala kos ini. |

## Mengapa SvelteKit
- `adapter-static` mengubah app jadi artefak statis; GitHub Pages melayani langsung.
- SvelteKit = Svelte + routing standar; kalau hanya satu halaman dashboard, Svelte murni cukup.
- `shadcn-svelte` bergantung pada **Tailwind CSS** + bits-ui → sertakan `@tailwindcss/vite` di setup Vite.
- Tanpa server aplikasi → **semua integritas data ditegakkan di Postgres**.

## Dampak arsitektur (tanpa server)
- **Invariant** `1 kontrak aktif per kamar` → `partial unique index` di Postgres.
- **Proteksi data** → Row Level Security (RLS) Supabase, bukan validasi server.
- **Tagihan bulanan** → Edge Function Supabase (dijadwalkan) atau generate on-demand saat buka halaman.
- **Auth** → Supabase Auth (admin tunggal).

## Alternatif
- **Next.js + validatesabase** — wajar, tapi lebih berat untuk hasil sama; SvelteKit lebih ringan di GitHub Pages.
- Laravel/backend server **batal** — tidak gratis, tidak diperlukan.

## Standar
- Kode Indonesia (Rupiah, tanggal `Y-m-d`).
- Variabel env dari Supabase (URL + anon key) disimpan rahasia di GitHub Secrets.
