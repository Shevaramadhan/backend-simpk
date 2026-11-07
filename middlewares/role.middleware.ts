import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import ApiError from '../utils/ApiError';

export default function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Anda tidak memiliki akses ke fitur ini.'));
    }
    next();
  };
}
