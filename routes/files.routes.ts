import { Router } from 'express';
import * as controller from '../controllers/files.controller';
import auth from '../middlewares/auth.middleware';

const router = Router();
router.use(auth);

router.get('/dokumen/:id', controller.dokumen);
router.get('/bukti/:id', controller.bukti);

export default router;
