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

## Rencana

Belum dibuat. Rincian ditulis saat modulnya dikerjakan.

| Modul | Alamat | Kebutuhan |
|---|---|---|
| Katalog | `/services`, `/portfolios` | REQ-F01 |
| Pesanan | `/orders` | REQ-F02 |
| Proyek dan tim | `/projects`, `/projects/:id/members` | REQ-F03 |
| Tugas dan progres | `/projects/:id/tasks`, `/tasks/:id/updates` | REQ-F04, REQ-F05 |
| Dashboard | `/dashboard` | REQ-F06 |
| Tagihan dan pembayaran | `/invoices`, `/invoices/:id/payments`, `/payments/:id/verify` | REQ-F07 |
| Ulasan | `/projects/:id/review` | REQ-F08 |
