# Hak Akses

Matriks dari BRS bagian 6.3, masih usulan sampai diperiksa koordinator. Keputusan PM yang menambah matriks ini dicatat di bagian Tambahan terhadap BRS dan perlu dimasukkan Ananda ke BRS.

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

## Tambahan terhadap BRS

| Hal | Aturan |
|---|---|
| Akun klien | Klien mendaftar sendiri di halaman Daftar, hasilnya selalu role Klien. Marketing tidak membuat atau mereset akun klien; Marketing hanya dapat menonaktifkan akun yang tidak jelas |
| Akun internal | Dibuat Operasional dari awal, sebelum ada proyek. Satu akun Operasional pertama disiapkan saat sistem dipasang |
| Login | Satu halaman untuk semua role; tujuan setelah masuk ditentukan role di database |
| Kata sandi | Pengguna mengganti sendiri setelah masuk, atau memakai lupa kata sandi lewat email. Tidak ada orang lain yang dapat mengatur kata sandi pengguna yang sudah ada |
| Salah email | Operasional memperbaiki alamat email, lalu pengguna mereset sendiri |
| Ringkasan untuk PM | PM melihat ringkasan progres proyek yang dipimpinnya saja, tanpa data uang |
| Tampilan klien | Klien melihat judul, status, dan persentase tugas beserta catatan klien, tanpa deskripsi tugas. Judul tugas ditulis dalam bahasa non-teknis |
| Catatan klien | Langsung tampil tanpa persetujuan; isinya diawasi PM |

## PM proyek

PM bukan role login dan bukan akun terpisah. Operasional memilih anggota dan satu PM dari akun Tim saat membentuk proyek. Anggota dengan `isPm = true` mendapat hak tambahan di proyek itu saja, diperiksa dengan `requireProjectPm`.

| Tindakan | PM dan Operasional | Anggota biasa |
|---|---|---|
| Membuat dan membagi tugas | Ya | Tidak |
| Memperbarui persentase dan catatan | Semua tugas di proyek | Tugas miliknya |

## Penerapan

| Middleware | Fungsi |
|---|---|
| `auth` | Pengguna masuk dan akunnya aktif |
| `authorize(...roles)` | Role diizinkan |
| `requireProjectAccess()` | Anggota, pemilik, atau pengurus proyek |
| `requireProjectPm()` | PM proyek atau Operasional |
