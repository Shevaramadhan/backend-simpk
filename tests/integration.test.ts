// Tes integrasi dengan MySQL sungguhan. Lihat docs/01-ketentuan.md untuk cara menyiapkan simpk_test.
import './setup-env-db';
import assert from 'node:assert';
import { after, before, describe, mock, test } from 'node:test';
import type { Role } from '@prisma/client';
import request from 'supertest';
import app from '../app';
import prisma from '../config/prisma';
import { signToken } from '../utils/jwt';
import { mailer } from '../utils/mailer';
import { google } from '../utils/google';
import { comparePassword, hashPassword } from '../utils/password';

const PASSWORD = 'kata-sandi-uji-123';
const tokens = {} as Record<'marketing' | 'operasional' | 'tim' | 'klienA' | 'klienB', string>;
let klienAId: number;
let klienBId: number;

const api = (token?: string) => ({
  get: (path: string) => request(app).get(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string) => request(app).post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
  patch: (path: string) => request(app).patch(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
  put: (path: string) => request(app).put(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
  delete: (path: string) => request(app).delete(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
});

async function makeUser(email: string, role: Role) {
  return prisma.user.create({ data: { name: email, email, role, passwordHash: await hashPassword(PASSWORD) } });
}

async function clean() {
  await prisma.passwordReset.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.project.deleteMany();
  await prisma.order.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.service.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  await clean();
  tokens.marketing = signToken(await makeUser('m@uji.test', 'MARKETING'));
  tokens.operasional = signToken(await makeUser('o@uji.test', 'OPERASIONAL'));
  tokens.tim = signToken(await makeUser('t@uji.test', 'TIM'));
  const a = await makeUser('a@uji.test', 'KLIEN');
  const b = await makeUser('b@uji.test', 'KLIEN');
  tokens.klienA = signToken(a);
  tokens.klienB = signToken(b);
  klienAId = (await prisma.client.create({ data: { userId: a.id, namaInstansi: 'Klien A', jenisKlien: 'Organisasi' } })).id;
  klienBId = (await prisma.client.create({ data: { userId: b.id, namaInstansi: 'Klien B', jenisKlien: 'Organisasi' } })).id;
});

after(async () => {
  await clean();
  await prisma.$disconnect();
});

describe('login dan akun', () => {
  test('login berhasil untuk keempat role', async () => {
    for (const [email, role] of [['m@uji.test', 'MARKETING'], ['o@uji.test', 'OPERASIONAL'], ['t@uji.test', 'TIM'], ['a@uji.test', 'KLIEN']]) {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.role, role);
      assert.equal(res.body.data.user.passwordHash, undefined);
      const me = await api(res.body.data.token).get('/auth/me');
      assert.equal(me.body.data.email, email);
    }
  });

  test('kata sandi salah ditolak', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'm@uji.test', password: 'salah-sekali' });
    assert.equal(res.status, 401);
  });

  test('akun nonaktif tidak dapat masuk dan tokennya langsung tidak berlaku', async () => {
    const user = await makeUser('nonaktif@uji.test', 'TIM');
    const token = signToken(user);
    assert.equal((await api(token).get('/auth/me')).status, 200);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    assert.equal((await api(token).get('/auth/me')).status, 401);
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nonaktif@uji.test', password: PASSWORD });
    assert.equal(res.status, 401);
  });

  test('hanya Operasional yang mengelola akun, tanpa passwordHash', async () => {
    assert.equal((await api(tokens.marketing).get('/users')).status, 403);
    const res = await api(tokens.operasional).get('/users');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((user: object) => !('passwordHash' in user)));
  });
});

describe('katalog', () => {
  const jasa = { nama: 'Website Uji', deskripsi: 'Deskripsi jasa uji.', hargaMin: 1000000, hargaMax: 2000000, estimasiHari: 30 };

  test('Marketing menambah jasa, role lain ditolak', async () => {
    assert.equal((await api(tokens.marketing).post('/services').send(jasa)).status, 201);
    assert.equal((await api(tokens.klienA).post('/services').send(jasa)).status, 403);
    assert.equal((await api(tokens.operasional).post('/services').send(jasa)).status, 403);
  });

  test('harga maksimum lebih kecil ditolak', async () => {
    const res = await api(tokens.marketing).post('/services').send({ ...jasa, hargaMax: 1 });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.hargaMax);
  });

  test('jasa tersembunyi tidak tampil di daftar publik', async () => {
    await api(tokens.marketing).post('/services').send({ ...jasa, nama: 'Jasa Tersembunyi', isVisible: false });
    const publik = await request(app).get('/api/v1/services');
    assert.ok(!publik.body.data.some((s: { nama: string }) => s.nama === 'Jasa Tersembunyi'));
    const semua = await api(tokens.marketing).get('/services/all');
    assert.ok(semua.body.data.some((s: { nama: string }) => s.nama === 'Jasa Tersembunyi'));
    assert.equal((await api(tokens.klienA).get('/services/all')).status, 403);
  });
});

