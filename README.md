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

Panduan deploy ke VPS aaPanel dan Vercel ada di [docs/06-deploy.md](docs/06-deploy.md).

## Akun contoh

Dibuat oleh seed untuk pengembangan, kata sandinya mengikuti `SEED_PASSWORD`:

| Role | Email |
|---|---|
| Marketing | marketing@contoh.test |
| Operasional | operasional@contoh.test |
| Tim | tim@contoh.test |
| Klien | klien@contoh.test |

## Data demo

Untuk melihat tampilan setiap kondisi alur (UAT atau presentasi), jalankan setelah `npm run db:seed`:

```bash
npm run db:demo          # hapus data demo lama lalu isi ulang
npm run db:demo:hapus    # hapus data demo saja
```

Isinya 12 pengajuan di semua status (baru, diskusi, diterima menunggu tim, dikerjakan, selesai dengan dan tanpa ulasan, ditolak, dibatalkan), tagihan dengan bukti menunggu, diterima, dan ditolak, 6 worker dengan keahlian berbeda, dan 5 klien dummy. Sebagian dikaitkan ke `klien@contoh.test` dan `tim@contoh.test` agar langsung terlihat. Data demo ditandai nomor berawalan `DEMO-` dan email `@demo.test`, kata sandinya `SEED_PASSWORD`. Hapus data demo sebelum sistem dipakai resmi.

## Dokumentasi API (Swagger)

Buka `/api/v1/docs` (misalnya `http://localhost:4000/api/v1/docs`) atau unduh spesifikasinya di `/api/v1/openapi.json`. Sumbernya `docs/openapi.yaml`.

Secara bawaan halaman ini hanya untuk dibaca: tombol Try it out dan Authorize tidak tampil, sehingga tidak ada tempat mengetik token di halaman publik, dan token tidak pernah disimpan di peramban. Untuk mencoba endpoint dari laptop, isi `DOCS_TRY_IT=true` di `.env` lokal. Di VPS biarkan kosong atau `false`.

## Tes

```bash
npm run typecheck
npm test
```

## Menambah modul

Buat `routes/<nama>.routes.ts`, `controllers/<nama>.controller.ts`, dan `validators/<nama>.validator.ts`, lalu daftarkan di `routes/index.ts`. Setiap rute baru wajib dicatat di `docs/openapi.yaml`; `npm test` gagal bila ada rute yang belum didokumentasikan.

Klien hanya boleh menerima `catatanKlien`. Pilih kolom secara eksplisit dan jangan pernah mengirim `catatanTeknis` pada endpoint klien.
