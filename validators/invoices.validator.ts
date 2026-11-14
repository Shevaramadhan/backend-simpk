import { z } from 'zod';

const MAX_RUPIAH = 999_999_999_999;
// Formulir unggah mengirim angka sebagai teks.
const rupiah = (label: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
    z.number({ error: `${label} wajib diisi.` }).positive(`${label} harus lebih dari 0.`).max(MAX_RUPIAH, `${label} terlalu besar.`),
  );

export const createInvoiceSchema = z.object({
  keterangan: z.string({ error: 'Keterangan wajib diisi.' }).trim().min(2, 'Keterangan minimal 2 karakter.').max(160),
  total: rupiah('Nominal'),
  jatuhTempo: z.iso.date('Format tanggal tidak valid.').nullable().optional(),
});

export const createPaymentSchema = z.object({
  jumlah: rupiah('Jumlah transfer'),
  tglTransfer: z.iso.date('Tanggal transfer wajib diisi.'),
});

export const verifyPaymentSchema = z
  .object({
    status: z.enum(['DITERIMA', 'DITOLAK'], { error: 'Status tidak valid.' }),
    alasanDitolak: z.string().trim().max(255).optional(),
  })
  .refine((data) => data.status !== 'DITOLAK' || Boolean(data.alasanDitolak), {
    path: ['alasanDitolak'],
    message: 'Alasan penolakan wajib diisi.',
  });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