describe('akun klien', () => {
  const baru = { name: 'Klien Baru', email: 'Baru@Uji.test', password: PASSWORD, noWhatsapp: '081234567890' };
  const daftar = (data: object) => request(app).post('/api/v1/auth/register').send(data);
  let clientId: number;

  test('pendaftaran selalu menjadi Klien walau mengirim role lain', async () => {
    const res = await daftar({ ...baru, role: 'OPERASIONAL' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'KLIEN');
    assert.equal(res.body.data.user.email, 'baru@uji.test');
    assert.ok(!JSON.stringify(res.body).includes('passwordHash'));
    assert.equal((await api(res.body.data.token).get('/users')).status, 403);
    assert.equal((await api(res.body.data.token).post('/orders').send({ judul: 'Website Profil', kebutuhan: 'Membuat website profil.' })).status, 201);
    clientId = (await prisma.client.findFirstOrThrow({ where: { user: { email: 'baru@uji.test' } } })).id;
  });

  test('email terdaftar dan isian tidak lengkap ditolak', async () => {
    const res = await daftar(baru);
    assert.equal(res.status, 409);
    assert.ok(res.body.errors.email);
    assert.equal((await daftar({ ...baru, email: 'lain@uji.test', noWhatsapp: 'abc' })).status, 400);
    assert.equal((await daftar({ ...baru, email: 'lain@uji.test', password: 'pendek' })).status, 400);
  });

  test('Marketing tidak dapat membuat akun klien', async () => {
    assert.equal((await api(tokens.marketing).post('/clients').send(baru)).status, 404);
  });

  test('hanya Operasional yang memperbaiki email klien', async () => {
    const path = `/clients/${clientId}/email`;
    assert.equal((await api(tokens.marketing).patch(path).send({ email: 'x@uji.test' })).status, 403);
    assert.equal((await api(tokens.klienA).patch(path).send({ email: 'x@uji.test' })).status, 403);
    assert.equal((await api(tokens.operasional).patch(path).send({ email: 'a@uji.test' })).status, 409);
    assert.equal((await api(tokens.operasional).patch('/clients/999999/email').send({ email: 'x@uji.test' })).status, 404);
    const res = await api(tokens.operasional).patch(path).send({ email: 'perbaikan@uji.test' });
    assert.equal(res.body.data.user.email, 'perbaikan@uji.test');
  });

  test('klien yang dinonaktifkan tidak dapat masuk', async () => {
    assert.equal((await api(tokens.marketing).patch(`/clients/${clientId}`).send({ isActive: false })).status, 200);
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'perbaikan@uji.test', password: PASSWORD });
    assert.equal(login.status, 401);
  });
});

