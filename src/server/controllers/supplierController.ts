import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import * as supplierService from '../services/supplierService';

const createSupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  contact_name: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Invalid email address format'),
  phone: z.string().min(6, 'Valid phone number is required'),
  address: z.string().optional(),
  lead_time_days: z.coerce.number().int().min(1, 'Lead time must be at least 1 day'),
});

const updateSupplierSchema = createSupplierSchema.partial();

export async function getSuppliers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const suppliers = await supplierService.getSuppliers(shopId);
    return res.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSupplierById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }

    const supplier = await supplierService.getSupplierById(shopId, id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    return res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const validated = createSupplierSchema.parse(req.body);
    const supplier = await supplierService.createSupplier(shopId, validated);

    return res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }

    const validated = updateSupplierSchema.parse(req.body);
    const supplier = await supplierService.updateSupplier(shopId, id, validated);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    return res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }

    const result = await supplierService.deleteSupplier(shopId, id);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Unable to delete supplier.',
      });
    }

    return res.json({
      success: true,
      message: 'Supplier deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}
