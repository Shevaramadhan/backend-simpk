# Riwayat Perubahan Backend

Semua perubahan dicatat di sini, terbaru di atas. Setiap entri ditulis dalam commit yang sama dengan perubahannya.

## Format

```
## YYYY-MM-DD

### Ditambah / Diubah / Diperbaiki / Dihapus
- Apa yang berubah dan alasannya.
```

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
