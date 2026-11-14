import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { hashPassword } from '../utils/password';
import { ok } from '../utils/response';
import type { CreateUserInput, UpdateUserInput } from '../validators/users.validator';

const publicFields = { id: true, name: true, email: true, role: true, isActive: true, keahlian: true, createdAt: true };
const listFields = { ...publicFields, _count: { select: { memberships: true } } };

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'KLIEN' } },
      select: listFields,
      orderBy: { name: 'asc' },
    });
    ok(res, users.map(({ _count, ...user }) => ({ ...user, jumlahProject: _count.memberships })));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { password, keahlian, ...data } = req.body as CreateUserInput;
    const user = await prisma.user.create({
      // Keahlian hanya dicatat untuk akun Tim.
      data: { ...data, keahlian: data.role === 'TIM' ? (keahlian ?? null) : null, passwordHash: await hashPassword(password) },
      select: publicFields,
    });
    ok(res, user, 'Akun dibuat.', 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const body = req.body as UpdateUserInput;
    if (!Number.isInteger(id)) throw new ApiError(404, 'Pengguna tidak ditemukan.');
    if (id === req.user!.id && (body.isActive === false || body.role)) {
      throw new ApiError(400, 'Anda tidak dapat menonaktifkan atau mengubah role akun sendiri.');
    }
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target || target.role === 'KLIEN') throw new ApiError(404, 'Pengguna tidak ditemukan.');

    const user = await prisma.user.update({ where: { id }, data: body, select: publicFields });
    // Tautan reset yang sudah terkirim ke email lama tidak boleh tetap berlaku.
    if (body.email) await prisma.passwordReset.deleteMany({ where: { userId: id } });
    ok(res, user, 'Akun diperbarui.');
  } catch (error) {
    next(error);
  }
}
