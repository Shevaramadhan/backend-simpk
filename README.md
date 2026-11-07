# Backend SIMPK Neo Telemetri

REST API Sistem Informasi Manajemen Proyek Klien UKM Neo Telemetri Universitas Andalas.
Dibangun dengan TypeScript, Node.js, Express, Prisma, dan MySQL. Frontend: [frontend-simpk](https://github.com/Shevaramadhan/frontend-simpk).

## Menjalankan

Butuh Node.js 22 dan MySQL 8. MySQL dapat dijalankan lewat Docker:

```bash
cp .env.docker.example .env.docker   # lalu ganti nilainya
docker compose --env-file .env.docker up -d
```

Lalu:

```bash
cp .env.example .env                 # isi DATABASE_URL, JWT_SECRET, SEED_PASSWORD
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # nilai JWT_SECRET
npm install
npm run db:migrate                   # nama migrasi: init
npm run db:seed
npm run dev                          # http://localhost:4000
```

## Akun contoh

Dibuat oleh seed untuk pengembangan, kata sandinya mengikuti `SEED_PASSWORD`:

| Role | Email |
|---|---|
| Marketing | marketing@contoh.test |
| Operasional | operasional@contoh.test |
| Tim | tim@contoh.test |
| Klien | klien@contoh.test |

## Tes

```bash
npm run typecheck
npm test
```

## Menambah modul

Buat `routes/<nama>.routes.ts`, `controllers/<nama>.controller.ts`, dan `validators/<nama>.validator.ts`, lalu daftarkan di `routes/index.ts`.

Klien hanya boleh menerima `catatanKlien`. Pilih kolom secara eksplisit dan jangan pernah mengirim `catatanTeknis` pada endpoint klien.
