import 'dotenv/config';
import path from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variabel lingkungan ${name} belum diisi. Lihat .env.example.`);
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET minimal 32 karakter.');

export default {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  port: Number(process.env.PORT) || 4000,
  // Boleh lebih dari satu, dipisah koma. Yang pertama dipakai untuk tautan di email.
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  // Jumlah proxy di depan API. Di VPS dengan Nginx aaPanel isi 1 agar pembatas percobaan membaca IP pengunjung.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  // true hanya di pengembangan: mengaktifkan Try it out di /api/v1/docs. Bawaan mati agar dokumentasi publik hanya untuk dibaca.
  docsTryIt: process.env.DOCS_TRY_IT === 'true',
  // Kosong berarti tombol Google di halaman masuk tidak aktif.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  },
};
