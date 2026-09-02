import { Router } from 'express';
import {
  getSalesAnalytics,
  getTopProducts,
  getCategoryPerformance,
  getInventoryHealth,
} from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/sales', requireAuth, getSalesAnalytics);
router.get('/products', requireAuth, getTopProducts);
router.get('/categories', requireAuth, getCategoryPerformance);
router.get('/health', requireAuth, getInventoryHealth);

export default router;
