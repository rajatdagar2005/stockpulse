import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApp } from './src/server/app';
import { initDatabase } from './src/server/db/index';
import { seedDatabase } from './src/server/db/seed';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  try {
    console.log('🚀 Starting StockPulse server...');

    // 1. Initialize PostgreSQL Schema & Seed Data
    await initDatabase();
    await seedDatabase(false);

    // 2. Create Express app with all API routes
    const app = createApp();

    // 3. Vite middleware for development or static serving for production
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✨ StockPulse full-stack server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Fatal error starting StockPulse server:', error);
    process.exit(1);
  }
}

startServer();
