# Business Rules — Pengelolaan Kos

## Aturan inti (invariant)
1. **Satu kontrak aktif per kamar.** Dua kontrak aktif tidak boleh menunjuk kamar sama.
2. **Check-in** hanya boleh pada kamar berstatus `Kosong`. Berhasil → kamar menjadi `Terisi`.
3. **Check-out / terminasi** menutup kontrak aktif → kamar menjadi `Kosong`.
4. **Deposit (uang jaminan)** diterima saat check-in; dikembalikan saat check-out dikurangi tunggakan dan potongan kerusakan.
5. **Tagihan bulanan** dibuat satu per kontrak aktif per periode (bulan). Jumlah = sewa bulanan + denda jika periode sebelumnya belum lunas lewat masa tenggang.

## Status kamar
```
Kosong → Dipesan → Terisi → Kosong
Kosong → Perbaikan → Kosong
```
Transformasi hanya via kontrak (Terisi) atau tindakan admin (Kosong/Perbaikan).

## Tagihan & pembayaran
- Satu tagihan per periode per kontrak. Periode ditandai `tahun-bulan`.
- Pembayaran **bisa sebagian**. Status tagihan: `Belum Lunas` / `Sebagian` / `Lunas`.
- Pembayaran diterapkan ke tagihan terlama yang belum lunas lebih dulu (FIFO).
- **Tunggakan** = total saldo tagihan terbuka (periode belum lunas).
- **Denda**: berlaku jika lewat `jatuh_tempo + masa_tenggang`. Formula konfigurasi (mis. Rp/hari atau flat per bulan).

## Perhitungan deposit saat check-out
```
Pengembalian = Deposit − (Σ tunggakan) − potongan kerusakan
```
Harus ≥ 0; jika negatif, penyewa menanggung sisanya.

## Laporan
- **Okupansi** = kamar Terisi ÷ total kamar.
- **Pemasukan bulanan** = Σ pembayaran pada bulan itu.
- **Peringatan kontrak** = kontrak aktif yang `berakhir` dalam 30/60 hari (atau tanpa tanggal berakhir).

## Validasi input
- Tanggal check-out ≥ tanggal check-in.
- Jumlah pembayaran > 0.
- Tidak boleh ada pembayaran melampaui total saldo tagihan (tolak berlebih, atau catat sebagai saldo muka bila disetujui).
