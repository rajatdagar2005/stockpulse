import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as purchaseOrderService from '../services/purchaseOrderService';
import { AuthenticatedRequest } from '../middleware/auth';
import { PurchaseOrderStatus } from '../types/index';

const createPurchaseOrderItemSchema = z.object({
  product_id: z.coerce.number().int().positive('Valid product ID is required'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  unit_cost: z.coerce.number().min(0, 'Unit cost must be 0 or greater').optional(),
});

const createPurchaseOrderSchema = z.object({
  supplier_id: z.coerce.number().int().positive('Valid supplier ID is required'),
  expected_delivery_date: z.string().optional(),
  items: z.array(createPurchaseOrderItemSchema).min(1, 'At least one item is required'),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const),
});

export async function getPurchaseOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const { status, supplierId, limit, offset } = req.query;

    const result = await purchaseOrderService.getPurchaseOrders(shopId, {
      status: status as string,
      supplierId: supplierId ? parseInt(supplierId as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPurchaseOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid purchase order ID' });
    }

    const order = await purchaseOrderService.getPurchaseOrderById(shopId, id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPurchaseOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const validated = createPurchaseOrderSchema.parse(req.body);
    const userId = req.user?.id;

    const formattedItems = validated.items.map((i) => ({
      productId: i.product_id,
      quantity: i.quantity,
      unitCost: i.unit_cost,
    }));

    const order = await purchaseOrderService.createPurchaseOrder(shopId, {
      supplierId: validated.supplier_id,
      expectedDeliveryDate: validated.expected_delivery_date,
      items: formattedItems,
      userId,
    });

    return res.status(201).json({
      success: true,
      data: order,
      message: `Purchase Order ${order.order_number} created successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid purchase order ID' });
    }

    const { status } = updateStatusSchema.parse(req.body);
    const order = await purchaseOrderService.updatePurchaseOrderStatus(shopId, id, status as PurchaseOrderStatus);

    return res.json({
      success: true,
      data: order,
      message: `Purchase Order ${order.order_number} status updated to ${status}.${
        status === 'RECEIVED' ? ' Product stocks have been replenished.' : ''
      }`,
    });
  } catch (error) {
    next(error);
  }
}
