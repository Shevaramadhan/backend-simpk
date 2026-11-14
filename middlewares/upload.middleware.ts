import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import env from '../config/env';
import ApiError from '../utils/ApiError';

const MB = 1024 * 1024;

// Jenis berkas dikenali dari isi (tanda tangan awal berkas), bukan dari nama atau tipe yang dikirim browser.
const SIGNATURES: { ext: string; mime: string; match: (b: Buffer) => boolean }[] = [
  { ext: 'pdf', mime: 'application/pdf', match: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { ext: 'png', mime: 'image/png', match: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', mime: 'image/jpeg', match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    match: (b) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && b.includes(Buffer.from('word/')),
  },
];

export interface UploadKind {
  folder: 'dokumen' | 'bukti';
  allowed: string[];
  maxMb: number;
}

export const DOKUMEN: UploadKind = { folder: 'dokumen', allowed: ['pdf', 'png', 'jpg', 'docx'], maxMb: 5 };
export const BUKTI: UploadKind = { folder: 'bukti', allowed: ['pdf', 'png', 'jpg'], maxMb: 2 };

function multerFor(kind: UploadKind) {
  return multer({ storage: multer.memoryStorage(), limits: { fileSize: kind.maxMb * MB, files: 5, fields: 20 } });
}

function translate(field: string, kind: UploadKind) {
  return (error: unknown, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? `Ukuran berkas maksimal ${kind.maxMb} MB.`
          : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
            ? 'Maksimal 5 berkas.'
            : 'Berkas tidak dapat diproses.';
      return next(new ApiError(400, 'Data yang dikirim tidak valid.', { [field]: [message] }));
    }
    next(error);
  };
}

/** Menerima beberapa berkas pada satu kolom. Permintaan JSON biasa diteruskan tanpa perubahan. */
export function uploadMany(field: string, kind: UploadKind) {
  const handler = multerFor(kind).array(field, 5);
  return (req: Request, res: Response, next: NextFunction) => handler(req, res, (error) => translate(field, kind)(error, next));
}

export function uploadOne(field: string, kind: UploadKind) {
  const handler = multerFor(kind).single(field);
  return (req: Request, res: Response, next: NextFunction) => handler(req, res, (error) => translate(field, kind)(error, next));
}

export interface StoredFile {
  namaFile: string;
  path: string;
  mime: string;
  ukuran: number;
}

/** Memeriksa isi berkas lalu menyimpannya dengan nama acak. Dipanggil setelah data lain lolos validasi. */
export async function storeFile(file: Express.Multer.File, kind: UploadKind, field: string): Promise<StoredFile> {
  const type = SIGNATURES.find((signature) => kind.allowed.includes(signature.ext) && signature.match(file.buffer));
  if (!type) {
    throw new ApiError(400, 'Data yang dikirim tidak valid.', {
      [field]: [`Jenis berkas ${file.originalname} tidak didukung. Gunakan ${kind.allowed.join(', ').toUpperCase()}.`],
    });
  }
  const name = `${randomBytes(16).toString('hex')}.${type.ext}`;
  const dir = path.join(env.uploadDir, kind.folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), file.buffer, { flag: 'wx' });
  return {
    namaFile: path.basename(file.originalname).slice(0, 255),
    path: `${kind.folder}/${name}`,
    mime: type.mime,
    ukuran: file.size,
  };
}

/** Path absolut berkas yang tersimpan; menolak path yang keluar dari folder unggahan. */
export function resolveStored(relative: string): string {
  const base = path.resolve(env.uploadDir);
  const full = path.resolve(base, relative);
  if (!full.startsWith(base + path.sep)) throw new ApiError(404, 'Berkas tidak ditemukan.');
  return full;
}
