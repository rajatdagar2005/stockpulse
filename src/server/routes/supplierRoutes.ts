import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController';
import { requireAuth, requireOwner } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getSuppliers);
router.get('/:id', requireAuth, getSupplierById);
router.post('/', requireAuth, createSupplier);
router.put('/:id', requireAuth, updateSupplier);
router.delete('/:id', requireAuth, requireOwner, deleteSupplier);

export default router;
