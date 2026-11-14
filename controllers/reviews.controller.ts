import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { ok } from '../utils/response';
import type { CreateReviewInput } from '../validators/reviews.validator';

// Ulasan klien setelah proyek selesai (Figma "Review Page Marketing"). Satu ulasan per proyek.

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.projectId!;
    const { rating, komentar } = req.body as CreateReviewInput;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, review: { select: { id: true } }, order: { select: { clientId: true } } },
    });
    if (!project) throw new ApiError(404, 'Proyek tidak ditemukan.');
    if (project.status !== 'SELESAI') throw new ApiError(409, 'Ulasan dapat diberikan setelah proyek selesai.');
    if (project.review) throw new ApiError(409, 'Proyek ini sudah diulas.');

    const review = await prisma.review.create({
      data: { projectId, clientId: project.order.clientId, rating, komentar },
      select: { id: true, rating: true, komentar: true, createdAt: true },
    });
    ok(res, review, 'Terima kasih atas ulasan Anda.', 201);
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await prisma.review.findMany({
      select: {
        id: true,
        rating: true,
        komentar: true,
        createdAt: true,
        project: { select: { id: true, kode: true, nama: true, order: { select: { kebutuhan: true } } } },
        client: { select: { namaInstansi: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    ok(res, reviews);
  } catch (error) {
    next(error);
  }
}
