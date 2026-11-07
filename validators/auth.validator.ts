import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Format email tidak valid.')),
  password: z.string().min(1, 'Kata sandi wajib diisi.').max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
