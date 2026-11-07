import { randomBytes } from 'node:crypto';
import type { OrderStatus, Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { ok } from '../utils/response';
import type { ApproveOrderInput, CreateOrderInput, UpdateOrderStatusInput } from '../validators/orders.validator';

const orderFields = {
  id: true,
  nomor: true,
  kebutuhan: true,
  anggaran: true,
  nilaiDisepakati: true,
  tenggatDiharapkan: true,
  status: true,
  alasanDitolak: true,
  createdAt: true,
  client: { select: { id: true, namaInstansi: true } },
  service: { select: { id: true, nama: true } },
} satisfies Prisma.OrderSelect;

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  BARU: ['DITINJAU', 'DITOLAK', 'DIBATALKAN'],
  DITINJAU: ['DITOLAK', 'DIBATALKAN'],
  DISETUJUI: ['DIBATALKAN'],
  DITOLAK: [],
  DIBATALKAN: [],
  MENJADI_PROYEK: [],
};

function orderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `ORD-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

async function ownClientId(userId: number): Promise<number> {
  const client = await prisma.client.findUnique({ where: { userId }, select: { id: true } });
  if (!client) throw new ApiError(403, 'Profil klien tidak ditemukan.');
  return client.id;
}

// Klien hanya melihat pesanan miliknya. Pesanan klien lain dijawab 404.
async function visibleWhere(user: NonNullable<Request['user']>): Promise<Prisma.OrderWhereInput> {
  return user.role === 'KLIEN' ? { clientId: await ownClientId(user.id) } : {};
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, serviceId, tenggatDiharapkan, ...data } = req.body as CreateOrderInput;
    const isKlien = req.user!.role === 'KLIEN';

    // Klien selalu memakai profilnya sendiri; clientId dari permintaan diabaikan.
    const ownerId = isKlien ? await ownClientId(req.user!.id) : clientId;
    if (!ownerId) throw new ApiError(400, 'Data yang dikirim tidak valid.', { clientId: ['Klien wajib dipilih.'] });

    if (!isKlien && !(await prisma.client.count({ where: { id: ownerId } }))) {
      throw new ApiError(400, 'Data yang dikirim tidak valid.', { clientId: ['Klien tidak ditemukan.'] });
    }
    if (serviceId && !(await prisma.service.count({ where: { id: serviceId, isVisible: true } }))) {
      throw new ApiError(400, 'Data yang dikirim tidak valid.', { serviceId: ['Jasa tidak tersedia.'] });
    }

    const order = await prisma.order.create({
      data: {
        ...data,
        nomor: orderNumber(),
        clientId: ownerId,
        serviceId: serviceId ?? null,
        tenggatDiharapkan: tenggatDiharapkan ? new Date(tenggatDiharapkan) : null,
      },
      select: orderFields,
    });
    ok(res, order, 'Pesanan dikirim.', 201);
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await prisma.order.findMany({
      where: await visibleWhere(req.user!),
      select: orderFields,
      orderBy: { createdAt: 'desc' },
    });
    ok(res, orders);
  } catch (error) {
    next(error);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const order = await prisma.order.findFirst({
      where: { id, ...(await visibleWhere(req.user!)) },
      select: orderFields,
    });
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    ok(res, order);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const { status, alasanDitolak } = req.body as UpdateOrderStatusInput;

    const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    if (!NEXT_STATUS[order.status].includes(status)) {
      throw new ApiError(409, 'Status pesanan tidak dapat diubah ke status tersebut.');
    }

    // Syarat status lama mencegah dua orang mengubah pesanan yang sama bersamaan.
    const { count } = await prisma.order.updateMany({
      where: { id, status: order.status },
      data: { status, alasanDitolak: status === 'DITOLAK' ? alasanDitolak : null },
    });
    if (!count) throw new ApiError(409, 'Pesanan baru saja diubah pengguna lain. Muat ulang halaman.');

    ok(res, await prisma.order.findUnique({ where: { id }, select: orderFields }), 'Status pesanan diperbarui.');
  } catch (error) {
    next(error);
  }
}

// Disetujui setelah MoU sepakat. Nilainya menjadi dasar nilai proyek.
export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const { nilaiDisepakati } = req.body as ApproveOrderInput;

    if (!(await prisma.order.count({ where: { id } }))) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const { count } = await prisma.order.updateMany({
      where: { id, status: 'DITINJAU' },
      data: { status: 'DISETUJUI', nilaiDisepakati },
    });
    if (!count) throw new ApiError(409, 'Hanya pesanan yang sedang ditinjau yang dapat disetujui.');

    ok(res, await prisma.order.findUnique({ where: { id }, select: orderFields }), 'Pesanan disetujui.');
  } catch (error) {
    next(error);
  }
}
