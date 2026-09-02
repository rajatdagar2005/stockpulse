import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import * as productService from '../services/productService';
import * as salesService from '../services/salesService';

const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  current_stock: z.coerce.number().int().min(0, 'Current stock must be 0 or greater'),
  minimum_stock: z.coerce.number().int().min(0, 'Minimum stock must be 0 or greater'),
  unit_price: z.coerce.number().min(0, 'Unit price must be 0 or greater'),
  cost_price: z.coerce.number().min(0, 'Cost price must be 0 or greater'),
  supplier_id: z.coerce.number().int().positive('Supplier selection is required'),
  safety_stock: z.coerce.number().int().min(0, 'Safety stock must be 0 or greater'),
});

const updateProductSchema = createProductSchema.partial();

export async function getProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const { search, category, supplierId, status, sortBy, sortOrder, limit, offset } = req.query;

    const result = await productService.getProducts(shopId, {
      search: search as string,
      category: category as string,
      supplierId: supplierId ? parseInt(supplierId as string, 10) : undefined,
      status: status as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC',
      limit: limit ? parseInt(limit as string, 10) : 100,
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

export async function getProductById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const product = await productService.getProductById(shopId, id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get 30-day sales timeline for charts
    const salesTimeline = await salesService.getProductSalesTimeline(shopId, id, 30);

    return res.json({
      success: true,
      data: {
        product,
        salesTimeline,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const validated = createProductSchema.parse(req.body);
    const product = await productService.createProduct(shopId, validated);

    return res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const validated = updateProductSchema.parse(req.body);
    const product = await productService.updateProduct(shopId, id, validated);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({
      success: true,
      data: product,
      message: 'Product updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const result = await productService.deleteProduct(shopId, id);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Unable to delete product.',
      });
    }

    return res.json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const categories = await productService.getProductCategories(shopId);
    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function importProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.user?.shop_id || 1;
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid products array provided.' });
    }

    let createdCount = 0;
    const errors: string[] = [];

    for (const [index, item] of products.entries()) {
      try {
        const parsed = createProductSchema.parse(item);
        await productService.createProduct(shopId, parsed);
        createdCount++;
      } catch (err: any) {
        errors.push(`Row ${index + 1} (${item.name || 'Unknown'}): ${err.message}`);
      }
    }

    return res.json({
      success: true,
      data: {
        imported: createdCount,
        failed: errors.length,
        errors,
      },
      message: `Successfully imported ${createdCount} products (${errors.length} skipped).`,
    });
  } catch (error) {
    next(error);
  }
}
