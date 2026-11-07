# Dokumentasi Backend SIMPK

Folder ini adalah pusat informasi backend Sistem Informasi Manajemen Proyek Klien Neo Telemetri. Dokumen di sini menjadi dasar setiap pekerjaan. Kalau kode dan dokumen berbeda, cek kodenya, lalu perbaiki yang salah.

| Dokumen | Isi | Kapan dibaca atau diperbarui |
|---|---|---|
| [STATUS.md](STATUS.md) | Posisi pekerjaan saat ini dan langkah berikutnya | Dibaca pertama kali; diperbarui setiap selesai bekerja |
| [01-ketentuan.md](01-ketentuan.md) | Aturan penulisan kode dan cara kerja | Sebelum menulis kode |
| [02-arsitektur.md](02-arsitektur.md) | Teknologi, struktur folder, alur permintaan | Saat struktur berubah |
| [03-database.md](03-database.md) | Tabel, relasi, status data | Setiap `schema.prisma` berubah |
| [04-api.md](04-api.md) | Kontrak API | Setiap endpoint berubah |
| [05-hak-akses.md](05-hak-akses.md) | Matriks hak akses per role | Saat aturan akses berubah |
| [KEPUTUSAN.md](KEPUTUSAN.md) | Keputusan teknis beserta alasannya | Setiap ada keputusan baru |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat semua perubahan | Setiap perubahan |

Dokumentasi frontend ada di repo [frontend-simpk](https://github.com/Shevaramadhan/frontend-simpk), folder `docs/`.

## Sumber kebutuhan

Acuan fitur adalah BRS Sistem Informasi Manajemen Proyek Klien Neo Telemetri, disusun System Analyst Kelompok 5. Kode kebutuhan REQ-F01 sampai REQ-F10 dan REQ-NF01 sampai REQ-NF02 pada dokumen ini merujuk ke BRS tersebut. Fitur di luar BRS tidak dikerjakan tanpa persetujuan Project Owner.

## Aturan mencatat perubahan

Setiap perubahan dicatat dalam commit yang sama dengan perubahannya:

1. Tambahkan entri di `CHANGELOG.md`.
2. Perbarui dokumen yang terdampak.
3. Perbarui `STATUS.md` jika posisi pekerjaan berubah.
4. Tambahkan entri di `KEPUTUSAN.md` jika ada pilihan teknis baru.
