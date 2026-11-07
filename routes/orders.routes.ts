import { Router } from 'express';
import * as controller from '../controllers/orders.controller';
import auth from '../middlewares/auth.middleware';
import authorize from '../middlewares/role.middleware';
import validate from '../middlewares/validate.middleware';
import { approveOrderSchema, createOrderSchema, updateOrderStatusSchema } from '../validators/orders.validator';

const router = Router();
router.use(auth);

router.post('/', authorize('KLIEN', 'MARKETING'), validate(createOrderSchema), controller.create);
router.get('/', authorize('KLIEN', 'MARKETING', 'OPERASIONAL'), controller.list);
router.get('/:id', authorize('KLIEN', 'MARKETING', 'OPERASIONAL'), controller.detail);
router.patch('/:id/status', authorize('MARKETING'), validate(updateOrderStatusSchema), controller.updateStatus);
router.post('/:id/approve', authorize('MARKETING'), validate(approveOrderSchema), controller.approve);

export default router;
