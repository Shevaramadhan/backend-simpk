import { z } from 'zod';
import { emailField } from './auth.validator';

const teks = (label: string, min: number, max: number) =>
  z.string({ error: `${label} wajib diisi.` }).trim().min(min, `${label} minimal ${min} karakter.`).max(max, `${label} maksimal ${max} karakter.`);

export const pengaturanSchema = z.object({
  nama: teks('Nama organisasi', 3, 160),
  alamat: teks('Alamat', 5, 255),
  telepon: z.string({ error: 'Telepon wajib diisi.' }).trim().regex(/^[0-9+\-\s()]{8,40}$/, 'Nomor telepon tidak valid.'),
  email: emailField,
  bank: teks('Nama bank', 2, 80),
  nomorRekening: z.string({ error: 'Nomor rekening wajib diisi.' }).trim().regex(/^[0-9\-\s]{5,40}$/, 'Nomor rekening hanya berisi angka, spasi, atau tanda hubung.'),
  atasNama: teks('Atas nama rekening', 3, 120),
});

export type PengaturanInput = z.infer<typeof pengaturanSchema>;
