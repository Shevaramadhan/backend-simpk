import { z } from 'zod';
import { emailField } from './auth.validator';

// Akun klien dibuat lewat pendaftaran, bukan di sini.
const internalRole = z.enum(['MARKETING', 'OPERASIONAL', 'TIM']);
// Keahlian utama worker, diketik bebas. Teks kosong disimpan sebagai null.
const keahlian = z
  .string()
  .trim()
  .max(60, 'Keahlian maksimal 60 karakter.')
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailField,
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(200),
  role: internalRole,
  keahlian,
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: emailField.optional(),
    role: internalRole.optional(),
    isActive: z.boolean().optional(),
    keahlian,
  })
  .refine((data) => Object.keys(data).length > 0, 'Tidak ada data yang diubah.');

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
