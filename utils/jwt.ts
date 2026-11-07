import type { Role } from '@prisma/client';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import env from '../config/env';

export function signToken(user: { id: number; role: Role }): string {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
}
