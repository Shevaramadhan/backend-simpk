import { z } from 'zod';

const profil = {
  namaInstansi: z.string({ error: 'Nama instansi wajib diisi.' }).trim().min(2, 'Nama instansi minimal 2 karakter.').max(160),
  jenisKlien: z.string({ error: 'Jenis klien wajib diisi.' }).trim().min(2, 'Jenis klien wajib diisi.').max(40),
  noWhatsapp: z.string().trim().max(25).nullable().optional(),
  alamat: z.string().trim().max(255).nullable().optional(),
};

export const createClientSchema = z.object({
  name: z.string({ error: 'Nama wajib diisi.' }).trim().min(2, 'Nama minimal 2 karakter.').max(120),
  email: z.string({ error: 'Email wajib diisi.' }).trim().toLowerCase().pipe(z.email('Format email tidak valid.')),
  password: z.string({ error: 'Kata sandi wajib diisi.' }).min(8, 'Kata sandi minimal 8 karakter.').max(200),
  ...profil,
});

export const updateClientSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(120).optional(),
    namaInstansi: profil.namaInstansi.optional(),
    jenisKlien: profil.jenisKlien.optional(),
    noWhatsapp: profil.noWhatsapp,
    alamat: profil.alamat,
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Tidak ada data yang diubah.');

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
