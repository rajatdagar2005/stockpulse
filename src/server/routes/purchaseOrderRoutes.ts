import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updateStatus,
} from '../controllers/purchaseOrderController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getPurchaseOrders);
router.get('/:id', requireAuth, getPurchaseOrderById);
router.post('/', requireAuth, createPurchaseOrder);
router.patch('/:id/status', requireAuth, updateStatus);

export default router;
