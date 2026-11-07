# Hak Akses

Matriks dari BRS bagian 6.3, masih usulan sampai diperiksa koordinator.

K = kelola, L = lihat, M = hanya miliknya atau yang ditugaskan, - = tidak ada akses.

| Modul | Klien | Marketing | Operasional | Tim |
|---|---|---|---|---|
| Daftar jasa dan portofolio | L | K | L | L |
| Pesanan proyek | M (kirim) | K | L | - |
| Pembentukan tim dan penugasan | - | L | K | M (lihat) |
| Progres: catatan teknis | - | - | K | M (ubah) |
| Progres: catatan untuk klien | M (lihat) | L | K | M (ubah) |
| Tagihan dan pembayaran | M (lihat, unggah bukti) | K | L | - |
| Ringkasan proyek dan uang masuk | - | L | L | - |
| Penilaian dan ulasan | M (kelola) | L | L | - |
| Pengguna dan jenis pengguna | - | - | K | - |

## PM proyek

PM bukan role login. Anggota dengan `isPm = true` pada sebuah proyek mendapat hak tambahan di proyek itu saja. Hak ini diperiksa dengan `requireProjectPm`. BRS menyebut PM dan Tim dapat membagi tugas, sehingga rincian hak PM dibanding anggota biasa perlu dipastikan saat modul tugas dibuat.

## Penerapan

| Middleware | Fungsi |
|---|---|
| `auth` | Pengguna masuk dan akunnya aktif |
| `authorize(...roles)` | Role diizinkan |
| `requireProjectAccess()` | Anggota, pemilik, atau pengurus proyek |
| `requireProjectPm()` | PM proyek atau Operasional |
