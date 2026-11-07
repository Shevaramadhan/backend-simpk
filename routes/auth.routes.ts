import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/auth.controller';
import auth from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { loginSchema } from '../validators/auth.validator';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan masuk. Coba lagi nanti.' },
});

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.get('/me', auth, controller.me);

export default router;
