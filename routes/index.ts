import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API berjalan.' });
});
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

export default router;
