# Riwayat Perubahan Backend

Semua perubahan dicatat di sini, terbaru di atas. Setiap entri ditulis dalam commit yang sama dengan perubahannya.

## Format

```
## YYYY-MM-DD

### Ditambah / Diubah / Diperbaiki / Dihapus
- Apa yang berubah dan alasannya.
```

## 2026-11-14 (profil klien)

### Ditambah
- `GET /clients/me` dan `PATCH /clients/me`: klien melihat dan mengubah profilnya sendiri (nama, nama instansi, jenis klien, nomor WhatsApp, alamat). Email dan status aktif tidak dapat diubah lewat jalur ini. Berguna untuk klien yang masuk dengan Google dan belum punya nomor WhatsApp.

## 2026-11-14 (keahlian worker)

### Ditambah
- Kolom `users.keahlian` (teks bebas, maksimal 60 karakter) untuk keahlian utama akun Tim, lewat migrasi `keahlian_worker` (B-33). `POST /users` dan `PATCH /users/:id` menerima `keahlian`; untuk role selain Tim selalu disimpan kosong.

## 2026-11-14 (persiapan deploy)

### Ditambah
- Panduan `docs/06-deploy.md` untuk VPS aaPanel dan Vercel.
- `TRUST_PROXY` agar pembatas percobaan membaca IP pengunjung di belakang Nginx.
- Skrip `npm run deploy` (pasang paket, build, migrasi).

### Diubah
- `FRONTEND_ORIGIN` boleh berisi beberapa alamat dipisah koma; alamat pertama dipakai untuk tautan di email.
- `npm run build` ikut menjalankan `prisma generate`.

## 2026-11-14 (halaman Operasional dan Tim)

### Diubah
- `GET /users` menyertakan `jumlahProject` (banyak project yang pernah diikuti) untuk kartu worker.
- `GET /orders` menyertakan jumlah anggota proyek (`projects[]._count.members`) agar Operasional tahu pengajuan mana yang belum punya tim.
- `GET /projects` dan `GET /projects/:id` menyertakan `tenggatDiharapkan` dari pengajuan sebagai acuan selama target selesai belum ditetapkan; detail juga memuat `documents`.

## 2026-11-14

### Ditambah
- Pengajuan project oleh klien: kolom `judul`, dokumen pendukung (tabel `order_documents`, maksimal 5 berkas PDF, PNG, JPG, DOCX masing-masing 5 MB) lewat `POST /orders` multipart.
- Tagihan milik pesanan sesuai ERD: `POST /orders/:id/invoices` (Marketing), `GET /invoices`, `POST /invoices/:id/payments` (unggah bukti), `PATCH /payments/:id` (verifikasi). Bukti ditolak dapat diunggah ulang; bukti diterima menandai tagihan lunas.
- Unduhan berhak akses `GET /files/dokumen/:id` dan `GET /files/bukti/:id`; berkas tidak disajikan sebagai folder publik.
- `POST /auth/google`: masuk atau daftar dengan Google (ID token diperiksa ke Google).
- Tugas punya `bidang` (UI/UX, FrontEnd, BackEnd, Integrasi) dan `bobot`; progres proyek dan progres per bidang memakai rata-rata berbobot.
- `GET /orders/:id` memuat dokumen, tagihan, dan progres proyek untuk halaman Payment dan Detail klien.
- `middlewares/upload.middleware.ts` (jenis berkas diperiksa dari isi), `utils/google.ts`, migrasi `pengajuan_tagihan_bidang`.

### Diubah
- Pendaftaran cukup nama, email, WhatsApp, dan kata sandi sesuai desain Sign In.
- Persetujuan pesanan boleh dari status Baru atau Ditinjau.
- Operasional boleh membentuk proyek tanpa tim (status Persiapan); menunjuk tim mengubahnya menjadi Berjalan.

### Dihapus
- Tabel `invoice_items` dan kaitan tagihan ke proyek.

### Diperbaiki
- Baris pertama `controllers/auth.controller.ts` yang rusak karena teks tak sengaja.

## 2026-11-08

### Ditambah
- `POST /auth/register`: klien mendaftar sendiri, role selalu `KLIEN`.
- `POST /auth/forgot-password` dan `POST /auth/reset-password` dengan tabel `password_resets` dan `utils/mailer.ts`.
- `POST /auth/change-password` untuk semua role.
- `POST /orders/:id/approve` dengan nilai kesepakatan dan kolom `nilai_disepakati`.
- `PATCH /clients/:id/email` untuk Operasional; `PATCH /users/:id` dapat mengubah email.
- Migrasi `nilai_dan_reset_sandi`.
- Tes integrasi untuk pendaftaran, ganti dan lupa kata sandi, persetujuan, dan perbaikan email.

### Diubah
- `PATCH /orders/:id/status` tidak lagi menerima `DISETUJUI`.
- Pembatas percobaan pada rute auth memakai satu fungsi `limiter`.
- `docs/05-hak-akses.md` dan `docs/KEPUTUSAN.md` mencatat keputusan B-18 sampai B-26; B-14 digantikan B-18.
- Dokumen ketentuan, arsitektur, database, API, dan status mengikuti perubahan ini.

### Dihapus
- `POST /clients`: Marketing tidak lagi membuat akun klien.

## 2026-11-07

### Ditambah
- Migrasi `init` dan database `simpk` di MySQL Laragon.
- Modul akun klien, katalog (jasa dan portofolio), dan pesanan beserta alur status (REQ-F01, REQ-F02).
- 17 tes integrasi dengan MySQL: login, hak akses, kepemilikan data, status pesanan.
- Perintah `npm run test:db`.

### Diubah
- `docs/04-api.md`, `docs/STATUS.md`, `docs/01-ketentuan.md`, `docs/KEPUTUSAN.md` mengikuti modul baru.

### Ditambah
- Folder `docs/` sebagai pusat informasi backend, termasuk ketentuan, arsitektur, database, API, hak akses, status, dan catatan keputusan.
- Kerangka proyek: skema Prisma 14 model sesuai BRS, seed akun contoh empat role, login JWT, `/auth/me`, kelola akun internal.
- Middleware `auth`, `role`, `project-access`, `validate`, `error`.
- 8 tes tanpa database.

### Diubah
- `STATUS.md` diperbarui setelah commit pertama dikirim ke GitHub.
- Struktur folder mengikuti referensi backend-beasiswa: `controllers`, `routes`, `validators`, `middlewares`, `utils`, `config`.
- Seluruh kode dari JavaScript ke TypeScript mode strict.
- Backend dipisah menjadi repo sendiri; `docker-compose.yml` dipindahkan ke sini.
- zod dari versi 3 ke versi 4 karena temuan keamanan.
