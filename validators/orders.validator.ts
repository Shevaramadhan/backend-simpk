import { z } from 'zod';

export const createOrderSchema = z.object({
  clientId: z.number().int().positive().optional(),
  serviceId: z.number().int().positive().nullable().optional(),
  kebutuhan: z.string({ error: 'Kebutuhan wajib diisi.' }).trim().min(10, 'Jelaskan kebutuhan minimal 10 karakter.').max(5000),
  anggaran: z.number().nonnegative('Anggaran tidak boleh negatif.').max(999_999_999_999, 'Anggaran terlalu besar.').nullable().optional(),
  tenggatDiharapkan: z.iso.date('Format tanggal tidak valid.').nullable().optional(),
});

// DISETUJUI punya jalur sendiri karena wajib disertai nilai; MENJADI_PROYEK diisi modul proyek.
export const updateOrderStatusSchema = z
  .object({
    status: z.enum(['DITINJAU', 'DITOLAK', 'DIBATALKAN'], { error: 'Status tidak valid.' }),
    alasanDitolak: z.string().trim().max(255).optional(),
  })
  .refine((data) => data.status !== 'DITOLAK' || Boolean(data.alasanDitolak), {
    path: ['alasanDitolak'],
    message: 'Alasan penolakan wajib diisi.',
  });

export const approveOrderSchema = z.object({
  nilaiDisepakati: z.number({ error: 'Nilai kesepakatan wajib diisi.' }).positive('Nilai kesepakatan harus lebih dari 0.').max(999_999_999_999, 'Nilai kesepakatan terlalu besar.'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ApproveOrderInput = z.infer<typeof approveOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
