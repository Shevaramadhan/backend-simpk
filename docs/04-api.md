# Kontrak API

Alamat dasar: `/api/v1`. Format respons ada di [01-ketentuan.md](01-ketentuan.md). Rute terlindungi memakai header `Authorization: Bearer <token>`.

## Sudah tersedia

Kode status umum: `400` data tidak valid, `401` belum masuk, `403` tidak berhak, `404` tidak ditemukan, `409` data sudah terdaftar.

| Metode | Alamat | Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | Publik | Memeriksa server |
| POST | `/auth/login` | Publik | Maksimal 10 percobaan per 15 menit |
| POST | `/auth/register` | Publik | Pendaftaran akun Klien, maksimal 10 per jam |
| POST | `/auth/forgot-password` | Publik | Mengirim tautan reset, maksimal 5 per 15 menit |
| POST | `/auth/reset-password` | Publik | Membuat kata sandi baru dari tautan |
| GET | `/auth/me` | Semua role | Data pengguna yang sedang masuk |
| POST | `/auth/change-password` | Semua role | Mengganti kata sandi sendiri |
| GET | `/users` | Operasional | Daftar akun internal |
| POST | `/users` | Operasional | Membuat akun internal |
| PATCH | `/users/:id` | Operasional | Mengubah nama, role, status aktif |
| GET | `/services` | Publik | Jasa yang ditampilkan |
| GET | `/services/all` | Marketing | Semua jasa, termasuk yang disembunyikan |
| POST | `/services` | Marketing | Menambah jasa |
| PUT | `/services/:id` | Marketing | Mengubah jasa; sembunyikan dengan `isVisible: false` |
| GET | `/portfolios` | Publik | Portofolio, kecuali milik jasa tersembunyi |
| GET | `/portfolios/all` | Marketing | Semua portofolio |
| POST | `/portfolios` | Marketing | Menambah portofolio |
| PUT | `/portfolios/:id` | Marketing | Mengubah portofolio |
| DELETE | `/portfolios/:id` | Marketing | Menghapus portofolio |
| GET | `/clients` | Marketing, Operasional | Daftar klien |
| PATCH | `/clients/:id` | Marketing | Mengubah profil atau status aktif |
| PATCH | `/clients/:id/email` | Operasional | Memperbaiki email klien |
| POST | `/orders` | Klien, Marketing | Membuat pesanan |
| GET | `/orders` | Klien, Marketing, Operasional | Klien hanya menerima pesanan miliknya |
| GET | `/orders/:id` | Klien, Marketing, Operasional | Pesanan klien lain dijawab 404 |
| PATCH | `/orders/:id/status` | Marketing | Mengubah status pesanan |
| POST | `/orders/:id/approve` | Marketing | Menyetujui pesanan dengan nilai kesepakatan |

### POST /auth/login

Permintaan:

```json
{ "email": "operasional@contoh.test", "password": "kata-sandi" }
```

Jawaban `200`:

```json
{
  "success": true,
  "message": "Berhasil masuk.",
  "data": {
    "token": "<jwt>",
    "user": { "id": 2, "name": "Contoh Operasional", "email": "operasional@contoh.test", "role": "OPERASIONAL" }
  }
}
```

Email salah, kata sandi salah, dan akun nonaktif dijawab sama: `401 Email atau kata sandi salah.`

### POST /users

```json
{ "name": "Nama", "email": "nama@contoh.test", "password": "minimal8karakter", "role": "TIM" }
```

`role` hanya `MARKETING`, `OPERASIONAL`, atau `TIM`.

### PATCH /users/:id

Minimal satu dari `name`, `email`, `role`, `isActive`. Pengguna tidak dapat menonaktifkan atau mengubah role akunnya sendiri.

### POST /auth/register

```json
{
  "name": "Nama Kontak",
  "email": "klien@contoh.test",
  "password": "minimal8karakter",
  "namaInstansi": "Instansi",
  "jenisKlien": "Organisasi",
  "noWhatsapp": "081234567890"
}
```

Semua kolom wajib. Akun selalu menjadi `KLIEN`; kolom `role` pada permintaan diabaikan. Jawabannya sama seperti login, sehingga klien langsung masuk.

### POST /auth/change-password

```json
{ "passwordLama": "kata sandi saat ini", "passwordBaru": "minimal8karakter" }
```

Kata sandi lama yang salah dijawab `400`, bukan `401`, agar sesi tetap berjalan. Token yang sudah terbit tetap berlaku sampai masa berlakunya habis.

### POST /auth/forgot-password

```json
{ "email": "klien@contoh.test" }
```

