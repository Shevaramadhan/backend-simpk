import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller';
import * as reviews from '../controllers/reviews.controller';
import auth from '../middlewares/auth.middleware';
import authorize from '../middlewares/role.middleware';

// Dipasang di `/`, jadi auth dipasang per rute agar alamat yang tidak dikenal tetap dijawab 404.
const router = Router();
const pengurus = [auth, authorize('MARKETING', 'OPERASIONAL')];

router.get('/dashboard', ...pengurus, dashboard.summary);
router.get('/reviews', ...pengurus, reviews.list);

export default router;
