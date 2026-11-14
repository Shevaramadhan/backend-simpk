import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number({ error: 'Pilih rating 1 sampai 5.' }).int('Rating harus bilangan bulat.').min(1, 'Rating minimal 1.').max(5, 'Rating maksimal 5.'),
  komentar: z
    .string()
    .trim()
    .max(2000, 'Komentar maksimal 2000 karakter.')
    .optional()
    .transform((value) => value || null),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
