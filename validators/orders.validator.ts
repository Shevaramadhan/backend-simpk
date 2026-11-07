import { z } from 'zod';

export const createOrderSchema = z.object({
  clientId: z.number().int().positive().optional(),
  serviceId: z.number().int().positive().nullable().optional(),
  kebutuhan: z.string({ error: 'Kebutuhan wajib diisi.' }).trim().min(10, 'Jelaskan kebutuhan minimal 10 karakter.').max(5000),
  anggaran: z.number().nonnegative('Anggaran tidak boleh negatif.').nullable().optional(),
  tenggatDiharapkan: z.iso.date('Format tanggal tidak valid.').nullable().optional(),
});

// MENJADI_PROYEK hanya diubah oleh modul proyek, bukan lewat endpoint ini.
export const updateOrderStatusSchema = z
  .object({
    status: z.enum(['DITINJAU', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN'], { error: 'Status tidak valid.' }),
    alasanDitolak: z.string().trim().max(255).optional(),
  })
  .refine((data) => data.status !== 'DITOLAK' || Boolean(data.alasanDitolak), {
    path: ['alasanDitolak'],
    message: 'Alasan penolakan wajib diisi.',
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
