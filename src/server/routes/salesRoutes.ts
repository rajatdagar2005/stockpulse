import { Router } from 'express';
import { recordSale, getSales } from '../controllers/salesController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getSales);
router.post('/', requireAuth, recordSale);

export default router;
