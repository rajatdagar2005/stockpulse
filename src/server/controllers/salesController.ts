import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as salesService from '../services/salesService';
import { AuthenticatedRequest } from '../middleware/auth';

const recordSaleSchema = z.object({
  product_id: z.coerce.number().int().positive('Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  unit_price: z.coerce.number().min(0, 'Unit price must be 0 or greater').optional(),
  sold_at: z.string().optional(),
});

export async function recordSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const validated = recordSaleSchema.parse(req.body);
    const userId = req.user?.id;

    const result = await salesService.recordSale(shopId, {
      productId: validated.product_id,
      quantity: validated.quantity,
      unitPrice: validated.unit_price,
      soldAt: validated.sold_at,
      userId,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Sale recorded successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getSales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const { productId, limit, offset, startDate, endDate } = req.query;

    const result = await salesService.getSalesHistory(shopId, {
      productId: productId ? parseInt(productId as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
