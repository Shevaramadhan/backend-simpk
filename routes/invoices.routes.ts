import { Router } from 'express';
import * as controller from '../controllers/invoices.controller';
import auth from '../middlewares/auth.middleware';
import authorize from '../middlewares/role.middleware';
import { BUKTI, uploadOne } from '../middlewares/upload.middleware';
import validate from '../middlewares/validate.middleware';
import { cancelInvoiceSchema, createPaymentSchema, updateInvoiceSchema, verifyPaymentSchema } from '../validators/invoices.validator';

// Dipasang di /api/v1, jadi auth dipasang per rute agar alamat lain tetap dijawab 404.
const router = Router();

router.get('/invoices', auth, authorize('MARKETING', 'OPERASIONAL'), controller.list);
router.patch('/invoices/:id', auth, authorize('MARKETING'), validate(updateInvoiceSchema), controller.update);
router.post('/invoices/:id/batal', auth, authorize('MARKETING'), validate(cancelInvoiceSchema), controller.cancel);
router.post('/invoices/:id/payments', auth, authorize('KLIEN'), uploadOne('bukti', BUKTI), validate(createPaymentSchema), controller.pay);
router.patch('/payments/:id', auth, authorize('MARKETING'), validate(verifyPaymentSchema), controller.verify);

export default router;
