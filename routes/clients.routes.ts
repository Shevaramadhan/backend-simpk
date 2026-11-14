import { Router } from 'express';
import * as controller from '../controllers/clients.controller';
import auth from '../middlewares/auth.middleware';
import authorize from '../middlewares/role.middleware';
import validate from '../middlewares/validate.middleware';
import { updateClientEmailSchema, updateClientSchema, updateOwnProfileSchema } from '../validators/clients.validator';

const router = Router();
router.use(auth);

// `/me` didaftarkan sebelum `/:id` agar tidak terbaca sebagai id.
router.get('/me', authorize('KLIEN'), controller.me);
router.patch('/me', authorize('KLIEN'), validate(updateOwnProfileSchema), controller.updateMe);
router.get('/', authorize('MARKETING', 'OPERASIONAL'), controller.list);
router.patch('/:id', authorize('MARKETING'), validate(updateClientSchema), controller.update);
router.patch('/:id/email', authorize('OPERASIONAL'), validate(updateClientEmailSchema), controller.updateEmail);

export default router;
