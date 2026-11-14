import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';

type CurrentUser = NonNullable<Request['user']>;

// Proyek yang bukan haknya dijawab 404 agar keberadaannya tidak terungkap (REQ-NF02).
export async function canAccessProject(user: CurrentUser, projectId: number): Promise<boolean> {
  if (user.role === 'OPERASIONAL' || user.role === 'MARKETING') {
    return (await prisma.project.count({ where: { id: projectId } })) > 0;
  }
  if (user.role === 'TIM') {
    return (await prisma.projectMember.count({ where: { projectId, userId: user.id } })) > 0;
  }
  return (await prisma.project.count({ where: { id: projectId, order: { client: { userId: user.id } } } })) > 0;
}

export function requireProjectAccess(param = 'projectId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = Number(req.params[param]);
      if (!req.user || !Number.isInteger(projectId) || !(await canAccessProject(req.user, projectId))) {
        throw new ApiError(404, 'Proyek tidak ditemukan.');
      }
      req.projectId = projectId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Hak PM berlaku per proyek, bukan role login. Operasional tetap dapat mengelola sesuai BRS 6.3.
export function requireProjectPm(param = 'projectId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = Number(req.params[param]);
      if (!req.user || !Number.isInteger(projectId)) throw new ApiError(404, 'Proyek tidak ditemukan.');
      if (req.user.role === 'OPERASIONAL') {
        if (!(await prisma.project.count({ where: { id: projectId } }))) throw new ApiError(404, 'Proyek tidak ditemukan.');
      } else {
        const isPm = await prisma.projectMember.count({
          where: { projectId, userId: req.user.id, isPm: true },
        });
        if (!isPm) throw new ApiError(403, 'Hanya PM proyek yang dapat melakukan tindakan ini.');
      }
      req.projectId = projectId;
      next();
    } catch (error) {
      next(error);
    }
  };
}
