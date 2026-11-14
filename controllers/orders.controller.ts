import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import type { OrderStatus, Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import { DOKUMEN, resolveStored, storeFile, type StoredFile } from '../middlewares/upload.middleware';
import ApiError from '../utils/ApiError';
import { progressByBidang, projectProgress } from '../utils/progress';
import { ok } from '../utils/response';
import type { ApproveOrderInput, CreateOrderInput, UpdateOrderStatusInput } from '../validators/orders.validator';
import { invoiceFields } from './invoices.controller';

// Dokumen pendukung beserta pengunggahnya; dipakai detail pesanan dan detail proyek.
export const documentFields = {
  id: true,
  namaFile: true,
  mime: true,
  ukuran: true,
  createdAt: true,
  uploadedById: true,
  uploadedBy: { select: { name: true, role: true } },
} satisfies Prisma.OrderDocumentSelect;

const MAX_DOKUMEN = 10;

const orderFields = {
  id: true,
  nomor: true,
  judul: true,
  kebutuhan: true,
  anggaran: true,
  nilaiDisepakati: true,
  tenggatDiharapkan: true,
  status: true,
  alasanDitolak: true,
  createdAt: true,
  client: { select: { id: true, namaInstansi: true } },
  service: { select: { id: true, nama: true } },
  projects: { select: { id: true, status: true, _count: { select: { members: true } } }, take: 1 },
  // Penanda di daftar Request Marketing: ada bukti transfer yang perlu diperiksa.
  invoices: { select: { status: true, payments: { where: { statusVerifikasi: 'MENUNGGU_VERIFIKASI' }, select: { id: true } } } },
} satisfies Prisma.OrderSelect;

// Isi halaman Payment dan Detail: dokumen, tagihan, dan progres proyek (tanpa catatan teknis).
const detailFields = {
  ...orderFields,
  // Data kontak klien untuk tagihan cetak (FR-12, UC-16); hanya untuk pemilik pesanan dan pengurus.
  client: { select: { id: true, namaInstansi: true, noWhatsapp: true, alamat: true, user: { select: { name: true, email: true } } } },
  documents: { select: documentFields, orderBy: { id: 'asc' } },
  invoices: { select: invoiceFields, orderBy: { createdAt: 'asc' } },
  projects: {
    select: {
      id: true,
      kode: true,
      status: true,
      tasks: { select: { persentase: true, bobot: true, bidang: true } },
      review: { select: { rating: true, komentar: true, createdAt: true } },
    },
    take: 1,
  },
} satisfies Prisma.OrderSelect;

// Persetujuan diproses lewat endpoint tersendiri karena wajib disertai nilai kesepakatan.
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

function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(404, 'Pesanan tidak ditemukan.');
  return id;
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
  const stored: StoredFile[] = [];
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

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    for (const file of files) stored.push(await storeFile(file, DOKUMEN, 'dokumen'));

    const order = await prisma.order.create({
      data: {
        ...data,
        nomor: orderNumber(),
        clientId: ownerId,
        serviceId: serviceId ?? null,
        tenggatDiharapkan: tenggatDiharapkan ? new Date(tenggatDiharapkan) : null,
        documents: { create: stored.map((file) => ({ ...file, uploadedById: req.user!.id })) },
      },
      select: orderFields,
    });
    ok(res, order, 'Pengajuan project dikirim.', 201);
  } catch (error) {
    // Berkas yang sudah tersimpan dihapus lagi bila pengajuan gagal.
    await Promise.all(stored.map((file) => unlink(resolveStored(file.path)).catch(() => {})));
    next(error);
  }
}

