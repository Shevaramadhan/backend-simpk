import type { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { ok } from '../utils/response';
import type { CreateCommentInput } from '../validators/comments.validator';

type CurrentUser = NonNullable<Request['user']>;

const commentFields = {
  id: true,
  pesan: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} satisfies Prisma.OrderCommentSelect;

function orderIdParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(404, 'Pesanan tidak ditemukan.');
  return id;
}

// Klien pemilik, Marketing, Operasional, dan anggota Tim proyek terkait dapat berdiskusi.
// Pesanan atau proyek yang bukan hak pengguna dijawab 404 agar keberadaannya tidak terungkap.
async function findAccessibleOrder(user: CurrentUser, orderId: number) {
  const where: Prisma.OrderWhereInput = { id: orderId };
  if (user.role === 'KLIEN') {
    where.client = { userId: user.id };
  } else if (user.role === 'TIM') {
    where.projects = { some: { members: { some: { userId: user.id } } } };
  }
  const order = await prisma.order.findFirst({
    where,
    select: {
      id: true,
      status: true,
      projects: { select: { status: true }, take: 1 },
    },
  });
  if (!order) throw new ApiError(404, 'Pesanan tidak ditemukan.');
  return order;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await findAccessibleOrder(req.user!, orderIdParam(req));
    const comments = await prisma.orderComment.findMany({
      where: { orderId: order.id },
      select: commentFields,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    ok(res, comments);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await findAccessibleOrder(req.user!, orderIdParam(req));
    if (order.status === 'DITOLAK' || order.status === 'DIBATALKAN' || order.projects[0]?.status === 'DIBATALKAN') {
      throw new ApiError(409, 'Pengajuan atau proyek ini sudah ditutup dan tidak menerima komentar baru.');
    }
    const { pesan } = req.body as CreateCommentInput;
    const comment = await prisma.orderComment.create({
      data: { orderId: order.id, authorId: req.user!.id, pesan },
      select: commentFields,
    });
    ok(res, comment, 'Komentar terkirim.', 201);
  } catch (error) {
    next(error);
  }
}
