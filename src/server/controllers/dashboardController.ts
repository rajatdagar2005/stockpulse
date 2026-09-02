import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as dashboardService from '../services/dashboardService';

export async function getDashboardData(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const data = await dashboardService.getDashboardOverview(shopId);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
