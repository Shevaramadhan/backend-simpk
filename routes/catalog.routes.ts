import { Router } from 'express';
import * as controller from '../controllers/catalog.controller';
import auth from '../middlewares/auth.middleware';
import authorize from '../middlewares/role.middleware';
import validate from '../middlewares/validate.middleware';
import { createServiceSchema, portfolioSchema, updateServiceSchema } from '../validators/catalog.validator';

const router = Router();
const marketing = [auth, authorize('MARKETING')];

router.get('/services', controller.listPublicServices);
router.get('/services/all', ...marketing, controller.listAllServices);
router.post('/services', ...marketing, validate(createServiceSchema), controller.createService);
router.put('/services/:id', ...marketing, validate(updateServiceSchema), controller.updateService);

router.get('/portfolios', controller.listPublicPortfolios);
router.get('/portfolios/all', ...marketing, controller.listAllPortfolios);
router.post('/portfolios', ...marketing, validate(portfolioSchema), controller.createPortfolio);
router.put('/portfolios/:id', ...marketing, validate(portfolioSchema), controller.updatePortfolio);
router.delete('/portfolios/:id', ...marketing, controller.deletePortfolio);

export default router;
