import 'dotenv/config';

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
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  },
};
