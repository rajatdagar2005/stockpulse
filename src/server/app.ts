import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import salesRoutes from './routes/salesRoutes';
import supplierRoutes from './routes/supplierRoutes';
import reorderRoutes from './routes/reorderRoutes';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import { seedDatabase } from './db/seed';
import { requireAuth, requireOwner } from './middleware/auth';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'StockPulse API',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
    });
  });

  // Database re-seed endpoint (restricted to owner or development)
  app.post('/api/admin/reset-seed', requireAuth, requireOwner, async (req, res, next) => {
    try {
      await seedDatabase(true);
      res.json({ success: true, message: 'Database re-seeded with demo data successfully.' });
    } catch (err) {
      next(err);
    }
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/reorders', reorderRoutes);
  app.use('/api/purchase-orders', purchaseOrderRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
