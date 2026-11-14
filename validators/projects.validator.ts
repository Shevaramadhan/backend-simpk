import { z } from 'zod';

const tanggal = z.iso.date('Format tanggal tidak valid.').nullable().optional();
const urutanTanggal = {
  path: ['targetSelesai'],
  message: 'Target selesai tidak boleh sebelum tanggal mulai.',
};
const tanggalBerurutan = (data: { tglMulai?: string | null; targetSelesai?: string | null }) =>
  !data.tglMulai || !data.targetSelesai || data.tglMulai <= data.targetSelesai;

const membersSchema = z
  .array(
    z.object({
      userId: z.number().int().positive(),
      posisi: z.string({ error: 'Posisi wajib diisi.' }).trim().min(2, 'Posisi minimal 2 karakter.').max(60),
      isPm: z.boolean().default(false),
    }),
    { error: 'Anggota tim wajib diisi.' },
  )
  .refine((members) => !members.length || members.filter((member) => member.isPm).length === 1, 'Tentukan tepat satu PM.')
  .refine((members) => new Set(members.map((member) => member.userId)).size === members.length, 'Anggota tidak boleh ganda.');

export const createProjectSchema = z
  .object({
    orderId: z.number({ error: 'Pesanan wajib dipilih.' }).int().positive(),
    nama: z.string({ error: 'Nama proyek wajib diisi.' }).trim().min(3, 'Nama proyek minimal 3 karakter.').max(160),
    tglMulai: tanggal,
    targetSelesai: tanggal,
    members: membersSchema.default([]),
  })
  .refine(tanggalBerurutan, urutanTanggal);

export const updateProjectSchema = z
  .object({
    nama: z.string().trim().min(3, 'Nama proyek minimal 3 karakter.').max(160).optional(),
    tglMulai: tanggal,
    targetSelesai: tanggal,
    status: z.enum(['PERSIAPAN', 'BERJALAN', 'DITUNDA', 'SELESAI', 'DIBATALKAN'], { error: 'Status tidak valid.' }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Tidak ada data yang diubah.')
  .refine(tanggalBerurutan, urutanTanggal);

export const replaceMembersSchema = z.object({ members: membersSchema.refine((members) => members.length > 0, 'Pilih minimal satu anggota.') });

const taskFields = {
  judul: z.string({ error: 'Judul tugas wajib diisi.' }).trim().min(3, 'Judul tugas minimal 3 karakter.').max(200),
  deskripsi: z.string().trim().max(5000).nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  tenggat: tanggal,
  prioritas: z.enum(['RENDAH', 'SEDANG', 'TINGGI'], { error: 'Prioritas tidak valid.' }).optional(),
  bidang: z.enum(['UI_UX', 'FRONTEND', 'BACKEND', 'INTEGRASI'], { error: 'Pilih bidang: UI/UX, FrontEnd, BackEnd, atau Integrasi.' }),
  bobot: z.number().int('Bobot harus bilangan bulat.').min(1, 'Bobot minimal 1.').max(10, 'Bobot maksimal 10.').optional(),
};

export const createTaskSchema = z.object(taskFields);

export const updateTaskSchema = z
  .object({ ...taskFields, judul: taskFields.judul.optional(), bidang: taskFields.bidang.optional() })
  .refine((data) => Object.keys(data).length > 0, 'Tidak ada data yang diubah.');

export const progressUpdateSchema = z
  .object({
    persentase: z.number({ error: 'Persentase wajib diisi.' }).int('Persentase harus bilangan bulat.').min(0, 'Persentase minimal 0.').max(100, 'Persentase maksimal 100.'),
    catatanTeknis: z.string().trim().max(5000).optional(),
    catatanKlien: z.string().trim().max(5000).optional(),
  })
  .transform((data) => ({
    persentase: data.persentase,
    catatanTeknis: data.catatanTeknis || null,
    catatanKlien: data.catatanKlien || null,
  }));

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ReplaceMembersInput = z.infer<typeof replaceMembersSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
