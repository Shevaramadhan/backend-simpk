import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import { resolveStored } from '../middlewares/upload.middleware';
import ApiError from '../utils/ApiError';

// Berkas tidak disajikan sebagai folder publik; setiap unduhan diperiksa haknya. Bukan hak dijawab 404.
const NOT_FOUND = 'Berkas tidak ditemukan.';

function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(404, NOT_FOUND);
  return id;
}

function send(res: Response, next: NextFunction, relative: string, downloadName: string) {
  res.download(resolveStored(relative), downloadName, { dotfiles: 'deny' }, (error) => {
    if (error && !res.headersSent) next(new ApiError(404, NOT_FOUND));
  });
}

/** Dokumen pendukung: klien pemilik, Marketing, Operasional, dan anggota tim proyek dari pesanan itu. */
export async function dokumen(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const owner = { order: { client: { userId: user.id } } };
    const member = { order: { projects: { some: { members: { some: { userId: user.id } } } } } };
    const where = user.role === 'KLIEN' ? owner : user.role === 'TIM' ? member : {};
    const doc = await prisma.orderDocument.findFirst({ where: { id: idParam(req), ...where }, select: { path: true, namaFile: true } });
    if (!doc) throw new ApiError(404, NOT_FOUND);
    send(res, next, doc.path, doc.namaFile);
  } catch (error) {
    next(error);
  }
}

/** Bukti transfer: klien pemilik, Marketing, dan Operasional. */
export async function bukti(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    if (user.role === 'TIM') throw new ApiError(404, NOT_FOUND);
    const where = user.role === 'KLIEN' ? { invoice: { order: { client: { userId: user.id } } } } : {};
    const payment = await prisma.payment.findFirst({ where: { id: idParam(req), ...where }, select: { fileBukti: true, id: true } });
    if (!payment) throw new ApiError(404, NOT_FOUND);
    const ext = payment.fileBukti.split('.').pop();
    send(res, next, payment.fileBukti, `bukti-transfer-${payment.id}.${ext}`);
  } catch (error) {
    next(error);
  }
}
