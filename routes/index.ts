import { Router } from 'express';
import authRoutes from './auth.routes';
import catalogRoutes from './catalog.routes';
import clientsRoutes from './clients.routes';
import filesRoutes from './files.routes';
import invoicesRoutes from './invoices.routes';
import ordersRoutes from './orders.routes';
import projectsRoutes from './projects.routes';
import usersRoutes from './users.routes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API berjalan.' });
});
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/clients', clientsRoutes);
router.use('/orders', ordersRoutes);
router.use('/projects', projectsRoutes);
router.use('/files', filesRoutes);
router.use('/', invoicesRoutes);
router.use('/', catalogRoutes);

export default router;
