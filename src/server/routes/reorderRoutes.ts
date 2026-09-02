import { Router } from 'express';
import { getRecommendations, getDeadStock } from '../controllers/reorderController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getRecommendations);
router.get('/dead-stock', requireAuth, getDeadStock);

export default router;
