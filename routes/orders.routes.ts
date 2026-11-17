import { Router } from 'express';
import * as comments from '../controllers/comments.controller';
import * as invoices from '../controllers/invoices.controller';
import * as controller from '../controllers/orders.controller';
import auth from '../middlewares/auth.middleware';
import authorize from '../middlewares/role.middleware';
import { DOKUMEN, uploadMany } from '../middlewares/upload.middleware';
import validate from '../middlewares/validate.middleware';
import { createCommentSchema } from '../validators/comments.validator';
import { createInvoiceSchema } from '../validators/invoices.validator';
import { approveOrderSchema, createOrderSchema, updateOrderStatusSchema } from '../validators/orders.validator';

const router = Router();
router.use(auth);

// Klien mengirim form pengajuan beserta dokumen pendukung (multipart); Marketing dapat mengirim JSON.
router.post('/', authorize('KLIEN', 'MARKETING'), uploadMany('dokumen', DOKUMEN), validate(createOrderSchema), controller.create);
router.get('/', authorize('KLIEN', 'MARKETING', 'OPERASIONAL'), controller.list);
router.get('/:id', authorize('KLIEN', 'MARKETING', 'OPERASIONAL'), controller.detail);
router.post('/:id/documents', authorize('KLIEN', 'MARKETING'), uploadMany('dokumen', DOKUMEN), controller.addDocuments);
router.delete('/:id/documents/:docId', authorize('KLIEN', 'MARKETING'), controller.removeDocument);
router.patch('/:id/status', authorize('MARKETING'), validate(updateOrderStatusSchema), controller.updateStatus);
router.post('/:id/approve', authorize('MARKETING'), validate(approveOrderSchema), controller.approve);
router.post('/:id/invoices', authorize('MARKETING'), validate(createInvoiceSchema), invoices.create);
router.get('/:id/comments', authorize('KLIEN', 'MARKETING', 'OPERASIONAL', 'TIM'), comments.list);
router.post('/:id/comments', authorize('KLIEN', 'MARKETING', 'OPERASIONAL', 'TIM'), validate(createCommentSchema), comments.create);

export default router;
