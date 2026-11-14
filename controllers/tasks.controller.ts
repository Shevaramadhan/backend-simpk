import type { Prisma, Role, TaskStatus } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { ok } from '../utils/response';
import type { CreateTaskInput, ProgressUpdateInput, UpdateTaskInput } from '../validators/projects.validator';

// Tim pelaksana melihat isi tugas. Klien dan Marketing hanya melihat ringkasannya (B-26).
const isDeliveryTeam = (role: Role) => role === 'OPERASIONAL' || role === 'TIM';

const summaryFields = { id: true, judul: true, status: true, persentase: true, bidang: true, bobot: true } satisfies Prisma.TaskSelect;
const fullFields = {
  ...summaryFields,
  deskripsi: true,
  tenggat: true,
  prioritas: true,
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;

function statusFor(persentase: number): TaskStatus {
  if (persentase === 0) return 'BELUM_DIKERJAKAN';
  return persentase === 100 ? 'SELESAI' : 'DIKERJAKAN';
}

async function assertAssigneeIsMember(projectId: number, assigneeId?: number | null) {
  if (assigneeId && !(await prisma.projectMember.count({ where: { projectId, userId: assigneeId } }))) {
    throw new ApiError(400, 'Data yang dikirim tidak valid.', { assigneeId: ['Penanggung jawab harus anggota proyek.'] });
  }
}

function taskId(req: Request): number {
  const id = Number(req.params.taskId);
  if (!Number.isInteger(id)) throw new ApiError(404, 'Tugas tidak ditemukan.');
  return id;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.projectId! },
      select: isDeliveryTeam(req.user!.role) ? fullFields : summaryFields,
      orderBy: { createdAt: 'asc' },
    });
    ok(res, tasks);
  } catch (error) {
    next(error);
  }
}

export async function mine(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user!.id },
      select: { ...fullFields, project: { select: { id: true, nama: true } } },
      orderBy: [{ tenggat: 'asc' }, { createdAt: 'asc' }],
    });
    ok(res, tasks);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.projectId!;
    const { tenggat, ...data } = req.body as CreateTaskInput;
    await assertAssigneeIsMember(projectId, data.assigneeId);
    const task = await prisma.task.create({
      data: { ...data, projectId, tenggat: tenggat ? new Date(tenggat) : null },
      select: fullFields,
    });
    ok(res, task, 'Tugas dibuat.', 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.projectId!;
    const id = taskId(req);
    const { tenggat, ...data } = req.body as UpdateTaskInput;
    await assertAssigneeIsMember(projectId, data.assigneeId);
    if (!(await prisma.task.count({ where: { id, projectId } }))) throw new ApiError(404, 'Tugas tidak ditemukan.');
    const task = await prisma.task.update({
      where: { id },
      data: { ...data, tenggat: tenggat === undefined ? undefined : tenggat ? new Date(tenggat) : null },
      select: fullFields,
    });
    ok(res, task, 'Tugas diperbarui.');
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = taskId(req);
    const { count } = await prisma.task.deleteMany({ where: { id, projectId: req.projectId! } });
    if (!count) throw new ApiError(404, 'Tugas tidak ditemukan.');
    ok(res, null, 'Tugas dihapus.');
  } catch (error) {
    next(error);
  }
}

// PM dan Operasional boleh memperbarui semua tugas; anggota hanya tugas miliknya (B-24).
async function canUpdateTask(user: NonNullable<Request['user']>, projectId: number, assigneeId: number | null) {
  if (user.role === 'OPERASIONAL' || assigneeId === user.id) return true;
  return (await prisma.projectMember.count({ where: { projectId, userId: user.id, isPm: true } })) > 0;
}

export async function addProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.projectId!;
    const id = taskId(req);
    const body = req.body as ProgressUpdateInput;

    const task = await prisma.task.findFirst({
      where: { id, projectId },
      select: { assigneeId: true, project: { select: { status: true } } },
    });
    if (!task) throw new ApiError(404, 'Tugas tidak ditemukan.');
    if (!(await canUpdateTask(req.user!, projectId, task.assigneeId))) {
      throw new ApiError(403, 'Anda hanya dapat memperbarui tugas milik Anda.');
    }
    if (task.project.status === 'SELESAI' || task.project.status === 'DIBATALKAN') {
      throw new ApiError(409, 'Proyek sudah ditutup.');
    }

    await prisma.$transaction([
      prisma.progressUpdate.create({ data: { ...body, taskId: id, authorId: req.user!.id } }),
      prisma.task.update({ where: { id }, data: { persentase: body.persentase, status: statusFor(body.persentase) } }),
    ]);
    ok(res, await prisma.task.findUnique({ where: { id }, select: fullFields }), 'Progres diperbarui.', 201);
  } catch (error) {
    next(error);
  }
}

// Dua query terpisah: catatanTeknis tidak pernah dipilih untuk Klien dan Marketing (REQ-F05, REQ-NF02).
export async function updates(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.projectId!;
    const orderBy = { createdAt: 'desc' } as const;
    const task = { select: { id: true, judul: true } };

    if (isDeliveryTeam(req.user!.role)) {
      const rows = await prisma.progressUpdate.findMany({
        where: { task: { projectId } },
        select: {
          id: true,
          persentase: true,
          catatanTeknis: true,
          catatanKlien: true,
          createdAt: true,
          task,
          author: { select: { name: true } },
        },
        orderBy,
      });
      return ok(res, rows);
    }

    const rows = await prisma.progressUpdate.findMany({
      where: { task: { projectId }, catatanKlien: { not: null } },
      select: { id: true, persentase: true, catatanKlien: true, createdAt: true, task },
      orderBy,
    });
    ok(res, rows);
  } catch (error) {
    next(error);
  }
}
