# Deploy

Backend berjalan di VPS dengan aaPanel (Nginx, MySQL, proyek Node.js). Frontend di Vercel.

```
Pengunjung ──https──> Vercel (frontend)
     │
     └──https──> api.domain-anda (Nginx aaPanel) ──> Node.js :4000 ──> MySQL (lokal VPS)
                                                         └──> /www/wwwroot/simpk-data/uploads
```

## Syarat

- VPS Linux dengan aaPanel, minimal 1 GB RAM.
- Domain atau subdomain untuk API, misalnya `api.contoh.com`, yang record A-nya mengarah ke IP VPS. Frontend di Vercel memakai HTTPS, jadi API juga wajib HTTPS. Sertifikat SSL gratis dari Let's Encrypt hanya bisa dibuat untuk domain, bukan alamat IP.
- Repo `backend-simpk` dapat di-clone dari VPS (repo publik, atau deploy key bila privat).

## 1. Pasang perangkat di aaPanel

Di **App Store**, pasang **Nginx**, **MySQL 8.0**, dan **Node.js version manager**. Lewat Node.js version manager, pasang **Node.js 22**.

## 2. Database

**Databases > Add database**: nama `simpk`, pengguna `simpk`, kata sandi acak yang kuat, akses **Local server**. Port 3306 jangan dibuka di firewall.

## 3. Kode dan folder unggahan

Lewat **Terminal** aaPanel:

```bash
cd /www/wwwroot
git clone https://github.com/Shevaramadhan/backend-simpk.git simpk-backend
mkdir -p /www/wwwroot/simpk-data/uploads
cd simpk-backend
cp .env.example .env
```

Folder unggahan sengaja di luar folder kode agar tidak terhapus saat kode diperbarui.

## 4. Isi `.env`

Buka `.env` lewat **Files** aaPanel. Nilai rahasia diisi langsung di VPS dan tidak pernah di-commit.

| Variabel | Isi |
|---|---|
| `DATABASE_URL` | `mysql://simpk:KATA_SANDI@127.0.0.1:3306/simpk` |
| `JWT_SECRET` | Hasil `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | `4000` |
| `FRONTEND_ORIGIN` | Alamat Vercel, misalnya `https://simpk.vercel.app`. Bila nanti ada domain sendiri, tambahkan dengan koma; alamat pertama dipakai untuk tautan di email |
| `TRUST_PROXY` | `1` |
| `UPLOAD_DIR` | `/www/wwwroot/simpk-data/uploads` |
| `SEED_PASSWORD` | Kata sandi akun contoh, hanya bila seed dijalankan |
| `SMTP_*`, `MAIL_FROM` | Akun email pengirim. Tanpa ini tautan lupa kata sandi tidak terkirim |
| `GOOGLE_CLIENT_ID` | OAuth Client ID; kosongkan bila login Google belum dipakai |

## 5. Build dan migrasi

```bash
npm run deploy      # npm ci, prisma generate, tsc, prisma migrate deploy
npm run db:seed     # sekali saja, membuat akun contoh untuk UAT
```

Setelah UAT, buat akun Operasional asli lewat menu Pengguna, lalu nonaktifkan akun `@contoh.test`.

## 6. Jalankan sebagai proyek Node

**Website > Node project > Add Node project**:

| Isian | Nilai |
|---|---|
| Project directory | `/www/wwwroot/simpk-backend` |
| Run command / script | `npm start` (menjalankan `node dist/index.js`) |
| Port | `4000` |
| Node version | 22 |
| Domain | `api.domain-anda` |

Centang mulai otomatis saat server menyala. Port 4000 jangan dibuka di firewall; pengunjung masuk lewat Nginx.

## 7. SSL dan batas unggahan

1. Pada proyek tersebut, buka **SSL > Let's Encrypt**, terbitkan sertifikat, lalu aktifkan **Force HTTPS**.
2. Buka **Config** (konfigurasi Nginx) dan tambahkan di dalam blok `server`:

   ```nginx
   client_max_body_size 30m;
   ```

   Bawaan Nginx hanya 1 MB, sedangkan pengajuan boleh membawa 5 dokumen masing-masing 5 MB.

3. Uji: `https://api.domain-anda/api/v1/health` harus menjawab `{"success":true,...}`.

## 8. Frontend di Vercel

1. **Add New > Project**, impor repo `frontend-simpk`. Pengaturan build terbaca dari `vercel.json`.
2. **Environment Variables**:
   - `VITE_API_URL` = `https://api.domain-anda/api/v1`
   - `VITE_GOOGLE_CLIENT_ID` = sama dengan `GOOGLE_CLIENT_ID` backend (boleh kosong)
3. Deploy. Salin alamat yang diberikan Vercel ke `FRONTEND_ORIGIN` di `.env` VPS, lalu mulai ulang proyek Node.

Variabel `VITE_*` dibaca saat build, jadi setiap perubahannya perlu **Redeploy** di Vercel.

## Memperbarui

- Frontend: push ke GitHub, Vercel membangun ulang otomatis.
- Backend: push ke GitHub, lalu di Terminal VPS:

  ```bash
  cd /www/wwwroot/simpk-backend && git pull && npm run deploy
  ```

  dan **Restart** proyek Node di aaPanel. Migrasi baru ikut dijalankan oleh `npm run deploy`.

## Cadangan

Atur **Cron** aaPanel untuk mencadangkan database `simpk` dan folder `/www/wwwroot/simpk-data/uploads` setiap hari. Berkas unggahan tidak tersimpan di database, jadi keduanya harus dicadangkan.

## Jika bermasalah

| Gejala | Penyebab umum |
|---|---|
| Halaman login menampilkan galat jaringan | `VITE_API_URL` salah, atau API belum HTTPS |
| Galat CORS di konsol browser | `FRONTEND_ORIGIN` tidak sama persis dengan alamat Vercel (tanpa garis miring di akhir) |
| Unggah dokumen gagal dengan 413 | `client_max_body_size` belum ditambahkan |
| Semua pengunjung cepat terkena "Terlalu banyak percobaan" | `TRUST_PROXY` belum diisi 1 |
| Membuka `/portal` langsung di Vercel menampilkan 404 | `vercel.json` tidak ikut ter-deploy |
| Log proyek: `Variabel lingkungan ... belum diisi` | `.env` belum lengkap |
