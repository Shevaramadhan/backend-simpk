# Kontrak API

Alamat dasar: `/api/v1`. Format respons ada di [01-ketentuan.md](01-ketentuan.md). Rute terlindungi memakai header `Authorization: Bearer <token>`.

## Sudah tersedia

Kode status umum: `400` data tidak valid, `401` belum masuk, `403` tidak berhak, `404` tidak ditemukan, `409` data sudah terdaftar.

| Metode | Alamat | Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | Publik | Memeriksa server |
| POST | `/auth/login` | Publik | Maksimal 10 percobaan per 15 menit |
| GET | `/auth/me` | Semua role | Data pengguna yang sedang masuk |
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
| POST | `/clients` | Marketing | Membuat akun dan profil klien |
| PATCH | `/clients/:id` | Marketing | Mengubah profil atau status aktif |
| POST | `/orders` | Klien, Marketing | Membuat pesanan |
| GET | `/orders` | Klien, Marketing, Operasional | Klien hanya menerima pesanan miliknya |
| GET | `/orders/:id` | Klien, Marketing, Operasional | Pesanan klien lain dijawab 404 |
| PATCH | `/orders/:id/status` | Marketing | Mengubah status pesanan |

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

Minimal satu dari `name`, `role`, `isActive`. Pengguna tidak dapat menonaktifkan atau mengubah role akunnya sendiri.

### POST /clients

```json
{
  "name": "Nama Kontak",
  "email": "klien@contoh.test",
  "password": "minimal8karakter",
  "namaInstansi": "Instansi",
  "jenisKlien": "Organisasi",
  "noWhatsapp": "08xx",
  "alamat": "Padang"
}
```

`noWhatsapp` dan `alamat` opsional. Menonaktifkan klien lewat `PATCH` juga menonaktifkan akun login-nya.

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
| DITINJAU | DISETUJUI, DITOLAK, DIBATALKAN |
| DISETUJUI | DIBATALKAN |

Perubahan di luar tabel dijawab `409`. Status `MENJADI_PROYEK` hanya diisi modul proyek.

## Rencana

Belum dibuat. Rincian ditulis saat modulnya dikerjakan. Upload gambar portofolio juga belum tersedia.

| Modul | Alamat | Kebutuhan |
|---|---|---|
| Proyek dan tim | `/projects`, `/projects/:id/members` | REQ-F03 |
| Tugas dan progres | `/projects/:id/tasks`, `/tasks/:id/updates` | REQ-F04, REQ-F05 |
| Dashboard | `/dashboard` | REQ-F06 |
| Tagihan dan pembayaran | `/invoices`, `/invoices/:id/payments`, `/payments/:id/verify` | REQ-F07 |
| Ulasan | `/projects/:id/review` | REQ-F08 |
