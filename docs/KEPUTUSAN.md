# Catatan Keputusan

Keputusan teknis beserta alasannya, supaya tidak dibahas ulang. Keputusan yang berubah tidak dihapus, tetapi ditandai digantikan.

Format: nomor, tanggal, keputusan, alasan, status.

| No | Tanggal | Keputusan | Alasan | Status |
|---|---|---|---|---|
| B-01 | 1 Nov 2026 | Node.js, Express, MySQL | Pilihan tim | Berlaku |
| B-02 | 1 Nov 2026 | Prisma sebagai ORM | Skema terpusat, migrasi, dan seed memudahkan perubahan setelah validasi | Berlaku |
| B-03 | 7 Nov 2026 | Mengikuti struktur folder backend-beasiswa, tanpa Redis dan Fonnte | Rapi dan jelas; Redis dan bot WhatsApp di luar BRS | Berlaku |
| B-04 | 7 Nov 2026 | Logika bisnis di controller, tanpa lapisan service | Mengikuti struktur referensi dan lebih sederhana | Berlaku |
| B-05 | 7 Nov 2026 | TypeScript mode strict | Keputusan pengembang; kesalahan tertangkap saat build | Berlaku |
| B-06 | 7 Nov 2026 | Backend dan frontend dua repo terpisah | Repo sudah disiapkan di GitHub | Berlaku |
| B-07 | 7 Nov 2026 | Empat role login; posisi proyek di `project_members` | BRS 9.1: PM ditunjuk per proyek | Berlaku |
| B-08 | 7 Nov 2026 | Progres proyek = rata-rata persentase tugas | Memenuhi BRS (Tim mengisi persentase) tanpa angka proyek yang diisi manual | Usulan, menunggu System Analyst |
| B-09 | 7 Nov 2026 | Proyek 1-N tagihan, tagihan 1-N pembayaran | BRS mewajibkan tagihan PDF; aman jika skema DP atau termin dipakai | Berlaku |
| B-10 | 7 Nov 2026 | Catatan teknis dan catatan klien kolom terpisah per update tugas | Mengikuti BRS 9.2 dan mudah memilih kolom untuk klien | Berlaku |
| B-11 | 7 Nov 2026 | Tetap Prisma 6 | Temuan `npm audit` tersisa ada di CLI Prisma; perbaikannya butuh Prisma 7 yang berisi perubahan besar | Berlaku, ditinjau setelah proyek |
| B-12 | 7 Nov 2026 | zod 4 | Memperbaiki kerentanan pada zod 3 yang memproses input pengguna | Berlaku |
| B-13 | 7 Nov 2026 | Riwayat aktivitas tidak dibuat | Tidak ada di BRS | Berlaku |
