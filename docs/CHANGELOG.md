# Riwayat Perubahan Backend

Semua perubahan dicatat di sini, terbaru di atas. Setiap entri ditulis dalam commit yang sama dengan perubahannya.

## Format

```
## YYYY-MM-DD

### Ditambah / Diubah / Diperbaiki / Dihapus
- Apa yang berubah dan alasannya.
```

## 2026-11-07

### Ditambah
- Folder `docs/` sebagai pusat informasi backend, termasuk ketentuan, arsitektur, database, API, hak akses, status, dan catatan keputusan.
- Kerangka proyek: skema Prisma 14 model sesuai BRS, seed akun contoh empat role, login JWT, `/auth/me`, kelola akun internal.
- Middleware `auth`, `role`, `project-access`, `validate`, `error`.
- 8 tes tanpa database.

### Diubah
- Struktur folder mengikuti referensi backend-beasiswa: `controllers`, `routes`, `validators`, `middlewares`, `utils`, `config`.
- Seluruh kode dari JavaScript ke TypeScript mode strict.
- Backend dipisah menjadi repo sendiri; `docker-compose.yml` dipindahkan ke sini.
- zod dari versi 3 ke versi 4 karena temuan keamanan.
