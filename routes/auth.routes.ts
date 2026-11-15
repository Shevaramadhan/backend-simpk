import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/auth.controller';
import auth from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();
// `hanyaGagal`: hanya permintaan yang ditolak (status 400 ke atas) yang dihitung. Dipakai untuk login agar
// pengguna sah yang berganti akun berkali-kali dari satu jaringan (misalnya saat UAT) tidak ikut terblokir,
// sementara tebakan kata sandi tetap dibatasi. Lihat KEPUTUSAN B-38.
const limiter = (windowMinutes: number, limit: number, hanyaGagal = false) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    skipSuccessfulRequests: hanyaGagal,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Terlalu banyak percobaan. Coba lagi nanti.' },
  });

router.post('/login', limiter(15, 10, true), validate(loginSchema), controller.login);
router.post('/register', limiter(60, 10), validate(registerSchema), controller.register);
router.post('/google', limiter(15, 20), validate(googleLoginSchema), controller.googleLogin);
router.post('/forgot-password', limiter(15, 5), validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', limiter(15, 10), validate(resetPasswordSchema), controller.resetPassword);
router.get('/me', auth, controller.me);
router.post('/change-password', auth, limiter(15, 10), validate(changePasswordSchema), controller.changePassword);

export default router;