Jawaban selalu `200` dan sama, baik email terdaftar maupun tidak. Tautan dikirim ke email, berlaku 30 menit, dan hanya tautan terbaru yang berlaku.

### POST /auth/reset-password

```json
{ "token": "64 karakter dari tautan", "passwordBaru": "minimal8karakter" }
```

Tautan salah, kedaluwarsa, atau sudah dipakai dijawab `400`.

### PATCH /clients/:id/email

```json
{ "email": "benar@contoh.test" }
```

Untuk email yang salah ketik saat mendaftar. Tautan reset yang belum dipakai ikut dibatalkan. `PATCH /users/:id` melakukan hal yang sama untuk akun internal.

### PATCH /clients/:id

Menonaktifkan klien juga menonaktifkan akun login-nya.

### POST /orders

```json
{ "serviceId": 1, "kebutuhan": "Minimal 10 karakter", "anggaran": 2000000, "tenggatDiharapkan": "2026-12-31" }
```

Hanya `kebutuhan` yang wajib. Marketing wajib mengirim `clientId`. Untuk Klien, `clientId` diabaikan dan selalu memakai profilnya sendiri. Jasa tersembunyi tidak dapat dipesan.

### PATCH /orders/:id/status

```json
{ "status": "DITOLAK", "alasanDitolak": "Wajib jika DITOLAK" }
```

| Dari | Boleh menjadi |
|---|---|
| BARU | DITINJAU, DITOLAK, DIBATALKAN |
| DITINJAU | DITOLAK, DIBATALKAN |
| DISETUJUI | DIBATALKAN |

Perubahan di luar tabel dijawab `409`. Status `DISETUJUI` hanya lewat `POST /orders/:id/approve`, dan `MENJADI_PROYEK` hanya diisi modul proyek.

### POST /orders (pengajuan klien)

Klien mengirim `multipart/form-data`: `judul`, `kebutuhan`, `anggaran` (opsional), `tenggatDiharapkan` (opsional), dan sampai 5 berkas `dokumen` (PDF, PNG, JPG, DOCX, masing-masing maksimal 5 MB). Jenis berkas diperiksa dari isinya. Marketing tetap dapat mengirim JSON dengan `clientId`.

### GET /orders/:id

Selain data pesanan, memuat `documents`, `invoices` beserta `payments`, dan `project` (`progres`, `progresBidang`). Catatan teknis tidak pernah ikut.

### POST /orders/:id/invoices

Marketing, untuk pesanan Disetujui atau Menjadi Proyek.

```json
{ "keterangan": "DP 50%", "total": 4000000, "jatuhTempo": "2026-11-30" }
```

### POST /invoices/:id/payments

Klien pemilik tagihan, `multipart/form-data`: `jumlah`, `tglTransfer`, berkas `bukti` (PDF, PNG, JPG, maksimal 2 MB). Ditolak `409` bila tagihan lunas atau masih ada bukti yang menunggu diperiksa.

### PATCH /payments/:id

Marketing. `{ "status": "DITERIMA" }` menandai tagihan lunas; `{ "status": "DITOLAK", "alasanDitolak": "..." }` membuat klien dapat mengunggah ulang.

### GET /files/dokumen/:id dan GET /files/bukti/:id

Unduhan berhak akses. Dokumen: klien pemilik, Marketing, Operasional, dan anggota tim proyek terkait. Bukti: klien pemilik, Marketing, Operasional. Selain itu `404`.

### POST /auth/google

```json
{ "credential": "ID token dari tombol Google" }
```

Email baru menjadi akun Klien (`201`); email terdaftar masuk sesuai role (`200`). Email yang belum diverifikasi Google ditolak `401`. Tanpa `GOOGLE_CLIENT_ID` dijawab `503`.

### POST /orders/:id/approve

```json
{ "nilaiDisepakati": 2500000 }
```

Hanya untuk pesanan berstatus `DITINJAU`, dilakukan setelah MoU disepakati.

## Rencana

Belum dibuat. Rincian ditulis saat modulnya dikerjakan. Upload gambar portofolio juga belum tersedia.

| Modul | Alamat | Kebutuhan |
|---|---|---|
| Proyek dan tim | `/projects`, `/projects/:id/members` | REQ-F03 |
| Tugas dan progres | `/projects/:id/tasks`, `/tasks/:id/updates` | REQ-F04, REQ-F05 |
| Dashboard | `/dashboard` | REQ-F06 |
| Tagihan dan pembayaran | `/invoices`, `/invoices/:id/payments`, `/payments/:id/verify` | REQ-F07 |
| Ulasan | `/projects/:id/review` | REQ-F08 |
