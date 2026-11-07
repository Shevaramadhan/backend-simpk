# Status Backend

Terakhir diperbarui: 7 November 2026.

## Posisi saat ini

| Bagian | Status |
|---|---|
| Struktur proyek dan TypeScript | Selesai |
| Skema database (14 model) | Selesai, skema valid, migrasi belum dijalankan |
| Login, `/auth/me`, hak akses per role | Selesai, belum diuji dengan database |
| Kelola akun internal | Selesai, belum diuji dengan database |
| Middleware akses per proyek | Selesai, belum dipakai rute mana pun |
| Akun klien, katalog, pesanan | Belum dibuat |
| Proyek, tim, tugas, progres | Belum dibuat |
| Tagihan, pembayaran, dashboard | Belum dibuat |
| Upload bukti transfer | Belum dibuat |
| Ulasan, pengingat email | Belum dibuat (fitur tambahan) |

Yang sudah teruji: pengecekan tipe, 8 tes tanpa database, build, dan server menyala.

## Belum ada

- Migrasi Prisma, karena MySQL belum terpasang di lingkungan pengembangan.
- Commit pertama. Remote sudah terpasang.

## Langkah berikutnya

1. Menyiapkan MySQL, menjalankan migrasi dan seed, lalu menguji login.
2. Mengerjakan akun klien, katalog, dan pesanan.

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
| Akun klien daftar mandiri atau dibuatkan Marketing | Koordinator Marketing | Endpoint akun klien |
| Skema DP, termin, pajak, denda | Neo Telemetri | Tagihan dan pembayaran |
| Format ekspor laporan | Kedua koordinator | Laporan |
| Hosting dan target waktu muat | Neo Telemetri | Deploy |