describe('pesanan', () => {
  const pesanan = { judul: 'Website Organisasi', kebutuhan: 'Membuat website profil organisasi.' };

  test('klien memesan untuk dirinya sendiri walau mengirim clientId klien lain', async () => {
    const res = await api(tokens.klienA).post('/orders').send({ ...pesanan, clientId: klienBId });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.client.id, klienAId);
    assert.equal(res.body.data.status, 'BARU');
    assert.match(res.body.data.nomor, /^ORD-\d{8}-[0-9A-F]{6}$/);
  });

  test('Marketing wajib memilih klien yang ada', async () => {
    assert.equal((await api(tokens.marketing).post('/orders').send(pesanan)).status, 400);
    assert.equal((await api(tokens.marketing).post('/orders').send({ ...pesanan, clientId: 999999 })).status, 400);
    assert.equal((await api(tokens.marketing).post('/orders').send({ ...pesanan, clientId: klienBId })).status, 201);
  });

  test('klien tidak dapat melihat pesanan klien lain', async () => {
    const milikB = await api(tokens.klienB).post('/orders').send(pesanan);
    const id = milikB.body.data.id;
    assert.equal((await api(tokens.klienB).get(`/orders/${id}`)).status, 200);
    assert.equal((await api(tokens.klienA).get(`/orders/${id}`)).status, 404);
    const list = await api(tokens.klienA).get('/orders');
    assert.ok(list.body.data.length > 0);
    assert.ok(list.body.data.every((o: { client: { id: number } }) => o.client.id === klienAId));
  });

  test('Tim tidak memiliki akses pesanan', async () => {
    assert.equal((await api(tokens.tim).get('/orders')).status, 403);
    assert.equal((await api(tokens.tim).post('/orders').send(pesanan)).status, 403);
  });

  test('jasa tersembunyi tidak dapat dipesan', async () => {
    const hidden = await prisma.service.findFirstOrThrow({ where: { isVisible: false } });
    const res = await api(tokens.klienA).post('/orders').send({ ...pesanan, serviceId: hidden.id });
    assert.equal(res.status, 400);
  });

  test('status mengikuti urutan dan hanya diubah Marketing', async () => {
    const { body } = await api(tokens.klienA).post('/orders').send(pesanan);
    const path = `/orders/${body.data.id}/status`;
    assert.equal((await api(tokens.klienA).patch(path).send({ status: 'DITINJAU' })).status, 403);
    const approve = `/orders/${body.data.id}/approve`;
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'DISETUJUI' })).status, 400);
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'MENJADI_PROYEK' })).status, 400);
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'DITINJAU' })).status, 200);
    assert.equal((await api(tokens.operasional).post(approve).send({ nilaiDisepakati: 1000 })).status, 403);
    assert.equal((await api(tokens.marketing).post(approve).send({})).status, 400);
    const disetujui = await api(tokens.marketing).post(approve).send({ nilaiDisepakati: 2500000 });
    assert.equal(disetujui.body.data.status, 'DISETUJUI');
    assert.equal(Number(disetujui.body.data.nilaiDisepakati), 2500000);
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'DITOLAK', alasanDitolak: 'x' })).status, 409);
  });

  test('penolakan wajib beralasan', async () => {
    const { body } = await api(tokens.klienA).post('/orders').send(pesanan);
    const path = `/orders/${body.data.id}/status`;
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'DITOLAK' })).status, 400);
    const res = await api(tokens.marketing).patch(path).send({ status: 'DITOLAK', alasanDitolak: 'Di luar layanan.' });
    assert.equal(res.body.data.alasanDitolak, 'Di luar layanan.');
  });
});

describe('ganti kata sandi', () => {
  const ganti = (token: string, data: object) => api(token).post('/auth/change-password').send(data);
  const baru = 'kata-sandi-baru-456';

  test('wajib login', async () => {
    const res = await request(app).post('/api/v1/auth/change-password').send({ passwordLama: PASSWORD, passwordBaru: baru });
    assert.equal(res.status, 401);
  });

  test('kata sandi lama salah atau baru tidak layak ditolak', async () => {
    assert.equal((await ganti(tokens.tim, { passwordLama: 'salah-sekali', passwordBaru: baru })).status, 400);
    assert.equal((await ganti(tokens.tim, { passwordLama: PASSWORD, passwordBaru: 'pendek' })).status, 400);
    assert.equal((await ganti(tokens.tim, { passwordLama: PASSWORD, passwordBaru: PASSWORD })).status, 400);
  });

  test('berhasil dan hanya mengubah akun sendiri', async () => {
    assert.equal((await ganti(tokens.tim, { passwordLama: PASSWORD, passwordBaru: baru })).status, 200);
    const tim = await prisma.user.findUniqueOrThrow({ where: { email: 't@uji.test' } });
    const lain = await prisma.user.findUniqueOrThrow({ where: { email: 'o@uji.test' } });
    assert.ok(await comparePassword(baru, tim.passwordHash));
    assert.ok(await comparePassword(PASSWORD, lain.passwordHash));
  });
});

