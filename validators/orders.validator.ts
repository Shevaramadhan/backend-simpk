import { z } from 'zod';

const MAX_RUPIAH = 999_999_999_999;
// Form pengajuan klien dikirim sebagai multipart, sehingga angka datang sebagai teks dan kosong berarti tidak diisi.
const fromText = (value: unknown) => (value === '' || value === 'null' ? null : typeof value === 'string' ? Number(value) : value);

export const createOrderSchema = z.object({
  clientId: z.preprocess(fromText, z.number().int().positive().nullable().optional()),
  serviceId: z.preprocess(fromText, z.number().int().positive().nullable().optional()),
  judul: z.string({ error: 'Nama project wajib diisi.' }).trim().min(3, 'Nama project minimal 3 karakter.').max(160),
  kebutuhan: z.string({ error: 'Deskripsi project wajib diisi.' }).trim().min(10, 'Jelaskan project minimal 10 karakter.').max(5000),
  anggaran: z.preprocess(fromText, z.number().nonnegative('Anggaran tidak boleh negatif.').max(MAX_RUPIAH, 'Anggaran terlalu besar.').nullable().optional()),
  tenggatDiharapkan: z.preprocess((v) => (v === '' ? null : v), z.iso.date('Format tanggal tidak valid.').nullable().optional()),
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
  nilaiDisepakati: z.number({ error: 'Nilai kesepakatan wajib diisi.' }).positive('Nilai kesepakatan harus lebih dari 0.').max(MAX_RUPIAH, 'Nilai kesepakatan terlalu besar.'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ApproveOrderInput = z.infer<typeof approveOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
