import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { ok } from '../utils/response';
import type { CreateReviewInput } from '../validators/reviews.validator';

// Ulasan klien setelah proyek selesai (Figma "Review Page Marketing"). Satu ulasan per proyek.

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.projectId!;
    const { rating, komentar, tampilPublik } = req.body as CreateReviewInput;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, review: { select: { id: true } }, order: { select: { clientId: true } } },
    });
    if (!project) throw new ApiError(404, 'Proyek tidak ditemukan.');
    if (project.status !== 'SELESAI') throw new ApiError(409, 'Ulasan dapat diberikan setelah proyek selesai.');
    if (project.review) throw new ApiError(409, 'Proyek ini sudah diulas.');

    const review = await prisma.review.create({
      data: { projectId, clientId: project.order.clientId, rating, komentar, tampilPublik },
      select: { id: true, rating: true, komentar: true, tampilPublik: true, createdAt: true },
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
        tampilPublik: true,
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

/**
 * Ulasan untuk landing page (publik, tanpa login). Hanya ulasan yang klien izinkan tampil, berkomentar, dan
 * berating 4 ke atas (KEPUTUSAN B-41). Data dibatasi nama, instansi, rating, dan komentar: tanpa email, nomor
 * WhatsApp, atau data proyek.
 */
export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await prisma.review.findMany({
      where: { tampilPublik: true, komentar: { not: null }, rating: { gte: 4 }, client: { isActive: true } },
      select: { id: true, rating: true, komentar: true, createdAt: true, client: { select: { namaInstansi: true, user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    ok(
      res,
      reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        komentar: review.komentar,
        nama: review.client.user.name,
        instansi: review.client.namaInstansi,
        createdAt: review.createdAt,
      })),
    );
  } catch (error) {
    next(error);
  }
}
