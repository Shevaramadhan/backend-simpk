# Status Backend

Terakhir diperbarui: 7 November 2026.

## Posisi saat ini

| Bagian | Status |
|---|---|
| Struktur proyek dan TypeScript | Selesai |
| Skema database (14 model) | Selesai, migrasi `init` sudah dijalankan |
| Login, `/auth/me`, hak akses per role | Selesai, teruji dengan MySQL |
| Kelola akun internal | Selesai, teruji dengan MySQL |
| Middleware akses per proyek | Selesai, belum dipakai rute mana pun |
| Akun klien, katalog, pesanan | Selesai, teruji dengan MySQL |
| Proyek, tim, tugas, progres | Belum dibuat |
| Tagihan, pembayaran, dashboard | Belum dibuat |
| Upload bukti transfer | Belum dibuat |
| Ulasan, pengingat email | Belum dibuat (fitur tambahan) |

Yang sudah teruji: pengecekan tipe, 8 tes tanpa database, 17 tes integrasi dengan MySQL, dan login keempat akun contoh pada server asli.

## Lingkungan pengembangan

MySQL 8.0.30 dari Laragon di `127.0.0.1:3306`, database `simpk` untuk pengembangan dan `simpk_test` untuk tes.

## Langkah berikutnya

1. Mengerjakan proyek, tim, tugas, dan progres.
2. Menyiapkan `middlewares/upload.middleware.ts` untuk gambar portofolio dan bukti transfer.

## Jadwal

| Tanggal | Target |
|---|---|
| 8 Nov | Akun klien, katalog, pesanan |
| 10 Nov | Proyek, tim, tugas, progres |
| 12 Nov | Tagihan, pembayaran, dashboard |
| 13 Nov | Integrasi, deploy, demo internal |
| 15 Nov | Bug utama selesai |
| 16 Nov | UAT bersama Neo Telemetri |
| 19 Nov | Serah terima |

## Menunggu jawaban

| Isu | Pihak | Dampak |
|---|---|---|
| Cara menghitung progres proyek | System Analyst | `utils/progress.ts` |
| Akun klien daftar mandiri atau dibuatkan Marketing (sementara dibuatkan Marketing) | Koordinator Marketing | Endpoint akun klien |
| Skema DP, termin, pajak, denda | Neo Telemetri | Tagihan dan pembayaran |
| Format ekspor laporan | Kedua koordinator | Laporan |
| Hosting dan target waktu muat | Neo Telemetri | Deploy |
