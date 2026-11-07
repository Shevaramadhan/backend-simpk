// Harus diimpor paling awal. Tes integrasi hanya berjalan pada database berakhiran _test.
const url = process.env.TEST_DATABASE_URL || 'mysql://root@127.0.0.1:3306/simpk_test';
if (!new URL(url).pathname.endsWith('_test')) throw new Error('Tes integrasi hanya boleh memakai database *_test.');
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = 'rahasia-khusus-pengujian-minimal-32-karakter';