// Klien menambah dokumen selama pengajuan belum diterima; Marketing (misalnya MoU) selama pesanan belum ditolak atau dibatalkan.
export async function addDocuments(req: Request, res: Response, next: NextFunction) {
  const stored: StoredFile[] = [];
  try {
    const id = idParam(req);
    const order = await prisma.order.findFirst({
      where: { id, ...(await visibleWhere(req.user!)) },
      select: { status: true, _count: { select: { documents: true } } },
    });
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const isKlien = req.user!.role === 'KLIEN';
    if (isKlien && order.status !== 'BARU' && order.status !== 'DITINJAU') {
      throw new ApiError(409, 'Dokumen hanya dapat ditambah selama pengajuan belum diterima.');
    }
    if (order.status === 'DITOLAK' || order.status === 'DIBATALKAN') throw new ApiError(409, 'Pesanan ini sudah ditutup.');
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) throw new ApiError(400, 'Data yang dikirim tidak valid.', { dokumen: ['Pilih minimal satu berkas.'] });
    if (order._count.documents + files.length > MAX_DOKUMEN) {
      throw new ApiError(400, 'Data yang dikirim tidak valid.', { dokumen: [`Maksimal ${MAX_DOKUMEN} dokumen per pesanan.`] });
    }
    for (const file of files) stored.push(await storeFile(file, DOKUMEN, 'dokumen'));
    await prisma.orderDocument.createMany({ data: stored.map((file) => ({ ...file, orderId: id, uploadedById: req.user!.id })) });
    ok(res, await prisma.orderDocument.findMany({ where: { orderId: id }, select: documentFields, orderBy: { id: 'asc' } }), 'Dokumen ditambahkan.', 201);
  } catch (error) {
    await Promise.all(stored.map((file) => unlink(resolveStored(file.path)).catch(() => {})));
    next(error);
  }
}

// Hanya pengunggah yang dapat menghapus dokumennya; klien hanya selama pengajuan belum diterima.
export async function removeDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const id = idParam(req);
    const docId = Number(req.params.docId);
    if (!Number.isInteger(docId)) throw new ApiError(404, 'Dokumen tidak ditemukan.');
    const doc = await prisma.orderDocument.findFirst({
      where: { id: docId, orderId: id, order: await visibleWhere(req.user!) },
      select: { path: true, uploadedById: true, order: { select: { status: true } } },
    });
    if (!doc) throw new ApiError(404, 'Dokumen tidak ditemukan.');
    if (doc.uploadedById !== req.user!.id) throw new ApiError(403, 'Anda hanya dapat menghapus dokumen yang Anda unggah.');
    if (req.user!.role === 'KLIEN' && doc.order.status !== 'BARU' && doc.order.status !== 'DITINJAU') {
      throw new ApiError(409, 'Dokumen tidak dapat dihapus setelah pengajuan diterima.');
    }
    await prisma.orderDocument.delete({ where: { id: docId } });
    await unlink(resolveStored(doc.path)).catch(() => {});
    ok(res, null, 'Dokumen dihapus.');
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
    const order = await prisma.order.findFirst({
      where: { id: idParam(req), ...(await visibleWhere(req.user!)) },
      select: detailFields,
    });
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const { projects, ...rest } = order;
    const project = projects[0];
    ok(res, {
      ...rest,
      project: project
        ? {
            id: project.id,
            kode: project.kode,
            status: project.status,
            progres: projectProgress(project.tasks),
            progresBidang: progressByBidang(project.tasks),
            review: project.review,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = idParam(req);
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

// Disetujui setelah MoU sepakat, dari status Baru atau Perlu Diskusi. Nilainya menjadi dasar nilai proyek.
export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const id = idParam(req);
    const { nilaiDisepakati } = req.body as ApproveOrderInput;

    if (!(await prisma.order.count({ where: { id } }))) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    const { count } = await prisma.order.updateMany({
      where: { id, status: { in: ['BARU', 'DITINJAU'] } },
      data: { status: 'DISETUJUI', nilaiDisepakati, alasanDitolak: null },
    });
    if (!count) throw new ApiError(409, 'Pesanan ini tidak dapat disetujui lagi.');

    ok(res, await prisma.order.findUnique({ where: { id }, select: orderFields }), 'Pesanan disetujui.');
  } catch (error) {
    next(error);
  }
}
