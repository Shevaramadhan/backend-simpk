# Arsitektur Backend

## Teknologi

| Bagian | Pilihan |
|---|---|
| Bahasa | TypeScript, Node.js 22 |
| Web | Express 4 |
| Database | MySQL 8 lewat Prisma 6 |
| Login | JWT HS256, berlaku 8 jam; bcrypt untuk kata sandi |
| Validasi | zod 4 |
| Keamanan HTTP | helmet, CORS satu origin, pembatasan percobaan login |
| Tes | `node:test` dan supertest |

## Struktur folder

```
backend/
├── config/          env.ts (membaca dan memeriksa variabel), prisma.ts (satu client)
├── controllers/     logika bisnis per modul
├── docs/            dokumentasi ini
├── middlewares/     auth, role, project-access, validate, error
├── prisma/          schema.prisma, migrasi, seed.ts
├── routes/          index.ts dan rute per modul
├── tests/           tes otomatis
├── types/           perluasan tipe Express (req.user, req.projectId)
├── uploads/         berkas unggahan, tidak masuk Git
├── utils/           ApiError, response, jwt, password, progress
├── validators/      skema zod per modul
├── app.ts           menyusun aplikasi Express
└── index.ts         titik masuk server
```

## Alur permintaan

```
Permintaan
  → helmet, cors, express.json
  → routes/index.ts (/api/v1)
  → auth.middleware        token valid dan akun masih aktif (dicek ke database)
  → role.middleware        role diizinkan
  → project-access         anggota atau pemilik proyek, jika rutenya per proyek
  → validate.middleware    isi permintaan sesuai validator
  → controller             logika bisnis lewat Prisma
  → ok() atau error.middleware
```

## Variabel lingkungan

Lihat `.env.example`. Server berhenti saat mulai jika `DATABASE_URL` atau `JWT_SECRET` kosong, atau `JWT_SECRET` kurang dari 32 karakter.
