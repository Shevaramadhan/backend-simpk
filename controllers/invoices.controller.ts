import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import { BUKTI, storeFile } from '../middlewares/upload.middleware';
import ApiError from '../utils/ApiError';
import { ok } from '../utils/response';
import type { CancelInvoiceInput, CreateInvoiceInput, CreatePaymentInput, UpdateInvoiceInput, VerifyPaymentInput } from '../validators/invoices.validator';

export const paymentFields = {
  id: true,
  jumlah: true,
  tglTransfer: true,
  statusVerifikasi: true,
  alasanDitolak: true,
  verifiedAt: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

export const invoiceFields = {
  id: true,
  nomor: true,
  keterangan: true,
  total: true,
  tglTerbit: true,
  jatuhTempo: true,
  status: true,
  alasanBatal: true,
  payments: { select: paymentFields, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.InvoiceSelect;

function invoiceNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `INV-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function idParam(req: Request, name: string, label: string): number {
  const id = Number(req.params[name]);
  if (!Number.isInteger(id)) throw new ApiError(404, `${label} tidak ditemukan.`);
  return id;
}

/** Marketing menerbitkan tagihan, misalnya DP lalu pelunasan, untuk pesanan yang sudah disetujui (BPMN 3). */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = idParam(req, 'id', 'Pesanan');
    const { jatuhTempo, ...data } = req.body as CreateInvoiceInput;
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
    if (order.status !== 'DISETUJUI' && order.status !== 'MENJADI_PROYEK') {
      throw new ApiError(409, 'Tagihan hanya untuk pesanan yang sudah disetujui.');
    }
    const invoice = await prisma.invoice.create({
      data: { ...data, orderId, nomor: invoiceNumber(), issuedById: req.user!.id, jatuhTempo: jatuhTempo ? new Date(jatuhTempo) : null },
      select: invoiceFields,
    });
    ok(res, invoice, 'Tagihan diterbitkan.', 201);
  } catch (error) {
    next(error);
  }
}

// Tagihan hanya boleh diubah atau dibatalkan selama belum ada bukti yang diterima atau sedang diperiksa,
// agar catatan keuangan yang sudah dikonfirmasi tidak berubah (B-36).
async function editableInvoice(id: number) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true, payments: { where: { statusVerifikasi: { in: ['DITERIMA', 'MENUNGGU_VERIFIKASI'] } }, select: { statusVerifikasi: true } } },
  });
  if (!invoice) throw new ApiError(404, 'Tagihan tidak ditemukan.');
  if (invoice.status === 'DIBATALKAN') throw new ApiError(409, 'Tagihan ini sudah dibatalkan.');
  if (invoice.status === 'LUNAS' || invoice.payments.some((p) => p.statusVerifikasi === 'DITERIMA')) {
    throw new ApiError(409, 'Tagihan yang sudah dibayar tidak dapat diubah atau dibatalkan.');
  }
  if (invoice.payments.length) throw new ApiError(409, 'Periksa dulu bukti transfer yang masuk sebelum mengubah tagihan.');
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = idParam(req, 'id', 'Tagihan');
    await editableInvoice(id);
    const { jatuhTempo, ...data } = req.body as UpdateInvoiceInput;
    const invoice = await prisma.invoice.update({
      where: { id },
      data: { ...data, jatuhTempo: jatuhTempo === undefined ? undefined : jatuhTempo ? new Date(jatuhTempo) : null },
      select: invoiceFields,
    });
    ok(res, invoice, 'Tagihan diperbarui.');
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const id = idParam(req, 'id', 'Tagihan');
    await editableInvoice(id);
    const { alasan } = req.body as CancelInvoiceInput;
    const invoice = await prisma.invoice.update({ where: { id }, data: { status: 'DIBATALKAN', alasanBatal: alasan }, select: invoiceFields });
    ok(res, invoice, 'Tagihan dibatalkan.');
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        ...invoiceFields,
        order: { select: { id: true, nomor: true, judul: true, client: { select: { namaInstansi: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    ok(res, invoices);
  } catch (error) {
    next(error);
  }
}

/** Klien mengunggah bukti transfer untuk tagihannya sendiri. Tagihan milik klien lain dijawab 404. */
export async function pay(req: Request, res: Response, next: NextFunction) {
  try {
    const invoiceId = idParam(req, 'id', 'Tagihan');
    const { jumlah, tglTransfer } = req.body as CreatePaymentInput;
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, order: { client: { userId: req.user!.id } } },
      select: { status: true, payments: { where: { statusVerifikasi: 'MENUNGGU_VERIFIKASI' }, select: { id: true } } },
    });
    if (!invoice) throw new ApiError(404, 'Tagihan tidak ditemukan.');
    if (invoice.status === 'LUNAS') throw new ApiError(409, 'Tagihan ini sudah lunas.');
    if (invoice.status === 'DIBATALKAN') throw new ApiError(409, 'Tagihan ini sudah dibatalkan.');
    if (invoice.payments.length) throw new ApiError(409, 'Bukti sebelumnya masih diperiksa Marketing.');
    if (!req.file) throw new ApiError(400, 'Data yang dikirim tidak valid.', { bukti: ['Unggah bukti transfer.'] });

    const stored = await storeFile(req.file, BUKTI, 'bukti');
    const payment = await prisma.payment.create({
      data: { invoiceId, jumlah, tglTransfer: new Date(tglTransfer), fileBukti: stored.path },
      select: paymentFields,
    });
    ok(res, payment, 'Bukti transfer dikirim.', 201);
  } catch (error) {
    next(error);
  }
}

/** Marketing memeriksa bukti. Diterima: tagihan lunas. Ditolak: klien dapat mengunggah ulang. */
export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const id = idParam(req, 'id', 'Pembayaran');
    const { status, alasanDitolak } = req.body as VerifyPaymentInput;
    const payment = await prisma.payment.findUnique({ where: { id }, select: { invoiceId: true } });
    if (!payment) throw new ApiError(404, 'Pembayaran tidak ditemukan.');

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id, statusVerifikasi: 'MENUNGGU_VERIFIKASI' },
        data: {
          statusVerifikasi: status,
          alasanDitolak: status === 'DITOLAK' ? alasanDitolak : null,
          verifiedById: req.user!.id,
          verifiedAt: new Date(),
        },
      });
      if (!count) throw new ApiError(409, 'Pembayaran ini sudah diperiksa.');
      if (status === 'DITERIMA') await tx.invoice.update({ where: { id: payment.invoiceId }, data: { status: 'LUNAS' } });
    });
    ok(res, await prisma.payment.findUnique({ where: { id }, select: paymentFields }), 'Pembayaran diperiksa.');
  } catch (error) {
    next(error);
  }
}
