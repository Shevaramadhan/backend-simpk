// Uji yang tidak memerlukan database.
import './setup-env';
import assert from 'node:assert';
import test from 'node:test';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app';
import authorize from '../middlewares/role.middleware';
import ApiError from '../utils/ApiError';
import { progressByBidang, projectProgress } from '../utils/progress';

test('health berjalan', async () => {
  const res = await request(app).get('/api/v1/health');
  assert.equal(res.status, 200);
});

test('alamat tidak dikenal memakai format error standar', async () => {
  const res = await request(app).get('/api/v1/tidak-ada');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('login dengan email tidak valid ditolak sebelum menyentuh database', async () => {
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'bukan-email', password: 'x' });
  assert.equal(res.status, 400);
  assert.ok(res.body.errors.email);
});

test('JSON rusak dijawab 400, bukan 500', async () => {
  const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{rusak');
  assert.equal(res.status, 400);
});

test('endpoint terlindungi menolak permintaan tanpa token', async () => {
  for (const path of ['/api/v1/auth/me', '/api/v1/users']) {
    const res = await request(app).get(path);
    assert.equal(res.status, 401);
  }
});

test('token palsu dan token algoritma none ditolak', async () => {
  const palsu = jwt.sign({ sub: '1' }, 'rahasia-lain-yang-tidak-benar-sama-sekali');
  const none = jwt.sign({ sub: '1' }, '', { algorithm: 'none' });
  for (const token of [palsu, none]) {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
  }
});

test('authorize menolak role yang tidak diizinkan', () => {
  let error: unknown;
  authorize('OPERASIONAL')({ user: { role: 'KLIEN' } } as Request, {} as Response, (e) => {
    error = e;
  });
  assert.ok(error instanceof ApiError);
  assert.equal(error.status, 403);
});

test('progres proyek adalah rata-rata berbobot dan dihitung per bidang', () => {
  assert.equal(projectProgress([]), 0);
  assert.equal(projectProgress([{ persentase: 100, bobot: 1 }, { persentase: 50, bobot: 1 }, { persentase: 0, bobot: 1 }]), 50);
  assert.equal(projectProgress([{ persentase: 100, bobot: 3 }, { persentase: 0, bobot: 1 }]), 75);
  const bidang = progressByBidang([
    { persentase: 100, bobot: 1, bidang: 'UI_UX' },
    { persentase: 40, bobot: 1, bidang: 'BACKEND' },
    { persentase: 80, bobot: 3, bidang: 'BACKEND' },
  ]);
  assert.deepEqual(bidang, { UI_UX: 100, FRONTEND: null, BACKEND: 70, INTEGRASI: null });
});

// Dokumentasi API (OpenAPI) harus mengikuti rute yang benar-benar ada dan aman dibuka publik.
type Layer = { route?: { path: string; methods: Record<string, boolean> }; name: string; handle: { stack?: Layer[] }; regexp: RegExp & { fast_slash?: boolean } };

function daftarRute(stack: Layer[], prefix = ''): string[] {
  return stack.flatMap((layer) => {
    if (layer.route) {
      const full = `${prefix}${layer.route.path}`.replace(/(.)\/$/, '$1').replace(/:(\w+)/g, '{$1}');
      return Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${full}`);
    }
    if (layer.name === 'router' && layer.handle.stack) {
      // Express 4 menyimpan prefiks mount sebagai regex, misalnya ^\/auth\/?(?=\/|$).
      const mount = layer.regexp.fast_slash ? '' : layer.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/');
      return daftarRute(layer.handle.stack, prefix + mount);
    }
    return [];
  });
}

test('setiap rute API tercatat di openapi.yaml dan sebaliknya', async () => {
  const { default: routes } = await import('../routes');
  const { openApiSpec } = await import('../config/apiDocs');
  const diKode = new Set(daftarRute((routes as unknown as { stack: Layer[] }).stack));
  const paths = openApiSpec.paths as Record<string, Record<string, unknown>>;
  const diSpec = new Set(Object.entries(paths).flatMap(([p, ops]) => Object.keys(ops).filter((m) => m !== 'parameters').map((m) => `${m.toUpperCase()} ${p}`)));
  assert.deepEqual([...diKode].filter((r) => !diSpec.has(r)), [], 'rute belum didokumentasikan');
  assert.deepEqual([...diSpec].filter((r) => !diKode.has(r)), [], 'dokumentasi untuk rute yang tidak ada');
});

test('dokumentasi publik hanya untuk dibaca dan tidak menyimpan token', async () => {
  const halaman = await request(app).get('/api/v1/docs/');
  assert.equal(halaman.status, 200);
  assert.ok(halaman.headers['content-security-policy'], 'header keamanan Helmet tetap berlaku');
  assert.equal(halaman.headers['cache-control'], 'no-store');
  const init = await request(app).get('/api/v1/docs/swagger-ui-init.js');
  assert.equal(init.status, 200);
  assert.match(init.text, /"supportedSubmitMethods":\s*\[\]/);
  assert.match(init.text, /"persistAuthorization":\s*false/);
  const spec = await request(app).get('/api/v1/openapi.json');
  assert.equal(spec.status, 200);
  // Tidak boleh ada token JWT atau isi rahasia di spesifikasi.
  assert.doesNotMatch(spec.text, /eyJ[A-Za-z0-9_-]{10,}\./);
  assert.doesNotMatch(spec.text, /JWT_SECRET|SEED_PASSWORD|DATABASE_URL/);
});
