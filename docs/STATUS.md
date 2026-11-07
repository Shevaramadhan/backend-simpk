# Status Backend

Terakhir diperbarui: 8 November 2026.

## Posisi saat ini

| Bagian | Status |
|---|---|
| Struktur proyek dan TypeScript | Selesai |
| Skema database (15 model) | Selesai, dua migrasi sudah dijalankan |
| Login, `/auth/me`, hak akses per role | Selesai, teruji dengan MySQL |
| Kelola akun internal | Selesai, teruji dengan MySQL |
| Middleware akses per proyek | Selesai, belum dipakai rute mana pun |
| Pendaftaran klien, katalog, pesanan, persetujuan | Selesai, teruji dengan MySQL dan Chrome |
| Ganti dan lupa kata sandi, perbaikan email | Selesai, teruji dengan MySQL dan Chrome; pengiriman email asli belum diuji |
| Proyek, tim, tugas, progres | Belum dibuat |
| Tagihan, pembayaran, dashboard | Belum dibuat |
| Upload bukti transfer | Belum dibuat |
| Ulasan, pengingat email | Belum dibuat (fitur tambahan) |

Yang sudah teruji: pengecekan tipe, 8 tes tanpa database, 26 tes integrasi dengan MySQL, dan login keempat akun contoh pada server asli.

## Catatan deploy

- Isi `SMTP_*`, karena tanpa itu tautan lupa kata sandi tidak terkirim.
- Jika backend berada di belakang proxy, aktifkan `trust proxy` agar pembatas percobaan menghitung alamat IP pengunjung, bukan alamat proxy.

## Lingkungan pengembangan

MySQL 8.0.30 dari Laragon di `127.0.0.1:3306`, database `simpk` untuk pengembangan dan `simpk_test` untuk tes.

## Langkah berikutnya

1. Mengerjakan proyek, tim, tugas, dan progres.
2. Menyiapkan `middlewares/upload.middleware.ts` untuk gambar portofolio dan bukti transfer.

## Jadwal

| Tanggal | Target |
|---|---|
| 8 Nov | Akun klien, katalog, pesanan (selesai) |
| 10 Nov | Proyek, tim, tugas, progres |
| 12 Nov | Tagihan, pembayaran, dashboard |
| 13 Nov | Integrasi, deploy, demo internal |
| 15 Nov | Bug utama selesai |
| 16 Nov | UAT bersama Neo Telemetri |
| 19 Nov | Serah terima |

## Menunggu jawaban

| Isu | Pihak | Dampak |
|---|---|---|
| Konfirmasi cara menghitung progres (sementara rata-rata tugas) | System Analyst | `utils/progress.ts` |
| Akun email pengirim (SMTP), wajib sebelum UAT | Neo Telemetri | Lupa kata sandi dan pengingat |
| Pendaftaran mandiri dan keputusan B-18 sampai B-26 dicatat di BRS | System Analyst | Dokumen BRS |
| Skema DP, termin, pajak, denda | Neo Telemetri | Tagihan dan pembayaran |
| Format ekspor laporan | Kedua koordinator | Laporan |
| Hosting dan target waktu muat | Neo Telemetri | Deploy |
