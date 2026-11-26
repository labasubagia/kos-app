# Roadmap

## Fase 1 — Fondasi
- Scaffold SvelteKit + `adapter-static`, deploy kosong ke GitHub Pages via GitHub Actions.
- Skema Postgres (SQL) di Supabase + aktifkan Auth (admin tunggal).
- Skema Postgres (SQL) di Supabase: `tenants`, `memberships`, tabel bisnis + RLS.
- Aktifkan Auth; bootstrap signup → buat tenant + owner.

## Fase 2 — Model & CRUD inti
- Tabel: `kamar`, `penyewa`, `kontrak` (partial unique index aktif, `tenant_id`) di Supabase.
- Halaman SvelteKit: daftar/form kamar, penyewa, kontrak (check-in/out).
- Logika status kamar + invariant 1-kontrak-aktif per tenant.
- Kelola anggota (owner): tambah/hapus admin.
- Halaman SvelteKit: daftar/form kamar, penyewa, kontrak (check-in/out).
- Logika status kamar + invariant 1-kontrak-aktif.

## Fase 3 — Engine tagihan & pembayaran
- Tabel: `tagihan`, `pembayaran`.
- Generate tagihan (Edge Function terjadwal / on-demand) + halaman tagihan per kontrak.
- Catat pembayaran (penuh/sebagian), status otomatis, FIFO.
- Denda & tunggakan.

## Fase 4 — Dashboard & laporan
- Widget dashboard: okupansi, pemasukan bulanan, tunggakan, kontrak hampir berakhir.
- Ekspor CSV + tampilan cetak kwitansi.

## Fase 5 — Hardening & rilis
- Validasi input di sisi klien + RLS di sisi DB.
- Uji end-to-end alur check-in → tagihan → bayar → check-out.

## Setelah rilis
- P2 (opsional): notifikasi pengingat, kemudian multi-properti.
