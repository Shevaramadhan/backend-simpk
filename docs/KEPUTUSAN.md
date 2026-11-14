# Catatan Keputusan

Keputusan teknis beserta alasannya, supaya tidak dibahas ulang. Keputusan yang berubah tidak dihapus, tetapi ditandai digantikan.

Format: nomor, tanggal, keputusan, alasan, status.

| No | Tanggal | Keputusan | Alasan | Status |
|---|---|---|---|---|
| B-01 | 1 Nov 2026 | Node.js, Express, MySQL | Pilihan tim | Berlaku |
| B-02 | 1 Nov 2026 | Prisma sebagai ORM | Skema terpusat, migrasi, dan seed memudahkan perubahan setelah validasi | Berlaku |
| B-03 | 7 Nov 2026 | Mengikuti struktur folder backend-beasiswa, tanpa Redis dan Fonnte | Rapi dan jelas; Redis dan bot WhatsApp di luar BRS | Berlaku |
| B-04 | 7 Nov 2026 | Logika bisnis di controller, tanpa lapisan service | Mengikuti struktur referensi dan lebih sederhana | Berlaku |
| B-05 | 7 Nov 2026 | TypeScript mode strict | Keputusan pengembang; kesalahan tertangkap saat build | Berlaku |
| B-06 | 7 Nov 2026 | Backend dan frontend dua repo terpisah | Repo sudah disiapkan di GitHub | Berlaku |
| B-07 | 7 Nov 2026 | Empat role login; posisi proyek di `project_members` | BRS 9.1: PM ditunjuk per proyek | Berlaku |
| B-08 | 7 Nov 2026 | Progres proyek = rata-rata persentase tugas | Memenuhi BRS (Tim mengisi persentase) tanpa angka proyek yang diisi manual | Digantikan B-29 |
| B-09 | 7 Nov 2026 | Proyek 1-N tagihan, tagihan 1-N pembayaran | BRS mewajibkan tagihan PDF; aman jika skema DP atau termin dipakai | Berlaku |
| B-10 | 7 Nov 2026 | Catatan teknis dan catatan klien kolom terpisah per update tugas | Mengikuti BRS 9.2 dan mudah memilih kolom untuk klien | Berlaku |
| B-11 | 7 Nov 2026 | Tetap Prisma 6 | Temuan `npm audit` tersisa ada di CLI Prisma; perbaikannya butuh Prisma 7 yang berisi perubahan besar | Berlaku, ditinjau setelah proyek |
| B-12 | 7 Nov 2026 | zod 4 | Memperbaiki kerentanan pada zod 3 yang memproses input pengguna | Berlaku |
| B-13 | 7 Nov 2026 | Riwayat aktivitas tidak dibuat | Tidak ada di BRS | Berlaku |
| B-14 | 7 Nov 2026 | Akun klien dibuatkan Marketing, belum ada pendaftaran mandiri | Isu terbuka BRS; lebih aman tanpa pendaftaran publik dan mudah ditambah | Digantikan B-18 |
| B-15 | 7 Nov 2026 | Nomor pesanan `ORD-YYYYMMDD-XXXXXX` dengan akhiran acak | Tidak perlu penghitung dan tidak mengungkap jumlah pesanan | Berlaku |
| B-16 | 7 Nov 2026 | Tes integrasi memakai database terpisah `simpk_test` | Tes menghapus data, sehingga data pengembangan harus terpisah | Berlaku |
| B-17 | 7 Nov 2026 | MySQL lokal memakai Laragon yang sudah terpasang | Sudah tersedia di laptop pengembang; `docker-compose.yml` tetap untuk yang tidak memakai Laragon | Berlaku |
| B-18 | 8 Nov 2026 | Klien mendaftar sendiri, lalu memesan setelah login; hasil pendaftaran selalu role Klien | Masukan tim. Kata sandi dibuat klien sendiri, pesanan selalu punya pemilik, dan klien memantau sejak memesan. Menggantikan rencana pesanan tanpa login yang tidak jadi dirilis | Berlaku, sampaikan ke Koordinator Marketing |
| B-19 | 8 Nov 2026 | Kolom `nilai_disepakati` pada pesanan, diisi Marketing saat menyetujui | BRS 9.2 memuat nilai pesanan; harga disepakati Marketing, proyek dibuat Operasional | Berlaku |
| B-20 | 8 Nov 2026 | Persetujuan pesanan lewat endpoint sendiri, bukan perubahan status biasa | Pesanan tidak boleh disetujui tanpa nilai | Berlaku |
| B-21 | 8 Nov 2026 | Setiap pengguna dapat mengganti kata sandi sendiri | Akun internal memakai kata sandi awal dari Operasional | Berlaku |
| B-22 | 8 Nov 2026 | Lupa kata sandi lewat tautan email 30 menit sekali pakai; Marketing tidak dapat mereset | Keputusan PM. Jika Marketing dapat mereset, Marketing dapat masuk ke akun klien | Berlaku, butuh akun email pengirim sebelum UAT |
| B-23 | 8 Nov 2026 | Operasional memperbaiki email yang salah ketik; tautan reset lama dibatalkan | Pengelola pengguna pada matriks 6.3, dan tetap tidak melihat kata sandi | Berlaku |
| B-24 | 8 Nov 2026 | Tugas dibuat dan dibagi PM atau Operasional; anggota memperbarui tugas miliknya | Keputusan PM; memperjelas "PM/Tim" pada BRS | Berlaku |
| B-25 | 8 Nov 2026 | PM melihat ringkasan progres proyeknya tanpa data uang | Keputusan PM; menyelesaikan perbedaan BRS 7.1 dan matriks 6.3 | Berlaku, perlu dicatat di BRS |
| B-26 | 8 Nov 2026 | Klien melihat judul, status, dan persen tugas tanpa deskripsi; catatan klien tampil tanpa persetujuan | Keputusan PM; BRS 7.1 meminta status task dan waktu proyek terbatas | Berlaku |
| B-27 | 14 Nov 2026 | Diagram di `10_Ketentuan_Sistem` (use case, ERD, BPMN 1 sampai 3) menjadi acuan alur dan data | Keputusan PM; sejalan dengan BRS | Berlaku |
| B-28 | 14 Nov 2026 | Tagihan milik pesanan dan diterbitkan manual oleh Marketing; skema DP lalu pelunasan = dua tagihan | ERD dan BPMN 3; skema pembayaran final dibahas kemudian | Berlaku sementara |
| B-29 | 14 Nov 2026 | Progres = rata-rata berbobot persentase tugas, juga per bidang UI/UX, FrontEnd, BackEnd, Integrasi | Keputusan PM menggabungkan bobot ERD dan tampilan Detail di Figma; menggantikan B-08 | Berlaku, ERD perlu ditambah kolom bidang dan persentase |
| B-30 | 14 Nov 2026 | Kolom pesanan `judul` dan tabel dokumen pendukung ditambahkan di luar ERD | Diminta form pengajuan Figma | Berlaku, ERD perlu diperbarui |
| B-31 | 14 Nov 2026 | Login Google: email baru menjadi Klien, email yang sudah ada masuk sesuai role | Keputusan PM; Facebook tidak dipakai | Berlaku, butuh OAuth Client ID |
| B-32 | 14 Nov 2026 | Berkas unggahan diperiksa dari isinya dan hanya dapat diunduh lewat API berhak akses | Mencegah berkas berbahaya dan kebocoran bukti transfer | Berlaku |
| B-36 | 14 Nov 2026 | Tagihan dapat diubah atau dibatalkan (status `DIBATALKAN`, tidak dihapus) selama belum ada bukti diterima atau sedang diperiksa | Memperbaiki salah terbit tanpa mengubah catatan keuangan yang sudah dikonfirmasi | Berlaku, ERD perlu diperbarui |
| B-35 | 14 Nov 2026 | Identitas dan rekening Neo Telemetri untuk tagihan disimpan di tabel `pengaturan` dan diubah Marketing; sebelum diisi, tagihan memakai data contoh dengan peringatan | Rekening dapat berganti tiap kepengurusan tanpa mengubah kode; PM meminta data dummy dulu | Berlaku, ERD perlu diperbarui |
| B-34 | 14 Nov 2026 | Kartu Keuntungan di Dashboard Marketing = total pembayaran yang sudah diverifikasi | Sistem hanya mencatat uang masuk, tidak mencatat biaya; dipilih PM | Berlaku |
| B-33 | 14 Nov 2026 | Kolom `users.keahlian` (teks bebas, satu keahlian utama) untuk akun Tim; role tetap Tim sesuai BRS | Anggota Neo Telemetri punya keahlian tetap (Frontend, Backend, UI/UX, dan lainnya); dipakai untuk saringan Pilih Worker | Berlaku, ERD perlu diperbarui |
