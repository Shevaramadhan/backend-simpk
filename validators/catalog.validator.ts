import { z } from 'zod';

export const createServiceSchema = z
  .object({
    nama: z.string({ error: 'Nama jasa wajib diisi.' }).trim().min(3, 'Nama jasa minimal 3 karakter.').max(160),
    deskripsi: z.string({ error: 'Deskripsi wajib diisi.' }).trim().min(10, 'Deskripsi minimal 10 karakter.'),
    hargaMin: z.number({ error: 'Harga minimum wajib berupa angka.' }).nonnegative('Harga tidak boleh negatif.'),
    hargaMax: z.number({ error: 'Harga maksimum wajib berupa angka.' }).nonnegative('Harga tidak boleh negatif.'),
    estimasiHari: z.number({ error: 'Estimasi waktu wajib berupa angka.' }).int().positive('Estimasi waktu harus lebih dari 0.'),
    isVisible: z.boolean().optional(),
  })
  .refine((data) => data.hargaMax >= data.hargaMin, {
    path: ['hargaMax'],
    message: 'Harga maksimum tidak boleh lebih kecil dari harga minimum.',
  });

export const updateServiceSchema = createServiceSchema;

export const portfolioSchema = z.object({
  serviceId: z.number().int().positive().nullable().optional(),
  judul: z.string({ error: 'Judul wajib diisi.' }).trim().min(3, 'Judul minimal 3 karakter.').max(160),
  deskripsi: z.string({ error: 'Deskripsi wajib diisi.' }).trim().min(10, 'Deskripsi minimal 10 karakter.'),
  tahun: z.number().int().min(2000).max(2100).nullable().optional(),
});

export type ServiceInput = z.infer<typeof createServiceSchema>;
export type PortfolioInput = z.infer<typeof portfolioSchema>;