describe('lupa kata sandi', () => {
  const lupa = (email: string) => request(app).post('/api/v1/auth/forgot-password').send({ email });
  const reset = (token: string, passwordBaru: string) => request(app).post('/api/v1/auth/reset-password').send({ token, passwordBaru });
  const tunggu = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Email tidak benar-benar dikirim; tautan diambil dari isi email tiruan.
  async function mintaToken(email: string) {
    let text = '';
    const send = mock.method(mailer, 'send', async (_to: string, _subject: string, body: string) => {
      text = body;
    });
    await lupa(email);
    for (let i = 0; i < 100 && !text; i += 1) await tunggu(20);
    send.mock.restore();
    return /token=([0-9a-f]{64})/.exec(text)?.[1] ?? '';
  }

  test('email tidak terdaftar mendapat jawaban yang sama dan tidak ada email', async () => {
    const send = mock.method(mailer, 'send', async () => {});
    const terdaftar = await lupa('o@uji.test');
    const tidak = await lupa('tidak-ada@uji.test');
    await tunggu(200);
    assert.equal(terdaftar.status, 200);
    assert.deepEqual(tidak.body, terdaftar.body);
    assert.equal(send.mock.callCount(), 1);
    send.mock.restore();
  });

  test('token tersimpan sebagai hash, berlaku sekali, dan mengganti kata sandi', async () => {
    const token = await mintaToken('o@uji.test');
    assert.ok(token);
    assert.equal(await prisma.passwordReset.count({ where: { tokenHash: token } }), 0);

    assert.equal((await reset(token, 'pendek')).status, 400);
    const baru = 'kata-sandi-reset-789';
    assert.equal((await reset(token, baru)).status, 200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'o@uji.test' } });
    assert.ok(await comparePassword(baru, user.passwordHash));
    assert.equal((await reset(token, 'kata-sandi-lain-000')).status, 400);
  });

  test('tautan kedaluwarsa dan tautan tidak dikenal ditolak', async () => {
    const token = await mintaToken('m@uji.test');
    await prisma.passwordReset.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await reset(token, 'kata-sandi-lain-000')).status, 400);
    assert.equal((await reset('0'.repeat(64), 'kata-sandi-lain-000')).status, 400);
  });

  test('tautan dibatalkan saat email diperbaiki Operasional', async () => {
    const token = await mintaToken('b@uji.test');
    assert.ok(token);
    assert.equal((await api(tokens.operasional).patch(`/clients/${klienBId}/email`).send({ email: 'b-baru@uji.test' })).status, 200);
    assert.equal((await reset(token, 'kata-sandi-lain-000')).status, 400);
  });
});

