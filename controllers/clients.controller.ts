import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { hashPassword } from '../utils/password';
import { ok } from '../utils/response';
import type { CreateClientInput, UpdateClientInput } from '../validators/clients.validator';

const clientFields = {
  id: true,
  namaInstansi: true,
  jenisKlien: true,
  noWhatsapp: true,
  alamat: true,
  isActive: true,
  user: { select: { id: true, name: true, email: true } },
};

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const clients = await prisma.client.findMany({ select: clientFields, orderBy: { namaInstansi: 'asc' } });
    ok(res, clients);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, ...profil } = req.body as CreateClientInput;
    const client = await prisma.client.create({
      data: {
        ...profil,
        user: { create: { name, email, role: 'KLIEN', passwordHash: await hashPassword(password) } },
      },
      select: clientFields,
    });
    ok(res, client, 'Akun klien dibuat.', 201);
  } catch (error) {
    next(error);
  }
}

// Status aktif klien dan akun login diubah bersamaan agar klien nonaktif tidak dapat masuk.
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ApiError(404, 'Klien tidak ditemukan.');
    const { name, isActive, ...profil } = req.body as UpdateClientInput;
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...profil,
        ...(isActive === undefined ? {} : { isActive }),
        ...(name === undefined && isActive === undefined ? {} : { user: { update: { name, isActive } } }),
      },
      select: clientFields,
    });
    ok(res, client, 'Data klien diperbarui.');
  } catch (error) {
    next(error);
  }
}
