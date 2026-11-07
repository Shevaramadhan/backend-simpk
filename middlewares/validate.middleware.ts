import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import ApiError from '../utils/ApiError';

export default function validate(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, 'Data yang dikirim tidak valid.', z.flattenError(result.error).fieldErrors));
    }
    req.body = result.data;
    next();
  };
}
