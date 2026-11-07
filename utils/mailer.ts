import nodemailer from 'nodemailer';
import env from '../config/env';

const transport = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

// Dibungkus objek agar dapat digantikan saat pengujian.
export const mailer = {
  async send(to: string, subject: string, text: string): Promise<void> {
    if (transport) {
      await transport.sendMail({ from: env.smtp.from, to, subject, text });
      return;
    }
    // Isi email memuat tautan reset, jadi hanya boleh tampil di terminal saat pengembangan.
    if (process.env.NODE_ENV === 'production') {
      console.error('SMTP belum diisi, email tidak terkirim.');
      return;
    }
    console.log(`[email pengembangan] Kepada: ${to}\nSubjek: ${subject}\n${text}`);
  },
};
