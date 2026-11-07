import type { NextFunction, Request, Response } from 'express';
import ApiError from '../utils/ApiError';

export function notFound(req: Request, res: Response, next: NextFunction) {
  next(new ApiError(404, 'Alamat tidak ditemukan.'));
}

// Express mengenali error handler dari empat parameternya.
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
    });
  }
  const { type, code } = error as { type?: string; code?: string };
  if (type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Format JSON tidak valid.' });
  }
  if (code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Data tersebut sudah terdaftar.' });
  }
  if (code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
}
