import { Router } from 'express';
import * as controller from '../controllers/users.controller';
import auth from '../middlewares/auth.middleware';
import authorize from '../middlewares/role.middleware';
import validate from '../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema } from '../validators/users.validator';

const router = Router();
router.use(auth, authorize('OPERASIONAL'));

router.get('/', controller.list);
router.post('/', validate(createUserSchema), controller.create);
router.patch('/:id', validate(updateUserSchema), controller.update);

export default router;