describe('proyek, tugas, dan progres', () => {
  const RAHASIA = 'RAHASIA-TEKNIS error koneksi database';
  const UNTUK_KLIEN = 'Halaman beranda sudah dapat dilihat.';
  const akun = {} as Record<'pm' | 'anggota' | 'luar', { id: number; token: string }>;
  let orderId: number;
  let projectId: number;
  let tugasPm: number;
  let tugasAnggota: number;

  const anggotaTim = () => [
    { userId: akun.pm.id, posisi: 'Project Manager', isPm: true },
    { userId: akun.anggota.id, posisi: 'Backend', isPm: false },
  ];

  async function pesananDisetujui(nilai = 5000000) {
    const { body } = await api(tokens.klienA).post('/orders').send({ judul: 'Sistem Organisasi', kebutuhan: 'Membuat sistem informasi organisasi.' });
    const id = body.data.id as number;
    await api(tokens.marketing).patch(`/orders/${id}/status`).send({ status: 'DITINJAU' });
    await api(tokens.marketing).post(`/orders/${id}/approve`).send({ nilaiDisepakati: nilai });
    return id;
  }

  before(async () => {
    for (const nama of ['pm', 'anggota', 'luar'] as const) {
      const user = await makeUser(`${nama}@uji.test`, 'TIM');
      akun[nama] = { id: user.id, token: signToken(user) };
    }
    orderId = await pesananDisetujui();
  });

  test('hanya Operasional yang membentuk proyek, dari pesanan disetujui', async () => {
    const data = { orderId, nama: 'Sistem Organisasi', members: anggotaTim() };
    assert.equal((await api(tokens.marketing).post('/projects').send(data)).status, 403);
    assert.equal((await api(akun.pm.token).post('/projects').send(data)).status, 403);
    assert.equal((await api(tokens.klienA).post('/projects').send(data)).status, 403);

    const { body } = await api(tokens.klienA).post('/orders').send({ judul: 'Belum Disetujui', kebutuhan: 'Pesanan yang belum disetujui.' });
    assert.equal((await api(tokens.operasional).post('/projects').send({ ...data, orderId: body.data.id })).status, 409);
  });

  test('tim wajib punya tepat satu PM dari akun Tim yang aktif', async () => {
    const data = { orderId, nama: 'Sistem Organisasi' };
    const kirim = (members: object[]) => api(tokens.operasional).post('/projects').send({ ...data, members });
    assert.equal((await kirim([{ userId: akun.pm.id, posisi: 'PM', isPm: false }])).status, 400);
    assert.equal((await kirim([{ userId: akun.pm.id, posisi: 'PM', isPm: true }, { userId: akun.anggota.id, posisi: 'BE', isPm: true }])).status, 400);
    const marketing = await prisma.user.findUniqueOrThrow({ where: { email: 'm@uji.test' } });
    assert.equal((await kirim([{ userId: marketing.id, posisi: 'PM', isPm: true }])).status, 400);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status, 'DISETUJUI');
  });

  test('proyek memakai nilai pesanan dan pesanan tidak bisa dipakai dua kali', async () => {
    const data = { orderId, nama: 'Sistem Organisasi', tglMulai: '2026-11-10', targetSelesai: '2026-12-10', members: anggotaTim() };
    assert.equal((await api(tokens.operasional).post('/projects').send({ ...data, targetSelesai: '2026-11-01' })).status, 400);
    const res = await api(tokens.operasional).post('/projects').send(data);
    assert.equal(res.status, 201);
    assert.equal(Number(res.body.data.nilai), 5000000);
    assert.equal(res.body.data.status, 'BERJALAN');
    assert.match(res.body.data.kode, /^PRJ-\d{8}-[0-9A-F]{6}$/);
    projectId = res.body.data.id;
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status, 'MENJADI_PROYEK');
    assert.equal((await api(tokens.operasional).post('/projects').send(data)).status, 409);
  });

  test('tiap role hanya melihat proyek haknya', async () => {
    const lihat = (token: string) => api(token).get(`/projects/${projectId}`);
    for (const token of [tokens.operasional, tokens.marketing, akun.pm.token, akun.anggota.token, tokens.klienA]) {
      assert.equal((await lihat(token)).status, 200);
    }
    assert.equal((await lihat(akun.luar.token)).status, 404);
    assert.equal((await lihat(tokens.klienB)).status, 404);
    assert.equal((await api(akun.luar.token).get('/projects')).body.data.length, 0);
    assert.equal((await api(tokens.klienB).get('/projects')).body.data.length, 0);
    assert.equal((await api(akun.pm.token).get('/projects')).body.data[0].isPm, true);
    assert.equal((await api(akun.anggota.token).get('/projects')).body.data[0].isPm, false);
  });

  test('nilai dan susunan tim hanya untuk yang berhak', async () => {
    const klien = await api(tokens.klienA).get(`/projects/${projectId}`);
    assert.equal(klien.body.data.members, undefined);
    assert.equal(klien.body.data.nilai, undefined);
    assert.equal((await api(akun.pm.token).get(`/projects/${projectId}`)).body.data.nilai, undefined);
    assert.equal((await api(akun.pm.token).get('/projects')).body.data[0].nilai, undefined);
    const marketing = await api(tokens.marketing).get(`/projects/${projectId}`);
    assert.equal(marketing.body.data.members.length, 2);
    assert.ok(marketing.body.data.nilai);
  });

  test('tugas dibuat PM atau Operasional, bukan anggota biasa', async () => {
    const path = `/projects/${projectId}/tasks`;
    const tugas = { judul: 'Halaman beranda', deskripsi: 'Detail teknis tugas', assigneeId: akun.anggota.id, bidang: 'FRONTEND' };
    assert.equal((await api(akun.anggota.token).post(path).send(tugas)).status, 403);
    assert.equal((await api(tokens.marketing).post(path).send(tugas)).status, 403);
    assert.equal((await api(tokens.klienA).post(path).send(tugas)).status, 403);
    assert.equal((await api(akun.luar.token).post(path).send(tugas)).status, 403);
    assert.equal((await api(akun.pm.token).post(path).send({ ...tugas, assigneeId: akun.luar.id })).status, 400);

    const pertama = await api(akun.pm.token).post(path).send(tugas);
    assert.equal(pertama.status, 201);
    tugasAnggota = pertama.body.data.id;
    const kedua = await api(tokens.operasional).post(path).send({ judul: 'Halaman profil', assigneeId: akun.pm.id, bidang: 'UI_UX' });
    tugasPm = kedua.body.data.id;
    assert.equal((await api(tokens.operasional).post('/projects/999999/tasks').send(tugas)).status, 404);
  });

  test('anggota hanya memperbarui tugasnya, PM semua tugas', async () => {
    const progres = (id: number) => `/projects/${projectId}/tasks/${id}/progress`;
    const isi = { persentase: 50, catatanTeknis: RAHASIA, catatanKlien: UNTUK_KLIEN };
    assert.equal((await api(akun.anggota.token).post(progres(tugasPm)).send(isi)).status, 403);
    assert.equal((await api(akun.luar.token).post(progres(tugasAnggota)).send(isi)).status, 404);
    assert.equal((await api(tokens.marketing).post(progres(tugasAnggota)).send(isi)).status, 403);
    assert.equal((await api(tokens.klienA).post(progres(tugasAnggota)).send(isi)).status, 403);
    assert.equal((await api(akun.anggota.token).post(progres(tugasAnggota)).send({ persentase: 101 })).status, 400);
    assert.equal((await api(akun.anggota.token).post(progres(999999)).send(isi)).status, 404);

    const res = await api(akun.anggota.token).post(progres(tugasAnggota)).send(isi);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'DIKERJAKAN');
    assert.equal((await api(akun.pm.token).post(progres(tugasPm)).send({ persentase: 100 })).body.data.status, 'SELESAI');
  });

  test('progres proyek adalah rata-rata tugas, juga per bidang', async () => {
    const { data } = (await api(tokens.klienA).get(`/projects/${projectId}`)).body;
    assert.equal(data.progres, 75);
    assert.deepEqual(data.progresBidang, { UI_UX: 100, FRONTEND: 50, BACKEND: null, INTEGRASI: null });
    const order = (await api(tokens.klienA).get(`/orders/${orderId}`)).body.data;
    assert.equal(order.project.progres, 75);
    assert.ok(!JSON.stringify(order).includes('RAHASIA'));
  });

  test('tugas wajib punya bidang', async () => {
    const res = await api(akun.pm.token).post(`/projects/${projectId}/tasks`).send({ judul: 'Tanpa bidang' });
    assert.equal(res.status, 400);
  });

  test('catatan teknis tidak pernah sampai ke Klien dan Marketing', async () => {
    for (const token of [tokens.klienA, tokens.marketing]) {
      for (const path of [`/projects/${projectId}`, `/projects/${projectId}/tasks`, `/projects/${projectId}/updates`, '/projects']) {
        const text = JSON.stringify((await api(token).get(path)).body);
        assert.ok(!text.includes(RAHASIA), `${path} membocorkan catatan teknis`);
        assert.ok(!text.includes('catatanTeknis'), `${path} memuat kolom catatanTeknis`);
        assert.ok(!text.includes('Detail teknis tugas'), `${path} memuat deskripsi tugas`);
      }
    }
    const klien = await api(tokens.klienA).get(`/projects/${projectId}/updates`);
    assert.equal(klien.body.data.length, 1);
    assert.equal(klien.body.data[0].catatanKlien, UNTUK_KLIEN);
    assert.equal(klien.body.data[0].author, undefined);
    const tugas = await api(tokens.klienA).get(`/projects/${projectId}/tasks`);
    assert.deepEqual(Object.keys(tugas.body.data[0]).sort(), ['bidang', 'bobot', 'id', 'judul', 'persentase', 'status']);
  });

  test('tim pelaksana melihat catatan teknis proyeknya', async () => {
    const res = await api(akun.anggota.token).get(`/projects/${projectId}/updates`);
    assert.ok(JSON.stringify(res.body).includes(RAHASIA));
    assert.equal((await api(akun.luar.token).get(`/projects/${projectId}/updates`)).status, 404);
    assert.equal((await api(tokens.klienB).get(`/projects/${projectId}/updates`)).status, 404);
  });

  test('tugas saya hanya berisi tugas milik pengguna', async () => {
    const res = await api(akun.anggota.token).get('/projects/my-tasks');
    assert.deepEqual(res.body.data.map((tugas: { id: number }) => tugas.id), [tugasAnggota]);
    assert.equal((await api(tokens.klienA).get('/projects/my-tasks')).status, 403);
  });

  test('tugas dari proyek lain tidak dapat disentuh lewat proyek ini', async () => {
    const proyekLain = await api(tokens.operasional).post('/projects').send({ orderId: await pesananDisetujui(), nama: 'Proyek Lain', members: [{ userId: akun.luar.id, posisi: 'PM', isPm: true }] });
    const lain = proyekLain.body.data.id;
    assert.equal((await api(akun.luar.token).patch(`/projects/${lain}/tasks/${tugasAnggota}`).send({ judul: 'Diubah' })).status, 404);
    assert.equal((await api(akun.luar.token).delete(`/projects/${lain}/tasks/${tugasAnggota}`)).status, 404);
    assert.equal((await api(akun.luar.token).post(`/projects/${lain}/tasks/${tugasAnggota}/progress`).send({ persentase: 10 })).status, 404);
  });

  test('anggota yang dikeluarkan kehilangan akses dan tugasnya tanpa penanggung jawab', async () => {
    const path = `/projects/${projectId}/members`;
    assert.equal((await api(akun.pm.token).put(path).send({ members: anggotaTim() })).status, 403);
    const res = await api(tokens.operasional).put(path).send({ members: [{ userId: akun.pm.id, posisi: 'Project Manager', isPm: true }] });
    assert.equal(res.status, 200);
    assert.equal((await api(akun.anggota.token).get(`/projects/${projectId}`)).status, 404);
    assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: tugasAnggota } })).assigneeId, null);
  });

  test('proyek yang ditutup tidak menerima progres', async () => {
    assert.equal((await api(akun.pm.token).patch(`/projects/${projectId}`).send({ status: 'SELESAI' })).status, 403);
    assert.equal((await api(tokens.operasional).patch(`/projects/${projectId}`).send({ status: 'SELESAI' })).status, 200);
    const res = await api(akun.pm.token).post(`/projects/${projectId}/tasks/${tugasPm}/progress`).send({ persentase: 90 });
    assert.equal(res.status, 409);
  });
});

