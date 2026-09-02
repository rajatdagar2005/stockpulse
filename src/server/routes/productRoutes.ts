import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  importProducts,
} from '../controllers/productController';
import { requireAuth, requireOwner } from '../middleware/auth';

const router = Router();

router.get('/categories', requireAuth, getCategories);
router.post('/import', requireAuth, requireOwner, importProducts);
router.get('/', requireAuth, getProducts);
router.get('/:id', requireAuth, getProductById);
router.post('/', requireAuth, createProduct);
router.put('/:id', requireAuth, updateProduct);
router.delete('/:id', requireAuth, requireOwner, deleteProduct);

export default router;
