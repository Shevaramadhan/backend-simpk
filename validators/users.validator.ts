import { z } from 'zod';

// Akun klien tidak dibuat di sini: caranya menunggu jawaban isu terbuka.
const internalRole = z.enum(['MARKETING', 'OPERASIONAL', 'TIM']);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(200),
  role: internalRole,
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    role: internalRole.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Tidak ada data yang diubah.');

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
