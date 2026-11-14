import { OAuth2Client } from 'google-auth-library';
import env from '../config/env';
import ApiError from './ApiError';

const client = new OAuth2Client();

export interface GoogleProfile {
  email: string;
  name: string;
  emailVerified: boolean;
}

// Dibungkus objek agar dapat digantikan saat pengujian.
export const google = {
  /** Memeriksa ID token dari tombol Google di browser. Hanya token untuk aplikasi ini yang diterima. */
  async verify(credential: string): Promise<GoogleProfile> {
    if (!env.googleClientId) throw new ApiError(503, 'Masuk dengan Google belum diaktifkan.');
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: env.googleClientId });
      const payload = ticket.getPayload();
      if (!payload?.email) throw new Error('Token tanpa email.');
      return { email: payload.email.toLowerCase(), name: payload.name ?? payload.email, emailVerified: payload.email_verified === true };
    } catch {
      throw new ApiError(401, 'Masuk dengan Google gagal. Coba lagi.');
    }
  },
};
