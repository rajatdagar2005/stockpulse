import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as analyticsService from '../services/analyticsService';

export async function getSalesAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const days = parseInt((req.query.days as string) || '30', 10);
    const data = await analyticsService.getSalesAnalytics(shopId, days);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTopProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const days = parseInt((req.query.days as string) || '30', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const data = await analyticsService.getTopProducts(shopId, limit, days);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const days = parseInt((req.query.days as string) || '30', 10);
    const data = await analyticsService.getCategoryPerformance(shopId, days);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryHealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const data = await analyticsService.getInventoryHealthStats(shopId);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
