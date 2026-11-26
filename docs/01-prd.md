# PRD — Aplikasi Pengelolaan Kos (SaaS)

## Tujuan
Menyediakan aplikasi **SaaS multi-tenant** untuk mengelola kos: tiap pemilik (tenant) mendapatkan area terisolasi untuk kamar, penyewa, kontrak, tagihan, dan pembayaran. Setiap tenant dapat menambahkan admin (mis. istri/anak).

## Persona & tenant
- **owner** — pemilik kos. Membuat tenant saat daftar pertama kali. Kelola anggota (tambah/hapus admin) + pengaturan.
- **admin** (mis. istri/anak) — operasional harian: kamar, penyewa, kontrak, tagihan, pembayaran.
- Setiap user berada dalam satu atau lebih tenant; data terisolasi per tenant (RLS).
- Tanpa portal penyewa.

## Keputusan Terkonfirmasi
| Aspek | Keputusan |
|---|---|
| Arsitektur | SaaS multi-tenant (isolasi per tenant) |
| Skala | Satu kos per tenant, <20 kamar |
| Utilitas | Tarif flat, sudah termasuk sewa |
| Pengguna | owner + admin dalam tenant yang sama |
| Portal penyewa | Tidak ada — internal saja |
| Pembayaran | Manual (tunai/transfer), dicatat admin |
| Env | Staging aktif; prod menyusul |

## Fitur

### P0 — MVP inti
- Onboarding: signup → buat tenant → owner; undang admin (via email-invite, auth).
- Kelola kamar: CRUD + status (Kosong / Dipesan / Terisi / Perbaikan).
- Kelola penyewa: CRUD + riwayat kontrak.
- Kontrak: check-in, perpanjang, check-out (terminasi).
- Tagihan bulanan: generate otomatis per kamar aktif per bulan.
- Pembayaran: catat penuh/sebagian per periode, validasi berlebih.
- Lacak tunggakan.
- Dashboard: okupansi, pemasukan bulanan, daftar tunggakan, kontrak hampir berakhir.
- Kelola anggota (owner): tambah/hapus admin.

### P1
- Arsip laporan pemasukan per bulan/tahun.
- Ekspor CSV (penyewa, pembayaran, tunggakan).
- Kwitansi ringkas (tampilan cetak).

### P2 (baru jika berkembang)
- Notifikasi pengingat jatuh tempo (email/WhatsApp).
- Multi-properti per tenant setelah >1 kos atau >20 kamar.

## Di luar lingkup (sekarang)
- Portal penyewa, pembayaran online/gateway.
- Pencatatan meter listrik/air.
- Billing/pembayaran untuk langganan SaaS itu sendiri.

## Kriteria sukses
- Data tiap tenant terisolasi penuh (tidak bisa bocor lintas tenant).
- Semua transaksi tercatat dan bisa dilacak balik.
- Laporan pemasukan & tunggakan akurat per bulan.
- Tidak ada kamar terisi tanpa kontrak aktif.
