import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { verifyToken } from '../utils/jwt';

// Akun diperiksa ke database pada setiap permintaan agar akun nonaktif langsung kehilangan akses.
export default async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Silakan masuk terlebih dahulu.');

    let userId: number;
    try {
      userId = Number(verifyToken(token).sub);
    } catch {
      throw new ApiError(401, 'Sesi tidak valid atau sudah berakhir.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) throw new ApiError(401, 'Sesi tidak valid atau sudah berakhir.');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
