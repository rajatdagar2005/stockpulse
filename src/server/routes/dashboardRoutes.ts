import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getDashboardData);

export default router;
