import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as reorderService from '../services/reorderService';

export async function getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const recommendations = await reorderService.getReorderRecommendations(shopId);
    return res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeadStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const deadStock = await reorderService.getDeadStockItems(shopId);
    const totalTiedUpValue = deadStock.reduce((acc, item) => acc + item.inventory_value, 0);

    return res.json({
      success: true,
      data: {
        items: deadStock,
        totalTiedUpValue: Number(totalTiedUpValue.toFixed(2)),
        totalItems: deadStock.length,
      },
    });
  } catch (error) {
    next(error);
  }
}
