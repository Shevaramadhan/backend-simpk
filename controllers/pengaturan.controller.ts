import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import { ok } from '../utils/response';
import type { PengaturanInput } from '../validators/pengaturan.validator';

// Identitas dan rekening Neo Telemetri untuk tagihan (FR-12, B-35). Selama Marketing belum pernah menyimpan,
// yang dikirim adalah data contoh dengan `contoh: true` agar tagihan menampilkan peringatan jangan transfer.
const CONTOH = {
  nama: 'UKM Neo Telemetri Universitas Andalas',
  alamat: 'Gedung Pusat Kegiatan Mahasiswa, Universitas Andalas, Limau Manis, Padang, Sumatera Barat 25163',
  telepon: '+62 897 1504 300',
  email: 'baktiunand2025@gmail.com',
  bank: 'Bank Contoh Indonesia',
  nomorRekening: '1234 5678 9012',
  atasNama: 'UKM Neo Telemetri Unand',
};

const fields = { nama: true, alamat: true, telepon: true, email: true, bank: true, nomorRekening: true, atasNama: true, updatedAt: true };

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await prisma.pengaturan.findUnique({ where: { id: 1 }, select: fields });
    ok(res, row ? { ...row, contoh: false } : { ...CONTOH, updatedAt: null, contoh: true });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = { ...(req.body as PengaturanInput), updatedById: req.user!.id };
    const row = await prisma.pengaturan.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data }, select: fields });
    ok(res, { ...row, contoh: false }, 'Pengaturan disimpan.');
  } catch (error) {
    next(error);
  }
}
