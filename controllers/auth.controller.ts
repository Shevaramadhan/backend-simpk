import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { signToken } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';
import { ok } from '../utils/response';
import type { LoginInput } from '../validators/auth.validator';

// Dibandingkan walau email tidak ada, agar waktu respons tidak membocorkan email terdaftar.
const dummyHash = hashPassword('akun-tidak-ada');

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as LoginInput;
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await comparePassword(password, user ? user.passwordHash : await dummyHash);
    if (!user || !valid || !user.isActive) throw new ApiError(401, 'Email atau kata sandi salah.');

    ok(res, {
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }, 'Berhasil masuk.');
  } catch (error) {
    next(error);
  }
}

export function me(req: Request, res: Response) {
  const { id, name, email, role } = req.user!;
  ok(res, { id, name, email, role });
}
