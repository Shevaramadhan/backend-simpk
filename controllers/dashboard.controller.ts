import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import { ok } from '../utils/response';

// Ringkasan untuk Dashboard Marketing (REQ-F06, Figma "Project Dashboard Page Marketing").
// Keuntungan = total pembayaran yang sudah diverifikasi (B-34); sistem tidak mencatat biaya.

const JUMLAH_BULAN = 8;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const awal = new Date(now.getFullYear(), now.getMonth() - (JUMLAH_BULAN - 1), 1);

    const [requestMasuk, projekMasuk, projekSelesai, pemasukan, buktiMenunggu, orders, projects, selesai, payments] = await Promise.all([
      prisma.order.count({ where: { status: { in: ['BARU', 'DITINJAU'] } } }),
      prisma.order.count({ where: { status: { in: ['DISETUJUI', 'MENJADI_PROYEK'] } } }),
      prisma.project.count({ where: { status: 'SELESAI' } }),
      prisma.payment.aggregate({ where: { statusVerifikasi: 'DITERIMA' }, _sum: { jumlah: true } }),
      prisma.payment.count({ where: { statusVerifikasi: 'MENUNGGU_VERIFIKASI' } }),
      prisma.order.findMany({ where: { createdAt: { gte: awal } }, select: { createdAt: true } }),
      prisma.project.findMany({ where: { createdAt: { gte: awal } }, select: { createdAt: true } }),
      // Belum ada kolom tanggal selesai; waktu perubahan terakhir proyek berstatus Selesai dipakai sebagai perkiraan.
      prisma.project.findMany({ where: { status: 'SELESAI', updatedAt: { gte: awal } }, select: { updatedAt: true } }),
      prisma.payment.findMany({ where: { statusVerifikasi: 'DITERIMA', verifiedAt: { gte: awal } }, select: { jumlah: true, verifiedAt: true } }),
    ]);

    const bulanan = Array.from({ length: JUMLAH_BULAN }, (_, index) => {
      const date = new Date(awal.getFullYear(), awal.getMonth() + index, 1);
      return { bulan: monthKey(date), request: 0, projek: 0, selesai: 0, pemasukan: 0 };
    });
    const byKey = new Map(bulanan.map((row) => [row.bulan, row]));
    for (const order of orders) byKey.get(monthKey(order.createdAt))!.request += 1;
    for (const project of projects) byKey.get(monthKey(project.createdAt))!.projek += 1;
    for (const project of selesai) byKey.get(monthKey(project.updatedAt))!.selesai += 1;
    for (const payment of payments) {
      const row = payment.verifiedAt && byKey.get(monthKey(payment.verifiedAt));
      if (row) row.pemasukan += Number(payment.jumlah);
    }

    ok(res, {
      requestMasuk,
      projekMasuk,
      projekSelesai,
      keuntungan: Number(pemasukan._sum.jumlah ?? 0),
      buktiMenunggu,
      bulanan,
    });
  } catch (error) {
    next(error);
  }
}
