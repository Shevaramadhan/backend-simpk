import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed data contoh tidak boleh dijalankan di production.');
  }
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Isi SEED_PASSWORD (minimal 8 karakter) di file .env.');
  }
  const passwordHash = await bcrypt.hash(password, 12);

  const accounts: { name: string; email: string; role: Role }[] = [
    { name: 'Contoh Marketing', email: 'marketing@contoh.test', role: 'MARKETING' },
    { name: 'Contoh Operasional', email: 'operasional@contoh.test', role: 'OPERASIONAL' },
    { name: 'Contoh Anggota Tim', email: 'tim@contoh.test', role: 'TIM' },
    { name: 'Contoh Klien', email: 'klien@contoh.test', role: 'KLIEN' },
  ];
  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: { ...account, passwordHash },
    });
  }

  const klien = await prisma.user.findUniqueOrThrow({ where: { email: 'klien@contoh.test' } });
  await prisma.client.upsert({
    where: { userId: klien.id },
    update: {},
    create: { userId: klien.id, namaInstansi: 'Instansi Contoh', jenisKlien: 'Organisasi' },
  });

  if ((await prisma.service.count()) === 0) {
    await prisma.service.create({
      data: {
        nama: 'Website Profil Organisasi',
        deskripsi: 'Contoh jasa untuk data uji.',
        hargaMin: 1500000,
        hargaMax: 3000000,
        estimasiHari: 30,
      },
    });
  }
  console.log('Seed selesai: 4 akun contoh dan 1 jasa contoh.');
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
