import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';
import env from './env';

// Dokumentasi API (OpenAPI 3) di /api/v1/docs dan /api/v1/openapi.json.
// Aman dibuka publik: secara bawaan halaman hanya untuk dibaca. Tombol Try it out dan Authorize hanya aktif bila
// DOCS_TRY_IT=true (khusus pengembangan), dan token tidak pernah disimpan di peramban (persistAuthorization: false).

// Berkas spesifikasi berada di backend/docs; saat dijalankan dari dist, naik satu folder.
const specPath = path.resolve(__dirname, __filename.endsWith('.js') ? '..' : '.', '..', 'docs', 'openapi.yaml');
export const openApiSpec = parse(readFileSync(specPath, 'utf8')) as Record<string, unknown>;

export function apiDocsRouter() {
  const router = Router();
  const tryIt = env.docsTryIt;
  router.get('/openapi.json', (req, res) => res.json(openApiSpec));
  router.use(
    '/docs',
    // Tidak di-cache agar perubahan mode berlaku segera. Helmet sudah melarang halaman ini dibingkai situs lain.
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'SIMPK API',
      // Mode baca saja: sembunyikan tombol Authorize agar tidak ada tempat mengetik token di halaman publik.
      customCss: tryIt ? '' : '.swagger-ui .auth-wrapper, .swagger-ui .authorization__btn, .swagger-ui .try-out { display: none !important; }',
      swaggerOptions: {
        persistAuthorization: false,
        supportedSubmitMethods: tryIt ? ['get', 'post', 'put', 'patch', 'delete'] : [],
        tryItOutEnabled: false,
        docExpansion: 'list',
        defaultModelsExpandDepth: 0,
        displayRequestDuration: tryIt,
      },
    }),
  );
  return router;
}
