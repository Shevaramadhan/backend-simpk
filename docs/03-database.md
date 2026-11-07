# Database

Sumber kebenaran adalah `prisma/schema.prisma`. Dokumen ini menjelaskan maksudnya. Nilai status bersifat usulan sampai divalidasi koordinator.

## Tabel

| Model | Tabel | Fungsi |
|---|---|---|
| User | `users` | Akun semua pengguna dan role login |
| PasswordReset | `password_resets` | Tautan lupa kata sandi, hanya hash yang disimpan |
| Client | `clients` | Profil klien, satu per akun klien |
| Service | `services` | Daftar jasa dengan estimasi biaya dan waktu |
| Portfolio | `portfolios` | Contoh proyek untuk katalog |
| Order | `orders` | Pesanan dari klien |
| Project | `projects` | Proyek yang dibentuk Operasional |
| ProjectMember | `project_members` | Anggota proyek, posisi, penanda PM |
| Task | `tasks` | Tugas dan persentase penyelesaian |
| ProgressUpdate | `progress_updates` | Riwayat pembaruan tugas |
| Invoice | `invoices` | Tagihan |
| InvoiceItem | `invoice_items` | Rincian tagihan |
| Payment | `payments` | Bukti transfer dan verifikasi |
| Review | `reviews` | Rating dan ulasan klien |
| Notification | `notifications` | Pengingat email (fitur tambahan) |

## Relasi

```
User 1-1 Client 1-N Order 1-N Project
Project 1-N ProjectMember N-1 User
Project 1-N Task 1-N ProgressUpdate
Project 1-N Invoice 1-N InvoiceItem
                    1-N Payment
Project 1-1 Review
```

## Status

| Objek | Nilai |
|---|---|
| Order | BARU, DITINJAU, DISETUJUI, DITOLAK, DIBATALKAN, MENJADI_PROYEK |
| Project | PERSIAPAN, BERJALAN, DITUNDA, SELESAI, DIBATALKAN |
| Task | BELUM_DIKERJAKAN, DIKERJAKAN, REVIEW, SELESAI |
| Invoice | DRAF, DITERBITKAN, LUNAS |
| Payment | MENUNGGU_VERIFIKASI, DITERIMA, DITOLAK |

## Aturan penting

- `orders.anggaran` adalah perkiraan pemesan. `orders.nilai_disepakati` adalah harga hasil negosiasi yang diisi Marketing dan menjadi dasar nilai proyek.
- Posisi PM, FE, BE, dan lainnya disimpan di `project_members`. Role login hanya empat.
- Progres proyek dihitung dari rata-rata `tasks.persentase`, tidak disimpan di tabel `projects`.
- `catatan_teknis` dan `catatan_klien` adalah kolom terpisah pada `progress_updates`.
