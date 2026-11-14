import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller';
import * as pengaturan from '../controllers/pengaturan.controller';
import * as reviews from '../controllers/reviews.controller';
import auth from '../middlewares/auth.middleware';
import authorize from '../middlewares/role.middleware';
import validate from '../middlewares/validate.middleware';
import { pengaturanSchema } from '../validators/pengaturan.validator';

// Dipasang di `/`, jadi auth dipasang per rute agar alamat yang tidak dikenal tetap dijawab 404.
const router = Router();
const pengurus = [auth, authorize('MARKETING', 'OPERASIONAL')];

router.get('/dashboard', ...pengurus, dashboard.summary);
router.get('/reviews', ...pengurus, reviews.list);
// Dibaca semua pengguna yang masuk (tagihan dibuka klien), diubah Marketing.
router.get('/pengaturan', auth, pengaturan.get);
router.put('/pengaturan', auth, authorize('MARKETING'), validate(pengaturanSchema), pengaturan.update);

export default router;
