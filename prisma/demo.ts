// Data contoh (dummy) untuk melihat tampilan setiap kondisi alur SIMPK, misalnya saat UAT atau presentasi.
//   npm run db:demo        hapus data demo lama lalu isi ulang
//   npm run db:demo:hapus  hapus data demo saja
// Penanda: nomor pesanan, tagihan, dan proyek berawalan DEMO-, akun dummy beremail @demo.test.
// Sebagian data dikaitkan ke akun contoh dari seed (klien@contoh.test, tim@contoh.test, marketing@contoh.test)
// agar langsung terlihat saat login dengan akun itu. Jalankan `npm run db:seed` lebih dulu.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient, type OrderStatus, type ProjectStatus, type TaskBidang } from '@prisma/client';

const prisma = new PrismaClient();
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const DEMO = 'DEMO-';

const hariLalu = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hariLagi = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const kode = (prefix: string) => `${DEMO}${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;

// Berkas kecil yang valid agar tombol buka dokumen dan bukti transfer berfungsi.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
function pdf(judul: string) {
  const isi = `BT /F1 18 Tf 72 720 Td (${judul.replace(/[()\\]/g, '')}) Tj ET`;
  return Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
      `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n` +
      `4 0 obj<</Length ${isi.length}>>stream\n${isi}\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`,
  );
}
async function simpan(folder: 'dokumen' | 'bukti', ext: string, data: Buffer) {
  const relatif = `${folder}/demo-${randomBytes(12).toString('hex')}.${ext}`;
  await mkdir(path.join(uploadDir, folder), { recursive: true });
  await writeFile(path.join(uploadDir, relatif), data);
  return { path: relatif, ukuran: data.length };
}

async function hapus() {
  const orders = await prisma.order.findMany({
    where: { OR: [{ nomor: { startsWith: DEMO } }, { client: { user: { email: { endsWith: '@demo.test' } } } }] },
    select: { id: true, documents: { select: { path: true } }, invoices: { select: { payments: { select: { fileBukti: true } } } } },
  });
  const ids = orders.map((o) => o.id);
  const files = orders.flatMap((o) => [...o.documents.map((d) => d.path), ...o.invoices.flatMap((i) => i.payments.map((p) => p.fileBukti))]);
  const projectIds = (await prisma.project.findMany({ where: { orderId: { in: ids } }, select: { id: true } })).map((p) => p.id);
  const demoUsers = (await prisma.user.findMany({ where: { email: { endsWith: '@demo.test' } }, select: { id: true } })).map((u) => u.id);

  await prisma.$transaction([
    prisma.progressUpdate.deleteMany({ where: { OR: [{ task: { projectId: { in: projectIds } } }, { authorId: { in: demoUsers } }] } }),
    prisma.task.updateMany({ where: { assigneeId: { in: demoUsers } }, data: { assigneeId: null } }),
    prisma.review.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
    prisma.projectMember.deleteMany({ where: { userId: { in: demoUsers } } }),
    prisma.payment.deleteMany({ where: { invoice: { orderId: { in: ids } } } }),
    prisma.invoice.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.order.deleteMany({ where: { id: { in: ids } } }),
    prisma.passwordReset.deleteMany({ where: { userId: { in: demoUsers } } }),
    prisma.client.deleteMany({ where: { userId: { in: demoUsers } } }),
    prisma.user.deleteMany({ where: { id: { in: demoUsers } } }),
  ]);
  for (const relatif of files) {
    const full = path.resolve(uploadDir, relatif);
    if (full.startsWith(uploadDir + path.sep)) await unlink(full).catch(() => {});
  }
  console.log(`Data demo dihapus: ${ids.length} pesanan, ${projectIds.length} proyek, ${demoUsers.length} akun, ${files.length} berkas.`);
}

type TugasDemo = { judul: string; bidang: TaskBidang; bobot: number; persen: number; oleh: number | null; tenggat?: Date; klien?: string; teknis?: string };
type BayarDemo = { keterangan: string; total: number; terbit: number; bayar?: { hari: number; status: 'MENUNGGU_VERIFIKASI' | 'DITERIMA' | 'DITOLAK'; alasan?: string } };

async function isi() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) throw new Error('Isi SEED_PASSWORD (minimal 8 karakter) di file .env.');
  const marketing = await prisma.user.findUnique({ where: { email: 'marketing@contoh.test' } });
  const timContoh = await prisma.user.findUnique({ where: { email: 'tim@contoh.test' } });
  const klienContoh = await prisma.client.findFirst({ where: { user: { email: 'klien@contoh.test' } } });
  if (!marketing || !timContoh || !klienContoh) throw new Error('Akun contoh belum ada. Jalankan `npm run db:seed` lebih dulu.');
  const service = await prisma.service.findFirst({ where: { isVisible: true }, select: { id: true } });
  const passwordHash = await bcrypt.hash(password, 12);

  // Worker dengan keahlian berbeda agar saringan Pilih Worker terlihat.
  const workerData = [
    ['Rizky Pratama', 'rizky@demo.test', 'UI/UX Designer'],
    ['Nadia Putri', 'nadia@demo.test', 'Frontend Developer'],
    ['Fajar Hidayat', 'fajar@demo.test', 'Backend Developer'],
    ['Dimas Saputra', 'dimas@demo.test', 'Fullstack Developer'],
    ['Salsabila Rahma', 'salsa@demo.test', 'Frontend Developer'],
    ['Aulia Zahra', 'aulia@demo.test', 'UI/UX Designer'],
  ] as const;
  const w: Record<string, number> = {};
  for (const [name, email, keahlian] of workerData) {
    w[email.split('@')[0]] = (await prisma.user.create({ data: { name, email, keahlian, role: 'TIM', passwordHash } })).id;
  }
  w.tim = timContoh.id;

  const klienData = [
    ['Andi Saputra', 'andi@demo.test', 'HIMA Teknik Komputer', 'Organisasi', '081266001122'],
    ['Rina Marlina', 'rina@demo.test', 'Kopi Nagari', 'Perusahaan', '082170003344'],
    ['Budi Santoso', 'budi@demo.test', 'Lab Sistem Tertanam', 'Instansi', '085263005566'],
    ['Sari Wulandari', 'sari@demo.test', 'CV Minang Digital', 'Perusahaan', '081374007788'],
    ['Yoga Pratama', 'yoga@demo.test', 'Yoga Pratama', 'Perorangan', '089612009900'],
  ] as const;
  const k: Record<string, number> = { contoh: klienContoh.id };
  for (const [name, email, namaInstansi, jenisKlien, noWhatsapp] of klienData) {
    const user = await prisma.user.create({ data: { name, email, role: 'KLIEN', passwordHash } });
    k[email.split('@')[0]] = (await prisma.client.create({ data: { userId: user.id, namaInstansi, jenisKlien, noWhatsapp } })).id;
  }

  async function pesanan(o: {
    klien: number;
    judul: string;
    kebutuhan: string;
    anggaran: number;
    nilai?: number;
    tenggat: Date;
    status: OrderStatus;
    dibuat: number;
    alasan?: string;
    dokumen?: string[];
    tagihan?: BayarDemo[];
    proyek?: { status: ProjectStatus; mulai: number; target: Date; selesai?: number; tim: [number, string, boolean][]; tugas: TugasDemo[]; ulasan?: [number, string] };
  }) {
    const order = await prisma.order.create({
      data: {
        nomor: kode('ORD'),
        judul: o.judul,
        clientId: o.klien,
        serviceId: service?.id,
        kebutuhan: o.kebutuhan,
        anggaran: o.anggaran,
        nilaiDisepakati: o.nilai,
        tenggatDiharapkan: o.tenggat,
        status: o.status,
        alasanDitolak: o.alasan,
        createdAt: hariLalu(o.dibuat),
      },
    });
    for (const nama of o.dokumen ?? []) {
      const ext = nama.endsWith('.png') ? 'png' : 'pdf';
      const berkas = await simpan('dokumen', ext, ext === 'png' ? PNG : pdf(nama));
      // Dokumen pengajuan diunggah klien pemilik pesanan.
      const { userId } = await prisma.client.findUniqueOrThrow({ where: { id: o.klien }, select: { userId: true } });
      await prisma.orderDocument.create({
        data: { orderId: order.id, namaFile: nama, path: berkas.path, mime: ext === 'png' ? 'image/png' : 'application/pdf', ukuran: berkas.ukuran, uploadedById: userId },
      });
    }
    for (const t of o.tagihan ?? []) {
      const lunas = t.bayar?.status === 'DITERIMA';
      const invoice = await prisma.invoice.create({
        data: { nomor: kode('INV'), orderId: order.id, issuedById: marketing!.id, keterangan: t.keterangan, total: t.total, tglTerbit: hariLalu(t.terbit), jatuhTempo: hariLalu(t.terbit - 14), status: lunas ? 'LUNAS' : 'DITERBITKAN' },
      });
      if (t.bayar) {
        const berkas = await simpan('bukti', 'png', PNG);
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            jumlah: t.total,
            tglTransfer: hariLalu(t.bayar.hari),
            fileBukti: berkas.path,
            statusVerifikasi: t.bayar.status,
            alasanDitolak: t.bayar.alasan,
            verifiedById: t.bayar.status === 'MENUNGGU_VERIFIKASI' ? null : marketing!.id,
            verifiedAt: t.bayar.status === 'MENUNGGU_VERIFIKASI' ? null : hariLalu(Math.max(t.bayar.hari - 1, 0)),
            createdAt: hariLalu(t.bayar.hari),
          },
        });
      }
    }
    if (o.proyek) {
      const p = o.proyek;
      const project = await prisma.project.create({
        data: {
          kode: kode('PRJ'),
          orderId: order.id,
          nama: o.judul,
          nilai: o.nilai ?? o.anggaran,
          tglMulai: hariLalu(p.mulai),
          targetSelesai: p.target,
          status: p.status,
          createdAt: hariLalu(p.mulai),
          updatedAt: hariLalu(p.selesai ?? 0),
          members: { create: p.tim.map(([userId, posisi, isPm]) => ({ userId, posisi, isPm })) },
        },
      });
      for (const [index, t] of p.tugas.entries()) {
        const task = await prisma.task.create({
          data: {
            projectId: project.id,
            judul: t.judul,
            bidang: t.bidang,
            bobot: t.bobot,
            assigneeId: t.oleh,
            tenggat: t.tenggat,
            persentase: t.persen,
            status: t.persen === 0 ? 'BELUM_DIKERJAKAN' : t.persen === 100 ? 'SELESAI' : 'DIKERJAKAN',
            createdAt: hariLalu(p.mulai),
          },
        });
        if (t.persen > 0 && t.oleh) {
          await prisma.progressUpdate.create({
            data: {
              taskId: task.id,
              authorId: t.oleh,
              persentase: t.persen,
              catatanKlien: t.klien ?? null,
              catatanTeknis: t.teknis ?? null,
              createdAt: hariLalu(Math.max((p.selesai ?? 0) + p.tugas.length - index, 0)),
            },
          });
        }
      }
      if (p.ulasan) {
        await prisma.review.create({ data: { projectId: project.id, clientId: o.klien, rating: p.ulasan[0], komentar: p.ulasan[1], createdAt: hariLalu(p.selesai ?? 0) } });
      }
    }
  }

  // 1-3. Request yang perlu ditinjau Marketing.
  await pesanan({
    klien: k.contoh,
    judul: 'Website Profil Himpunan Mahasiswa',
    kebutuhan: 'Website profil himpunan berisi visi misi, struktur pengurus, galeri kegiatan, dan halaman berita yang dapat diperbarui pengurus.',
    anggaran: 4_000_000,
    tenggat: hariLagi(60),
    status: 'BARU',
    dibuat: 1,
    dokumen: ['Kerangka-Acuan-Website.pdf', 'Contoh-Tampilan.png'],
  });
  await pesanan({
    klien: k.yoga,
    judul: 'Aplikasi Absensi Latihan UKM Seni',
    kebutuhan: 'Aplikasi absensi latihan dengan kode QR, rekap kehadiran bulanan, dan ekspor ke Excel untuk pengurus UKM.',
    anggaran: 3_500_000,
    tenggat: hariLagi(45),
    status: 'BARU',
    dibuat: 0,
  });
  await pesanan({
    klien: k.budi,
    judul: 'Sistem Peminjaman Alat Laboratorium',
    kebutuhan: 'Sistem peminjaman alat lab dengan jadwal, persetujuan asisten, dan riwayat peminjaman per mahasiswa.',
    anggaran: 7_000_000,
    tenggat: hariLagi(90),
    status: 'DITINJAU',
    dibuat: 6,
    dokumen: ['Daftar-Alat-Lab.pdf'],
  });

  // 4. Diterima, DP sudah dibayar dan menunggu diperiksa; tim belum dibentuk (Operasional: belum ada worker).
  await pesanan({
    klien: k.contoh,
    judul: 'Landing Page Seminar Nasional Teknologi',
    kebutuhan: 'Landing page acara seminar dengan jadwal, pembicara, formulir pendaftaran, dan hitung mundur acara.',
    anggaran: 2_500_000,
    nilai: 2_400_000,
    tenggat: hariLagi(30),
    status: 'DISETUJUI',
    dibuat: 9,
    tagihan: [{ keterangan: 'DP 50%', total: 1_200_000, terbit: 5, bayar: { hari: 1, status: 'MENUNGGU_VERIFIKASI' } }],
  });

  // 5. Sedang dikerjakan; Contoh Anggota Tim menjadi PM. DP lunas, pelunasan belum dibayar.
  await pesanan({
    klien: k.contoh,
    judul: 'Toko Online Produk UMKM Binaan',
    kebutuhan: 'Toko online dengan katalog produk, keranjang belanja, konfirmasi pembayaran manual, dan dasbor pesanan untuk admin.',
    anggaran: 9_000_000,
    nilai: 8_500_000,
    tenggat: hariLagi(40),
    status: 'MENJADI_PROYEK',
    dibuat: 50,
    dokumen: ['Daftar-Produk.pdf'],
    tagihan: [
      { keterangan: 'DP 50%', total: 4_250_000, terbit: 45, bayar: { hari: 43, status: 'DITERIMA' } },
      { keterangan: 'Pelunasan', total: 4_250_000, terbit: 2 },
    ],
    proyek: {
      status: 'BERJALAN',
      mulai: 42,
      target: hariLagi(35),
      tim: [
        [w.tim, 'Frontend Developer', true],
        [w.rizky, 'UI/UX Designer', false],
        [w.fajar, 'Backend Developer', false],
      ],
      tugas: [
        { judul: 'Desain halaman beranda dan katalog', bidang: 'UI_UX', bobot: 2, persen: 100, oleh: w.rizky, klien: 'Desain beranda dan katalog sudah final sesuai masukan Anda.', teknis: 'Komponen kartu produk dibuat di Figma, varian ukuran ponsel ikut.' },
        { judul: 'Desain alur keranjang dan checkout', bidang: 'UI_UX', bobot: 1, persen: 80, oleh: w.rizky, klien: 'Alur checkout tinggal penyesuaian warna tombol.' },
        { judul: 'Halaman katalog produk', bidang: 'FRONTEND', bobot: 2, persen: 60, oleh: w.tim, tenggat: hariLagi(7), klien: 'Katalog produk sudah tampil, sedang ditambah fitur pencarian.', teknis: 'Daftar produk memakai pagination dari API, filter kategori belum.' },
        { judul: 'Keranjang dan checkout', bidang: 'FRONTEND', bobot: 2, persen: 25, oleh: w.tim, tenggat: hariLagi(14) },
        { judul: 'API produk dan stok', bidang: 'BACKEND', bobot: 2, persen: 70, oleh: w.fajar, klien: 'Data produk dan stok sudah tersimpan di server.', teknis: 'Endpoint CRUD produk selesai, validasi stok saat checkout belum.' },
        { judul: 'Konfirmasi pembayaran manual', bidang: 'BACKEND', bobot: 1, persen: 0, oleh: w.fajar, tenggat: hariLagi(20) },
        { judul: 'Uji coba alur belanja end-to-end', bidang: 'INTEGRASI', bobot: 1, persen: 0, oleh: null },
      ],
    },
  });

  // 6. Sedang dikerjakan; bukti DP ditolak sehingga klien perlu mengunggah ulang.
  await pesanan({
    klien: k.budi,
    judul: 'Dashboard Monitoring Sensor IoT',
    kebutuhan: 'Dashboard pemantauan suhu dan kelembapan ruang server secara langsung, dengan grafik harian dan notifikasi ambang batas.',
    anggaran: 10_000_000,
    nilai: 9_500_000,
    tenggat: hariLagi(70),
    status: 'MENJADI_PROYEK',
    dibuat: 30,
    tagihan: [{ keterangan: 'DP 50%', total: 4_750_000, terbit: 25, bayar: { hari: 20, status: 'DITOLAK', alasan: 'Nominal pada bukti tidak sesuai tagihan.' } }],
    proyek: {
      status: 'BERJALAN',
      mulai: 22,
      target: hariLagi(60),
      tim: [
        [w.dimas, 'Fullstack Developer', true],
        [w.tim, 'Frontend Developer', false],
        [w.aulia, 'UI/UX Designer', false],
      ],
      tugas: [
        { judul: 'Wireframe dashboard', bidang: 'UI_UX', bobot: 1, persen: 100, oleh: w.aulia, klien: 'Wireframe dashboard sudah disetujui.' },
        { judul: 'Grafik suhu dan kelembapan', bidang: 'FRONTEND', bobot: 2, persen: 40, oleh: w.tim, klien: 'Grafik harian sudah tampil dengan data uji.' },
        { judul: 'Penerimaan data dari sensor (MQTT)', bidang: 'BACKEND', bobot: 3, persen: 50, oleh: w.dimas, teknis: 'Broker MQTT jalan di server lab, penyimpanan per menit.' },
        { judul: 'Notifikasi ambang batas', bidang: 'INTEGRASI', bobot: 1, persen: 0, oleh: w.dimas },
      ],
    },
  });

  // 7. Proyek dibentuk tanpa tim (status Persiapan).
  await pesanan({
    klien: k.andi,
    judul: 'Sistem Informasi Inventaris Himpunan',
    kebutuhan: 'Pencatatan barang inventaris himpunan, peminjaman antar divisi, dan laporan kondisi barang tiap semester.',
    anggaran: 5_000_000,
    nilai: 4_800_000,
    tenggat: hariLagi(80),
    status: 'MENJADI_PROYEK',
    dibuat: 12,
    tagihan: [{ keterangan: 'DP 50%', total: 2_400_000, terbit: 10, bayar: { hari: 8, status: 'DITERIMA' } }],
    proyek: { status: 'PERSIAPAN', mulai: 7, target: hariLagi(75), tim: [], tugas: [] },
  });

  // 8-10. Proyek selesai: dua sudah diulas, satu milik Contoh Klien belum diulas (untuk mencoba form ulasan).
  await pesanan({
    klien: k.sari,
    judul: 'Website Company Profile CV Minang Digital',
    kebutuhan: 'Website company profile dengan portofolio, layanan, dan formulir kontak yang terhubung ke WhatsApp.',
    anggaran: 6_000_000,
    nilai: 6_000_000,
    tenggat: hariLalu(110),
    status: 'MENJADI_PROYEK',
    dibuat: 190,
    tagihan: [
      { keterangan: 'DP 50%', total: 3_000_000, terbit: 185, bayar: { hari: 183, status: 'DITERIMA' } },
      { keterangan: 'Pelunasan', total: 3_000_000, terbit: 125, bayar: { hari: 122, status: 'DITERIMA' } },
    ],
    proyek: {
      status: 'SELESAI',
      mulai: 180,
      target: hariLalu(120),
      selesai: 125,
      tim: [
        [w.nadia, 'Frontend Developer', true],
        [w.rizky, 'UI/UX Designer', false],
      ],
      tugas: [
        { judul: 'Desain seluruh halaman', bidang: 'UI_UX', bobot: 2, persen: 100, oleh: w.rizky },
        { judul: 'Implementasi halaman', bidang: 'FRONTEND', bobot: 3, persen: 100, oleh: w.nadia, klien: 'Website sudah dapat diakses publik.' },
        { judul: 'Formulir kontak ke WhatsApp', bidang: 'INTEGRASI', bobot: 1, persen: 100, oleh: w.nadia },
      ],
      ulasan: [5, 'Tim sangat responsif dan hasilnya rapi. Revisi dikerjakan cepat.'],
    },
  });
  await pesanan({
    klien: k.rina,
    judul: 'Aplikasi Kasir Kopi Nagari',
    kebutuhan: 'Aplikasi kasir sederhana dengan menu, struk, dan laporan penjualan harian untuk dua cabang.',
    anggaran: 8_000_000,
    nilai: 7_500_000,
    tenggat: hariLalu(70),
    status: 'MENJADI_PROYEK',
    dibuat: 150,
    tagihan: [
      { keterangan: 'DP 50%', total: 3_750_000, terbit: 145, bayar: { hari: 144, status: 'DITERIMA' } },
      { keterangan: 'Pelunasan', total: 3_750_000, terbit: 80, bayar: { hari: 76, status: 'DITERIMA' } },
    ],
    proyek: {
      status: 'SELESAI',
      mulai: 140,
      target: hariLalu(75),
      selesai: 78,
      tim: [
        [w.dimas, 'Fullstack Developer', true],
        [w.salsa, 'Frontend Developer', false],
      ],
      tugas: [
        { judul: 'Halaman kasir dan struk', bidang: 'FRONTEND', bobot: 2, persen: 100, oleh: w.salsa },
        { judul: 'Laporan penjualan harian', bidang: 'BACKEND', bobot: 2, persen: 100, oleh: w.dimas },
      ],
      ulasan: [4, 'Aplikasinya membantu, hanya laporan perlu waktu dimuat saat data banyak.'],
    },
  });
  await pesanan({
    klien: k.contoh,
    judul: 'Website Alumni Fakultas Teknik',
    kebutuhan: 'Website pendataan alumni dengan pencarian alumni, lowongan kerja, dan berita kegiatan alumni.',
    anggaran: 5_500_000,
    nilai: 5_000_000,
    tenggat: hariLalu(15),
    status: 'MENJADI_PROYEK',
    dibuat: 100,
    tagihan: [
      { keterangan: 'DP 50%', total: 2_500_000, terbit: 95, bayar: { hari: 93, status: 'DITERIMA' } },
      { keterangan: 'Pelunasan', total: 2_500_000, terbit: 20, bayar: { hari: 18, status: 'DITERIMA' } },
    ],
    proyek: {
      status: 'SELESAI',
      mulai: 90,
      target: hariLalu(20),
      selesai: 16,
      tim: [
        [w.tim, 'Frontend Developer', true],
        [w.fajar, 'Backend Developer', false],
      ],
      tugas: [
        { judul: 'Halaman pencarian alumni', bidang: 'FRONTEND', bobot: 2, persen: 100, oleh: w.tim, klien: 'Pencarian alumni sudah dapat dipakai.' },
        { judul: 'Data alumni dan lowongan', bidang: 'BACKEND', bobot: 2, persen: 100, oleh: w.fajar, klien: 'Seluruh fitur selesai dan sudah diserahkan.' },
      ],
    },
  });

  // 11-12. Ditolak dan dibatalkan.
  await pesanan({
    klien: k.yoga,
    judul: 'Game Edukasi 3D Sejarah Minangkabau',
    kebutuhan: 'Game edukasi 3D dengan karakter, misi, dan kuis sejarah.',
    anggaran: 1_500_000,
    tenggat: hariLagi(20),
    status: 'DITOLAK',
    dibuat: 40,
    alasan: 'Lingkup game 3D belum dapat dikerjakan dengan anggaran dan waktu tersebut.',
  });
  await pesanan({
    klien: k.andi,
    judul: 'Aplikasi Voting Pemilihan Ketua Himpunan',
    kebutuhan: 'Aplikasi pemungutan suara daring untuk pemilihan ketua himpunan.',
    anggaran: 2_000_000,
    nilai: 2_000_000,
    tenggat: hariLalu(10),
    status: 'DIBATALKAN',
    dibuat: 70,
  });

  console.log('Data demo dimasukkan: 12 pesanan, 7 proyek, 6 worker, 5 klien dummy.');
  console.log('Akun dummy memakai kata sandi SEED_PASSWORD, misalnya rizky@demo.test (Tim) dan rina@demo.test (Klien).');
}

async function main() {
  await hapus();
  if (process.argv[2] !== 'hapus') await isi();
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