describe('pengajuan, dokumen, tagihan, dan pembayaran', () => {
  const PDF = Buffer.from('%PDF-1.4\n% dokumen uji\n');
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  let orderId: number;
  let docId: number;
  let invoiceId: number;

  const ajukan = (token: string) =>
    request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .field('judul', 'Web Bakti Unand 2027')
      .field('kebutuhan', 'Web dengan fungsi seperti tahun lalu dengan penyesuaian.')
      .field('anggaran', '8000000')
      .field('tenggatDiharapkan', '2027-08-07');

  test('klien mengajukan project dengan dokumen pendukung', async () => {
    const res = await ajukan(tokens.klienA).attach('dokumen', PDF, 'proposal.pdf').attach('dokumen', PNG, 'sketsa.png');
    assert.equal(res.status, 201);
    assert.equal(res.body.data.judul, 'Web Bakti Unand 2027');
    orderId = res.body.data.id;
    const detail = (await api(tokens.klienA).get(`/orders/${orderId}`)).body.data;
    assert.equal(Number(detail.anggaran), 8000000);
    assert.deepEqual(detail.documents.map((d: { namaFile: string }) => d.namaFile), ['proposal.pdf', 'sketsa.png']);
    assert.equal(detail.project, null);
    docId = detail.documents[0].id;
  });

  test('berkas palsu dan berkas terlalu besar ditolak tanpa membuat pesanan', async () => {
    const before = await prisma.order.count();
    const palsu = await ajukan(tokens.klienA).attach('dokumen', Buffer.from('MZ program'), 'proposal.pdf');
    assert.equal(palsu.status, 400);
    const besar = await ajukan(tokens.klienA).attach('dokumen', Buffer.concat([PDF, Buffer.alloc(6 * 1024 * 1024)]), 'besar.pdf');
    assert.equal(besar.status, 400);
    assert.equal(await prisma.order.count(), before);
  });

  test('dokumen hanya dapat diunduh pihak yang berhak', async () => {
    const path = `/files/dokumen/${docId}`;
    const milik = await api(tokens.klienA).get(path);
    assert.equal(milik.status, 200);
    assert.ok(Buffer.from(milik.body).subarray(0, 5).toString() === '%PDF-' || milik.text.startsWith('%PDF-'));
    assert.equal((await api(tokens.marketing).get(path)).status, 200);
    assert.equal((await api(tokens.klienB).get(path)).status, 404);
    assert.equal((await api(tokens.tim).get(path)).status, 404);
    assert.equal((await request(app).get(`/api/v1${path}`)).status, 401);
  });

  test('tagihan hanya untuk pesanan disetujui dan hanya diterbitkan Marketing', async () => {
    const tagih = (token: string) => api(token).post(`/orders/${orderId}/invoices`).send({ keterangan: 'DP 50%', total: 4000000, jatuhTempo: '2026-11-30' });
    assert.equal((await tagih(tokens.marketing)).status, 409);
    assert.equal((await api(tokens.marketing).post(`/orders/${orderId}/approve`).send({ nilaiDisepakati: 8000000 })).status, 200);
    assert.equal((await tagih(tokens.operasional)).status, 403);
    assert.equal((await tagih(tokens.klienA)).status, 403);
    const res = await tagih(tokens.marketing);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'DITERBITKAN');
    assert.match(res.body.data.nomor, /^INV-\d{8}-[0-9A-F]{6}$/);
    invoiceId = res.body.data.id;
    await tagih(tokens.marketing).send({ keterangan: 'Pelunasan', total: 4000000 });
    const detail = (await api(tokens.klienA).get(`/orders/${orderId}`)).body.data;
    assert.equal(detail.invoices.length, 2);
  });

  test('bukti transfer: hanya klien pemilik, satu per pemeriksaan, ditolak bisa unggah ulang', async () => {
    const bayar = (token: string, file = PNG) =>
      request(app).post(`/api/v1/invoices/${invoiceId}/payments`).set('Authorization', `Bearer ${token}`)
        .field('jumlah', '4000000').field('tglTransfer', '2026-11-20').attach('bukti', file, 'bukti.png');

    assert.equal((await bayar(tokens.klienB)).status, 404);
    assert.equal((await bayar(tokens.marketing)).status, 403);
    assert.equal((await bayar(tokens.klienA, PDF.subarray(0, 3))).status, 400);
    const pertama = await bayar(tokens.klienA);
    assert.equal(pertama.status, 201);
    assert.equal(pertama.body.data.statusVerifikasi, 'MENUNGGU_VERIFIKASI');
    assert.equal((await bayar(tokens.klienA)).status, 409);

    const periksa = (id: number, data: object, token = tokens.marketing) => api(token).patch(`/payments/${id}`).send(data);
    assert.equal((await periksa(pertama.body.data.id, { status: 'DITOLAK' })).status, 400);
    assert.equal((await periksa(pertama.body.data.id, { status: 'DITERIMA' }, tokens.operasional)).status, 403);
    assert.equal((await periksa(pertama.body.data.id, { status: 'DITOLAK', alasanDitolak: 'Nominal tidak sesuai.' })).status, 200);
    assert.equal((await periksa(pertama.body.data.id, { status: 'DITERIMA' })).status, 409);

    const kedua = await bayar(tokens.klienA);
    assert.equal(kedua.status, 201);
    assert.equal((await api(tokens.klienB).get(`/files/bukti/${kedua.body.data.id}`)).status, 404);
    assert.equal((await api(tokens.marketing).get(`/files/bukti/${kedua.body.data.id}`)).status, 200);
    assert.equal((await periksa(kedua.body.data.id, { status: 'DITERIMA' })).status, 200);
    assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).status, 'LUNAS');
    assert.equal((await bayar(tokens.klienA)).status, 409);
  });

  test('daftar tagihan untuk Marketing dan Operasional saja', async () => {
    assert.equal((await api(tokens.marketing).get('/invoices')).status, 200);
    assert.equal((await api(tokens.operasional).get('/invoices')).status, 200);
    assert.equal((await api(tokens.klienA).get('/invoices')).status, 403);
    assert.equal((await api(tokens.tim).get('/invoices')).status, 403);
  });

  test('Operasional membentuk proyek tanpa tim lalu menunjuk tim', async () => {
    const tim = await prisma.user.findUniqueOrThrow({ where: { email: 't@uji.test' } });
    const res = await api(tokens.operasional).post('/projects').send({ orderId, nama: 'Web Bakti Unand 2027' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'PERSIAPAN');
    const path = `/projects/${res.body.data.id}/members`;
    assert.equal((await api(tokens.operasional).put(path).send({ members: [] })).status, 400);
    assert.equal((await api(tokens.operasional).put(path).send({ members: [{ userId: tim.id, posisi: 'Frontend', isPm: true }] })).status, 200);
    assert.equal((await prisma.project.findUniqueOrThrow({ where: { id: res.body.data.id } })).status, 'BERJALAN');
  });
});

describe('masuk dengan Google', () => {
  const masuk = () => request(app).post('/api/v1/auth/google').send({ credential: 'x'.repeat(40) });

  test('email baru menjadi akun Klien', async () => {
    const verify = mock.method(google, 'verify', async () => ({ email: 'google@uji.test', name: 'Pengguna Google', emailVerified: true }));
    const res = await masuk();
    verify.mock.restore();
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'KLIEN');
    assert.ok(await prisma.client.count({ where: { user: { email: 'google@uji.test' } } }));
  });

  test('email akun internal masuk sesuai role-nya', async () => {
    const verify = mock.method(google, 'verify', async () => ({ email: 'm@uji.test', name: 'Marketing', emailVerified: true }));
    const res = await masuk();
    verify.mock.restore();
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'MARKETING');
  });

  test('email yang belum diverifikasi Google atau token salah ditolak', async () => {
    const belum = mock.method(google, 'verify', async () => ({ email: 'baru2@uji.test', name: 'X', emailVerified: false }));
    assert.equal((await masuk()).status, 401);
    belum.mock.restore();
    assert.equal((await masuk()).status, 401);
    assert.equal(await prisma.user.count({ where: { email: 'baru2@uji.test' } }), 0);
  });
});
