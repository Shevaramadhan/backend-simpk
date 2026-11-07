// Tes integrasi dengan MySQL sungguhan. Lihat docs/01-ketentuan.md untuk cara menyiapkan simpk_test.
import './setup-env-db';
import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import type { Role } from '@prisma/client';
import request from 'supertest';
import app from '../app';
import prisma from '../config/prisma';
import { signToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';

const PASSWORD = 'kata-sandi-uji-123';
const tokens = {} as Record<'marketing' | 'operasional' | 'tim' | 'klienA' | 'klienB', string>;
let klienAId: number;
let klienBId: number;

const api = (token?: string) => ({
  get: (path: string) => request(app).get(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string) => request(app).post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
  patch: (path: string) => request(app).patch(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
});

async function makeUser(email: string, role: Role) {
  return prisma.user.create({ data: { name: email, email, role, passwordHash: await hashPassword(PASSWORD) } });
}

async function clean() {
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
  const baru = { name: 'Klien Baru', email: 'baru@uji.test', password: PASSWORD, namaInstansi: 'Instansi Baru', jenisKlien: 'Perorangan' };

  test('Marketing membuat akun klien yang dapat langsung masuk', async () => {
    assert.equal((await api(tokens.klienA).post('/clients').send(baru)).status, 403);
    const res = await api(tokens.marketing).post('/clients').send(baru);
    assert.equal(res.status, 201);
    assert.ok(!JSON.stringify(res.body).includes('passwordHash'));
    const login = await request(app).post('/api/v1/auth/login').send({ email: baru.email, password: PASSWORD });
    assert.equal(login.body.data.user.role, 'KLIEN');
  });

  test('email yang sudah terdaftar ditolak', async () => {
    assert.equal((await api(tokens.marketing).post('/clients').send(baru)).status, 409);
  });

  test('klien yang dinonaktifkan tidak dapat masuk', async () => {
    const list = await api(tokens.marketing).get('/clients');
    const target = list.body.data.find((c: { namaInstansi: string }) => c.namaInstansi === 'Instansi Baru');
    assert.equal((await api(tokens.marketing).patch(`/clients/${target.id}`).send({ isActive: false })).status, 200);
    const login = await request(app).post('/api/v1/auth/login').send({ email: baru.email, password: PASSWORD });
    assert.equal(login.status, 401);
  });
});

describe('pesanan', () => {
  const pesanan = { kebutuhan: 'Membuat website profil organisasi.' };

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
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'DISETUJUI' })).status, 409);
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'MENJADI_PROYEK' })).status, 400);
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'DITINJAU' })).status, 200);
    assert.equal((await api(tokens.marketing).patch(path).send({ status: 'DISETUJUI' })).status, 200);
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
