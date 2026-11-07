import { PrismaClient } from '@prisma/client';

// Satu instance untuk seluruh aplikasi agar koneksi MySQL tidak menumpuk.
export default new PrismaClient();
