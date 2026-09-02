import { Router } from 'express';
import {
  login,
  register,
  getMe,
  searchShops,
  getShopDetails,
  regenerateJoinCode,
  createStaffUser,
  getStaffUsers,
  deleteStaffUser,
} from '../controllers/authController';
import { requireAuth, requireOwner } from '../middleware/auth';

const router = Router();

// Public auth endpoints
router.post('/login', login);
router.post('/register', register);
router.get('/search-shops', searchShops);

// Authenticated user & shop endpoints
router.get('/me', requireAuth, getMe);
router.get('/shop-details', requireAuth, getShopDetails);
router.post('/regenerate-join-code', requireAuth, requireOwner, regenerateJoinCode);

// Staff management within current shop
router.get('/staff', requireAuth, requireOwner, getStaffUsers);
router.post('/staff', requireAuth, requireOwner, createStaffUser);
router.delete('/staff/:id', requireAuth, requireOwner, deleteStaffUser);

export default router;

