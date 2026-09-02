import { query, getClient } from '../db/index';
import { Product, ProductStatus } from '../types/index';
import {
  calculateAverageDailySales,
  calculateReorderPoint,
  calculateRecommendedOrder,
  classifyStockStatus,
} from './reorderService';

export interface ProductFilters {
  search?: string;
  category?: string;
  supplierId?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export async function getProducts(shopId: number, filters: ProductFilters = {}): Promise<{ products: Product[]; total: number }> {
  const {
    search,
    category,
    supplierId,
    status,
    sortBy = 'name',
    sortOrder = 'ASC',
    limit = 50,
    offset = 0,
  } = filters;

  const sql = `
    SELECT 
      p.id,
      p.shop_id,
      p.name,
      p.sku,
      p.category,
      p.description,
      p.current_stock,
      p.minimum_stock,
      p.unit_price,
      p.cost_price,
      p.supplier_id,
      p.safety_stock,
      p.created_at,
      p.updated_at,
      s.name as supplier_name,
      s.lead_time_days as supplier_lead_time,
      COALESCE(sales_30.total_sales, 0) as sales_last_30_days
    FROM products p
    JOIN suppliers s ON p.supplier_id = s.id AND s.shop_id = $1
    LEFT JOIN (
      SELECT product_id, SUM(quantity) as total_sales
      FROM sales
      WHERE shop_id = $1 AND sold_at >= NOW() - INTERVAL '30 days'
      GROUP BY product_id
    ) sales_30 ON p.id = sales_30.product_id
    WHERE p.shop_id = $1
    ORDER BY p.name ASC;
  `;

  const result = await query(sql, [shopId]);

  let processed: Product[] = result.rows.map((row) => {
    const currentStock = Number(row.current_stock);
    const unitPrice = Number(row.unit_price);
    const costPrice = Number(row.cost_price);
    const safetyStock = Number(row.safety_stock);
    const minimumStock = Number(row.minimum_stock);
    const leadTime = Number(row.supplier_lead_time || 3);
    const sales30 = Number(row.sales_last_30_days || 0);

    const ads = calculateAverageDailySales(sales30);
    const rop = calculateReorderPoint(ads, leadTime, safetyStock);
    const recOrder = calculateRecommendedOrder(currentStock, ads, leadTime, safetyStock);
    const calculatedStatus = classifyStockStatus(currentStock, ads, rop, sales30);

    return {
      id: row.id,
      shop_id: row.shop_id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      description: row.description,
      current_stock: currentStock,
      minimum_stock: minimumStock,
      unit_price: unitPrice,
      cost_price: costPrice,
      supplier_id: row.supplier_id,
      safety_stock: safetyStock,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      supplier_name: row.supplier_name,
      supplier_lead_time: leadTime,
      average_daily_sales: ads,
      reorder_point: rop,
      recommended_order: recOrder,
      status: calculatedStatus,
      inventory_value: Number((currentStock * costPrice).toFixed(2)),
      sales_last_30_days: sales30,
    };
  });

  // Apply in-memory filtering for computed fields and flexible search
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    processed = processed.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q))
    );
  }

  if (category && category !== 'ALL') {
    processed = processed.filter((p) => p.category === category);
  }

  if (supplierId) {
    processed = processed.filter((p) => p.supplier_id === supplierId);
  }

  if (status && status !== 'ALL') {
    processed = processed.filter((p) => p.status === status);
  }

  // Sort
  processed.sort((a: any, b: any) => {
    const aVal = a[sortBy] ?? '';
    const bVal = b[sortBy] ?? '';
    if (typeof aVal === 'string') {
      return sortOrder === 'ASC'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
  });

  const total = processed.length;
  const paginated = processed.slice(offset, offset + limit);

  return { products: paginated, total };
}

