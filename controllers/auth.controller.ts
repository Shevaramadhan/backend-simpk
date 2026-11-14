import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import env from '../config/env';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { google } from '../utils/google';
import { signToken } from '../utils/jwt';
import { mailer } from '../utils/mailer';
import { comparePassword, hashPassword } from '../utils/password';
import { ok } from '../utils/response';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  GoogleLoginInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

const RESET_MINUTES = 30;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Dibandingkan walau email tidak ada, agar waktu respons tidak membocorkan email terdaftar.
const dummyHash = hashPassword('akun-tidak-ada');

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as LoginInput;
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await comparePassword(password, user ? user.passwordHash : await dummyHash);
    if (!user || !valid || !user.isActive) throw new ApiError(401, 'Email atau kata sandi salah.');

    ok(res, {
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }, 'Berhasil masuk.');
  } catch (error) {
    next(error);
  }
}

export function me(req: Request, res: Response) {
  const { id, name, email, role } = req.user!;
  ok(res, { id, name, email, role });
}

// Kata sandi lama yang salah dijawab 400, bukan 401, agar sesi pengguna tidak ikut berakhir.
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { passwordLama, passwordBaru } = req.body as ChangePasswordInput;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { passwordHash: true } });
    if (!(await comparePassword(passwordLama, user.passwordHash))) {
      throw new ApiError(400, 'Data yang dikirim tidak valid.', { passwordLama: ['Kata sandi lama salah.'] });
    }
    await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash: await hashPassword(passwordBaru) } });
    ok(res, null, 'Kata sandi diperbarui.');
  } catch (error) {
    next(error);
  }
}

// Role ditentukan di sini, bukan dari permintaan. Akun internal hanya dibuat Operasional.
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, noWhatsapp } = req.body as RegisterInput;
    // Nama instansi sementara memakai nama pendaftar; Marketing dapat melengkapinya di halaman Klien.
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: 'KLIEN',
        passwordHash: await hashPassword(password),
        client: { create: { namaInstansi: name, jenisKlien: 'Perorangan', noWhatsapp } },
      },
      select: { id: true, name: true, email: true, role: true },
    });
    ok(res, { token: signToken(user), user }, 'Akun dibuat.', 201);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return next(new ApiError(409, 'Data yang dikirim tidak valid.', { email: ['Email sudah terdaftar. Silakan masuk.'] }));
    }
    next(error);
  }
}

async function sendResetLink(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, isActive: true } });
  if (!user?.isActive) return;

  const token = randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
    prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000) },
    }),
  ]);
  await mailer.send(
    email,
    'Atur ulang kata sandi SIM Proyek Klien Neo Telemetri',
    `Halo ${user.name},\n\nBuka tautan berikut untuk membuat kata sandi baru. Tautan berlaku ${RESET_MINUTES} menit dan hanya dapat dipakai sekali.\n\n${env.frontendOrigin}/reset-sandi?token=${token}\n\nAbaikan email ini jika Anda tidak memintanya.`,
  );
}

// Proses berjalan di belakang agar waktu jawaban tidak mengungkap apakah email terdaftar.
export function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as ForgotPasswordInput;
  sendResetLink(email).catch((error: unknown) => console.error(error));
  ok(res, null, 'Jika email terdaftar, tautan reset sudah dikirim.');
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, passwordBaru } = req.body as ResetPasswordInput;
    const invalid = new ApiError(400, 'Tautan reset tidak valid atau sudah kedaluwarsa.');
    const reset = await prisma.passwordReset.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { isActive: true } } },
    });
    if (!reset || reset.usedAt || reset.expiresAt < new Date() || !reset.user.isActive) throw invalid;

    const passwordHash = await hashPassword(passwordBaru);
    await prisma.$transaction(async (tx) => {
      // Syarat usedAt mencegah tautan yang sama dipakai dua kali bersamaan.
      const { count } = await tx.passwordReset.updateMany({
        where: { id: reset.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (!count) throw invalid;
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    });
    ok(res, null, 'Kata sandi diperbarui. Silakan masuk.');
  } catch (error) {
    next(error);
  }
}

/**
 * Masuk atau daftar dengan Google. Email baru menjadi akun Klien; email yang sudah ada masuk sesuai role-nya,
 * karena kepemilikan email sudah dibuktikan Google.
 */
export async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { credential } = req.body as GoogleLoginInput;
    const profile = await google.verify(credential);
    if (!profile.emailVerified) throw new ApiError(401, 'Email Google belum terverifikasi.');

    const select = { id: true, name: true, email: true, role: true, isActive: true } as const;
    let user = await prisma.user.findUnique({ where: { email: profile.email }, select });
    let created = false;
    if (!user) {
      // Kata sandi acak yang tidak diketahui siapa pun; pengguna tetap dapat membuat sandi lewat lupa kata sandi.
      const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
      user = await prisma.user.create({
        data: {
          name: profile.name.slice(0, 120),
          email: profile.email,
          role: 'KLIEN',
          passwordHash,
          client: { create: { namaInstansi: profile.name.slice(0, 160), jenisKlien: 'Perorangan' } },
        },
        select,
      });
      created = true;
    }
    if (!user.isActive) throw new ApiError(401, 'Akun ini dinonaktifkan.');

    const { isActive: _isActive, ...publicUser } = user;
    ok(res, { token: signToken(user), user: publicUser }, created ? 'Akun dibuat.' : 'Berhasil masuk.', created ? 201 : 200);
  } catch (error) {
    next(error);
  }
}
