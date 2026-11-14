import { z } from 'zod';

export const emailField = z.string({ error: 'Email wajib diisi.' }).trim().toLowerCase().pipe(z.email('Format email tidak valid.')).pipe(z.string().max(191, 'Email terlalu panjang.'));
const newPassword = z.string({ error: 'Kata sandi baru wajib diisi.' }).min(8, 'Kata sandi minimal 8 karakter.').max(200);

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Kata sandi wajib diisi.').max(200),
});

// Tidak ada kolom role: pendaftaran selalu membuat akun Klien. Isian mengikuti desain Sign In ditambah WhatsApp.
export const registerSchema = z.object({
  name: z.string({ error: 'Nama wajib diisi.' }).trim().min(2, 'Nama minimal 2 karakter.').max(120),
  email: emailField,
  password: newPassword,
  noWhatsapp: z.string({ error: 'Nomor WhatsApp wajib diisi.' }).trim().regex(/^[0-9+\-\s]{8,25}$/, 'Nomor WhatsApp tidak valid.'),
});

export const googleLoginSchema = z.object({
  credential: z.string({ error: 'Token Google wajib dikirim.' }).min(20).max(4096),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z.object({
  token: z.string({ error: 'Tautan reset tidak valid.' }).regex(/^[0-9a-f]{64}$/, 'Tautan reset tidak valid.'),
  passwordBaru: newPassword,
});

export const changePasswordSchema = z
  .object({
    passwordLama: z.string({ error: 'Kata sandi lama wajib diisi.' }).min(1, 'Kata sandi lama wajib diisi.').max(200),
    passwordBaru: newPassword,
  })
  .refine((data) => data.passwordLama !== data.passwordBaru, {
    path: ['passwordBaru'],
    message: 'Kata sandi baru harus berbeda dari yang lama.',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