export async function getProductById(shopId: number, id: number): Promise<Product | null> {
  const sql = `
    SELECT 
      p.id,
      p.shop_id,
      p.name,
      p.sku,
      p.category,
      p.description,
      p.current_stock,
      p.minimum_stock,
      p.unit_price,
      p.cost_price,
      p.supplier_id,
      p.safety_stock,
      p.created_at,
      p.updated_at,
      s.name as supplier_name,
      s.lead_time_days as supplier_lead_time,
      COALESCE(sales_30.total_sales, 0) as sales_last_30_days
    FROM products p
    JOIN suppliers s ON p.supplier_id = s.id AND s.shop_id = $1
    LEFT JOIN (
      SELECT product_id, SUM(quantity) as total_sales
      FROM sales
      WHERE shop_id = $1 AND sold_at >= NOW() - INTERVAL '30 days'
      GROUP BY product_id
    ) sales_30 ON p.id = sales_30.product_id
    WHERE p.id = $2 AND p.shop_id = $1;
  `;

  const result = await query(sql, [shopId, id]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const currentStock = Number(row.current_stock);
  const unitPrice = Number(row.unit_price);
  const costPrice = Number(row.cost_price);
  const safetyStock = Number(row.safety_stock);
  const minimumStock = Number(row.minimum_stock);
  const leadTime = Number(row.supplier_lead_time || 3);
  const sales30 = Number(row.sales_last_30_days || 0);

  const ads = calculateAverageDailySales(sales30);
  const rop = calculateReorderPoint(ads, leadTime, safetyStock);
  const recOrder = calculateRecommendedOrder(currentStock, ads, leadTime, safetyStock);
  const calculatedStatus = classifyStockStatus(currentStock, ads, rop, sales30);

  return {
    id: row.id,
    shop_id: row.shop_id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    description: row.description,
    current_stock: currentStock,
    minimum_stock: minimumStock,
    unit_price: unitPrice,
    cost_price: costPrice,
    supplier_id: row.supplier_id,
    safety_stock: safetyStock,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    supplier_name: row.supplier_name,
    supplier_lead_time: leadTime,
    average_daily_sales: ads,
    reorder_point: rop,
    recommended_order: recOrder,
    status: calculatedStatus,
    inventory_value: Number((currentStock * costPrice).toFixed(2)),
    sales_last_30_days: sales30,
  };
}

export async function createProduct(shopId: number, data: {
  name: string;
  sku: string;
  category: string;
  description?: string;
  current_stock: number;
  minimum_stock: number;
  unit_price: number;
  cost_price: number;
  supplier_id: number;
  safety_stock: number;
}): Promise<Product> {
  // Ensure supplier belongs to the same shop
  const supplierCheck = await query('SELECT id FROM suppliers WHERE id = $1 AND shop_id = $2', [data.supplier_id, shopId]);
  if (supplierCheck.rows.length === 0) {
    throw new Error('Supplier does not belong to your shop or does not exist');
  }

  const sql = `
    INSERT INTO products (
      shop_id, name, sku, category, description, current_stock, minimum_stock,
      unit_price, cost_price, supplier_id, safety_stock
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id;
  `;

  const result = await query(sql, [
    shopId,
    data.name,
    data.sku.toUpperCase().trim(),
    data.category,
    data.description || null,
    data.current_stock,
    data.minimum_stock,
    data.unit_price,
    data.cost_price,
    data.supplier_id,
    data.safety_stock,
  ]);

  const newId = result.rows[0].id;
  const product = await getProductById(shopId, newId);
  return product!;
}

export async function updateProduct(
  shopId: number,
  id: number,
  data: {
    name?: string;
    sku?: string;
    category?: string;
    description?: string;
    current_stock?: number;
    minimum_stock?: number;
    unit_price?: number;
    cost_price?: number;
    supplier_id?: number;
    safety_stock?: number;
  }
): Promise<Product | null> {
  const existing = await getProductById(shopId, id);
  if (!existing) return null;

  if (data.supplier_id) {
    const supplierCheck = await query('SELECT id FROM suppliers WHERE id = $1 AND shop_id = $2', [data.supplier_id, shopId]);
    if (supplierCheck.rows.length === 0) {
      throw new Error('Supplier does not belong to your shop or does not exist');
    }
  }

  const sql = `
    UPDATE products
    SET 
      name = COALESCE($1, name),
      sku = COALESCE($2, sku),
      category = COALESCE($3, category),
      description = COALESCE($4, description),
      current_stock = COALESCE($5, current_stock),
      minimum_stock = COALESCE($6, minimum_stock),
      unit_price = COALESCE($7, unit_price),
      cost_price = COALESCE($8, cost_price),
      supplier_id = COALESCE($9, supplier_id),
      safety_stock = COALESCE($10, safety_stock),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $11 AND shop_id = $12
    RETURNING id;
  `;

  await query(sql, [
    data.name,
    data.sku ? data.sku.toUpperCase().trim() : null,
    data.category,
    data.description,
    data.current_stock,
    data.minimum_stock,
    data.unit_price,
    data.cost_price,
    data.supplier_id,
    data.safety_stock,
    id,
    shopId,
  ]);

  return getProductById(shopId, id);
}

export async function deleteProduct(shopId: number, id: number): Promise<{ success: boolean; message?: string }> {
  // Check product exists in shop
  const existing = await getProductById(shopId, id);
  if (!existing) {
    return { success: false, message: 'Product not found.' };
  }

  // Check if product has sales or purchase order items in this shop
  const salesCheck = await query('SELECT COUNT(*) as count FROM sales WHERE product_id = $1 AND shop_id = $2', [id, shopId]);
  const salesCount = parseInt(salesCheck.rows[0]?.count || '0', 10);
  if (salesCount > 0) {
    return {
      success: false,
      message: `Cannot delete product with ${salesCount} recorded sales. Archive or adjust stock instead.`,
    };
  }

  const poCheck = await query(
    'SELECT COUNT(*) as count FROM purchase_order_items poi JOIN purchase_orders po ON poi.purchase_order_id = po.id WHERE poi.product_id = $1 AND po.shop_id = $2',
    [id, shopId]
  );
  const poCount = parseInt(poCheck.rows[0]?.count || '0', 10);
  if (poCount > 0) {
    return {
      success: false,
      message: `Cannot delete product associated with ${poCount} purchase order records.`,
    };
  }

  await query('DELETE FROM products WHERE id = $1 AND shop_id = $2', [id, shopId]);
  return { success: true };
}

export async function getProductCategories(shopId: number): Promise<string[]> {
  const result = await query('SELECT DISTINCT category FROM products WHERE shop_id = $1 ORDER BY category ASC', [shopId]);
  return result.rows.map((r) => r.category);
}
