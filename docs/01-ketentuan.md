# Ketentuan Backend

## Bahasa dan alat

- Semua kode ditulis dalam TypeScript mode `strict`. Tidak ada file `.js` baru.
- Hindari `any`. Gunakan tipe dari Prisma atau `z.infer` dari validator.
- Pesan untuk pengguna ditulis dalam Bahasa Indonesia.

## Menambah modul

Satu modul terdiri atas tiga file, lalu didaftarkan di `routes/index.ts`:

```
routes/<nama>.routes.ts           URL, urutan middleware
controllers/<nama>.controller.ts  logika bisnis dan query Prisma
validators/<nama>.validator.ts    aturan input (zod) dan tipenya
```

## Keamanan

1. Setiap rute selain login dan katalog publik memakai `auth`.
2. Periksa akses berlapis: role, lalu kepemilikan atau keanggotaan proyek. Pemeriksaan di frontend tidak dihitung.
3. Data yang bukan hak pengguna dijawab 404 agar keberadaannya tidak terungkap.
4. Selalu pakai `select` eksplisit. `passwordHash` tidak boleh keluar dari API.
5. **`catatanTeknis` tidak boleh dikirim ke role Klien**, dan Marketing juga tidak menerimanya (BRS 6.3). Kebocoran ini dihitung defect Critical.
6. Setiap body divalidasi dengan middleware `validate`.
7. Unggahan dibatasi JPG, PNG, PDF, maksimal 2 MB, dan disimpan dengan nama acak.
8. Jangan commit `.env`, data klien asli, atau berkas di `uploads/`.

## Format respons

Berhasil:

```json
{ "success": true, "message": "Berhasil", "data": {} }
```

Gagal:

```json
{ "success": false, "message": "Data yang dikirim tidak valid.", "errors": { "email": ["Format email tidak valid."] } }
```

Gunakan helper `ok()` untuk respons berhasil dan lempar `ApiError` untuk error. Semua controller async meneruskan error ke `next(error)`.

## Data

- Uang memakai `Decimal`, bukan `Float`.
- Status memakai `enum` Prisma.
- Data yang sudah dipakai dinonaktifkan, bukan dihapus.
- Perubahan database selalu lewat `npm run db:migrate`, tidak diedit manual.

## Tes

- `npm test` tidak memerlukan database.
- `npm run test:db` memakai MySQL sungguhan pada database `simpk_test` dan **menghapus seluruh isinya**. Tes menolak berjalan pada nama database yang tidak berakhiran `_test`.
- Menyiapkan database tes sekali saja: buat database `simpk_test`, lalu jalankan `prisma migrate deploy` dengan `DATABASE_URL` mengarah ke sana.
- Setiap modul baru wajib punya tes untuk hak akses dan kepemilikan data.

## Git

- `main` untuk versi stabil, `dev` untuk integrasi, `feature/<nama>` untuk pekerjaan.
- Pesan commit singkat dan menjelaskan perubahannya.
- Sebelum commit: `npm run typecheck`, `npm test`, dan `npm run test:db`.
- Commit memakai akun pengembang, tanpa baris `Co-Authored-By`.
- Setiap perubahan dicatat di `docs/CHANGELOG.md`.
