import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { progressByBidang, projectProgress } from '../utils/progress';
import { documentFields } from './orders.controller';
import { ok } from '../utils/response';
import type { CreateProjectInput, ReplaceMembersInput, UpdateProjectInput } from '../validators/projects.validator';

type CurrentUser = NonNullable<Request['user']>;
type MemberInput = CreateProjectInput['members'];

const projectFields = {
  id: true,
  kode: true,
  nama: true,
  nilai: true,
  tglMulai: true,
  targetSelesai: true,
  status: true,
  order: { select: { id: true, nomor: true, judul: true, kebutuhan: true, tenggatDiharapkan: true, client: { select: { namaInstansi: true } } } },
  tasks: { select: { persentase: true, bobot: true, bidang: true } },
} satisfies Prisma.ProjectSelect;

type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof projectFields }>;

function projectCode(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `PRJ-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function visibleWhere(user: CurrentUser): Prisma.ProjectWhereInput {
  if (user.role === 'TIM') return { members: { some: { userId: user.id } } };
  if (user.role === 'KLIEN') return { order: { client: { userId: user.id } } };
  return {};
}

// Nilai proyek hanya untuk pengurus yang berhak atas data uang (BRS 6.3).
function present(project: ProjectRow, role: CurrentUser['role']) {
  const { tasks, order, nilai, ...rest } = project;
  return {
    ...rest,
    klien: order.client.namaInstansi,
    nomorPesanan: order.nomor,
    kebutuhan: order.kebutuhan,
    // Tenggat yang diminta klien menjadi acuan selama Operasional belum menetapkan target selesai.
    tenggatDiharapkan: order.tenggatDiharapkan,
    progres: projectProgress(tasks),
    progresBidang: progressByBidang(tasks),
    ...(role === 'OPERASIONAL' || role === 'MARKETING' ? { nilai } : {}),
  };
}

async function assertMembersValid(members: MemberInput) {
  const ids = members.map((member) => member.userId);
  const count = await prisma.user.count({ where: { id: { in: ids }, role: 'TIM', isActive: true } });
  if (count !== ids.length) {
    throw new ApiError(400, 'Data yang dikirim tidak valid.', { members: ['Anggota harus akun Tim yang aktif.'] });
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const projects = await prisma.project.findMany({
      where: visibleWhere(user),
      select: { ...projectFields, members: { where: { userId: user.id }, select: { isPm: true } } },
      orderBy: { createdAt: 'desc' },
    });
    ok(res, projects.map(({ members, ...project }) => ({ ...present(project, user.role), isPm: members[0]?.isPm ?? false })));
  } catch (error) {
    next(error);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: req.projectId! },
      select: {
        ...projectFields,
        members: {
          select: { userId: true, posisi: true, isPm: true, user: { select: { name: true } } },
          orderBy: [{ isPm: 'desc' }, { posisi: 'asc' }],
        },
      },
    });
    const documents = await prisma.orderDocument.findMany({
      where: { orderId: project.order.id },
      select: documentFields,
      orderBy: { id: 'asc' },
    });
    const { members, ...rest } = project;
    ok(res, {
      ...present(rest, user.role),
      isPm: members.some((member) => member.userId === user.id && member.isPm),
      documents,
      // Susunan tim tidak untuk Klien (BRS 6.3).
      ...(user.role === 'KLIEN'
        ? {}
        : { members: members.map(({ user: anggota, ...member }) => ({ ...member, name: anggota.name })) }),
    });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId, members, tglMulai, targetSelesai, nama } = req.body as CreateProjectInput;
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, nilaiDisepakati: true } });
    if (!order) throw new ApiError(400, 'Data yang dikirim tidak valid.', { orderId: ['Pesanan tidak ditemukan.'] });
    if (order.status !== 'DISETUJUI' || !order.nilaiDisepakati) {
      throw new ApiError(409, 'Hanya pesanan yang sudah disetujui yang dapat dijadikan proyek.');
    }
    if (members.length) await assertMembersValid(members);
    const nilai = order.nilaiDisepakati;

    const id = await prisma.$transaction(async (tx) => {
      // Syarat status mencegah satu pesanan menjadi dua proyek saat diproses bersamaan.
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: 'DISETUJUI' },
        data: { status: 'MENJADI_PROYEK' },
      });
      if (!count) throw new ApiError(409, 'Pesanan ini sudah menjadi proyek.');
      const project = await tx.project.create({
        data: {
          kode: projectCode(),
          orderId,
          nama,
          nilai,
          tglMulai: tglMulai ? new Date(tglMulai) : null,
          targetSelesai: targetSelesai ? new Date(targetSelesai) : null,
          // Proyek berjalan begitu tim ditunjuk (BPMN 1); tanpa tim masih tahap persiapan.
          status: members.length ? 'BERJALAN' : 'PERSIAPAN',
          members: { create: members },
        },
        select: { id: true },
      });
      return project.id;
    });

    const project = await prisma.project.findUniqueOrThrow({ where: { id }, select: projectFields });
    ok(res, present(project, req.user!.role), 'Proyek dibuat.', 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { tglMulai, targetSelesai, ...data } = req.body as UpdateProjectInput;
    const toDate = (value?: string | null) => (value === undefined ? undefined : value ? new Date(value) : null);
    const project = await prisma.project.update({
      where: { id: req.projectId! },
      data: { ...data, tglMulai: toDate(tglMulai), targetSelesai: toDate(targetSelesai) },
      select: projectFields,
    });
    ok(res, present(project, req.user!.role), 'Proyek diperbarui.');
  } catch (error) {
    next(error);
  }
}

// Tugas milik anggota yang dikeluarkan menjadi tanpa penanggung jawab, riwayatnya tetap ada.
export async function replaceMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.projectId!;
    const { members } = req.body as ReplaceMembersInput;
    await assertMembersValid(members);
    const ids = members.map((member) => member.userId);

    await prisma.$transaction([
      prisma.projectMember.deleteMany({ where: { projectId } }),
      prisma.projectMember.createMany({ data: members.map((member) => ({ ...member, projectId })) }),
      prisma.task.updateMany({ where: { projectId, assigneeId: { notIn: ids } }, data: { assigneeId: null } }),
      prisma.project.updateMany({ where: { id: projectId, status: 'PERSIAPAN' }, data: { status: 'BERJALAN' } }),
    ]);
    ok(res, null, 'Tim proyek diperbarui.');
  } catch (error) {
    next(error);
  }
}
