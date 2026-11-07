import type { Response } from 'express';

export function ok<T>(res: Response, data: T, message = 'Berhasil', status = 200, meta?: Record<string, unknown>) {
  return res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });
}
