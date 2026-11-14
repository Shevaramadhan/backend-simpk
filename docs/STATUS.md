# Status Backend

Terakhir diperbarui: 14 November 2026.

## Posisi saat ini

| Bagian | Status |
|---|---|
| Struktur proyek dan TypeScript | Selesai |
| Skema database (15 model) | Selesai, tiga migrasi sudah dijalankan; mengikuti ERD di `10_Ketentuan_Sistem` dengan tambahan yang dicatat di KEPUTUSAN |
| Login, `/auth/me`, hak akses per role | Selesai, teruji dengan MySQL |
| Kelola akun internal | Selesai, teruji dengan MySQL |
| Middleware akses per proyek | Selesai, dipakai rute `/projects` |
| Pendaftaran klien (nama, email, WhatsApp, kata sandi), login Google, katalog, pengajuan project dengan dokumen pendukung, persetujuan | Selesai, teruji dengan MySQL dan Chrome |
| Ganti dan lupa kata sandi, perbaikan email | Selesai, teruji dengan MySQL dan Chrome; pengiriman email asli belum diuji |
| Proyek, tim, tugas, progres per bidang berbobot | Selesai, teruji dengan MySQL termasuk uji kebocoran catatan teknis; halaman Operasional dan Tim belum dibuat |
| Tagihan (DP dan pelunasan oleh Marketing), unggah bukti, verifikasi | Selesai, teruji dengan MySQL dan Chrome |
| Unggah berkas dan unduhan berhak akses | Selesai: dokumen pendukung dan bukti transfer, jenis berkas diperiksa dari isinya |
| Dashboard ringkasan | Belum dibuat |
| Ulasan, pengingat email | Belum dibuat (fitur tambahan) |

Yang sudah teruji: pengecekan tipe, 8 tes tanpa database, 51 tes integrasi dengan MySQL, dan alur klien lengkap di Chrome (daftar sampai melihat progres), dan login keempat akun contoh pada server asli.

## Catatan deploy

- Isi `SMTP_*`, karena tanpa itu tautan lupa kata sandi tidak terkirim.
- Isi `GOOGLE_CLIENT_ID` (dan `VITE_GOOGLE_CLIENT_ID` di frontend) dengan OAuth Client ID jenis Web application agar login Google aktif.
- Folder `uploads/` harus ikut dicadangkan; berkas tidak tersimpan di database.
- Jika backend berada di belakang proxy, aktifkan `trust proxy` agar pembatas percobaan menghitung alamat IP pengunjung, bukan alamat proxy.

## Lingkungan pengembangan

MySQL 8.0.30 dari Laragon di `127.0.0.1:3306`, database `simpk` untuk pengembangan dan `simpk_test` untuk tes.

## Langkah berikutnya

1. Halaman Operasional: daftar pengajuan disetujui, bentuk proyek, pilih worker (Figma "Project Page Operational").
2. Halaman Tim: tugas saya, perbarui persentase dan catatan.
3. Dashboard ringkasan proyek dan uang masuk (REQ-F06).

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
