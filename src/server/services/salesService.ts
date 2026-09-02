import { query, getClient } from '../db/index';
import { Sale } from '../types/index';

export interface RecordSaleInput {
  productId: number;
  quantity: number;
  unitPrice?: number;
  soldAt?: string;
  userId?: number;
}

export async function recordSale(shopId: number, input: RecordSaleInput): Promise<{ sale: Sale; remainingStock: number }> {
  const { productId, quantity, soldAt, userId } = input;

  if (quantity <= 0) {
    throw new Error('Sale quantity must be greater than 0.');
  }

  const client = await getClient();

  try {
    // 1. Begin PostgreSQL transaction
    await client.query('BEGIN');

    // 2. Lock product row to prevent race conditions and check stock (scoped to shop_id)
    const productRes = await client.query(
      `SELECT id, shop_id, name, unit_price, current_stock 
       FROM products 
       WHERE id = $1 AND shop_id = $2
       FOR UPDATE`,
      [productId, shopId]
    );

    if (productRes.rows.length === 0) {
      throw new Error(`Product with ID ${productId} does not exist in your shop.`);
    }

    const product = productRes.rows[0];
    const currentStock = Number(product.current_stock);
    const saleUnitPrice = input.unitPrice !== undefined ? input.unitPrice : Number(product.unit_price);

    // 3. Prevent negative stock
    if (currentStock < quantity) {
      throw new Error(
        `Insufficient inventory for "${product.name}". Available stock: ${currentStock}, requested: ${quantity}.`
      );
    }

    const totalAmount = Number((quantity * saleUnitPrice).toFixed(2));
    const saleTimestamp = soldAt || new Date().toISOString();

    // 4. Insert sale record scoped to shop_id
    const saleRes = await client.query(
      `INSERT INTO sales (shop_id, product_id, quantity, unit_price, total_amount, sold_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, shop_id, product_id, quantity, unit_price, total_amount, sold_at, created_by, created_at`,
      [shopId, productId, quantity, saleUnitPrice, totalAmount, saleTimestamp, userId || null]
    );

    // 5. Deduct product stock atomically in this shop
    const newStock = currentStock - quantity;
    await client.query(
      `UPDATE products 
       SET current_stock = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND shop_id = $3`,
      [newStock, productId, shopId]
    );

    // 6. Commit transaction
    await client.query('COMMIT');

    const createdSale = saleRes.rows[0];

    return {
      sale: {
        id: createdSale.id,
        shop_id: createdSale.shop_id,
        product_id: createdSale.product_id,
        product_name: product.name,
        quantity: Number(createdSale.quantity),
        unit_price: Number(createdSale.unit_price),
        total_amount: Number(createdSale.total_amount),
        sold_at: new Date(createdSale.sold_at).toISOString(),
        created_by: createdSale.created_by,
        created_at: new Date(createdSale.created_at).toISOString(),
      },
      remainingStock: newStock,
    };
  } catch (error) {
    // Rollback on any failure
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getSalesHistory(shopId: number, filters: {
  productId?: number;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<{ sales: Sale[]; total: number }> {
  const { productId, limit = 50, offset = 0, startDate, endDate } = filters;

  const params: any[] = [shopId];
  let whereClauses: string[] = ['s.shop_id = $1'];

  if (productId) {
    params.push(productId);
    whereClauses.push(`s.product_id = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    whereClauses.push(`s.sold_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    whereClauses.push(`s.sold_at <= $${params.length}`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  // Get total count
  const countSql = `SELECT COUNT(*) as count FROM sales s ${whereSql}`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0]?.count || '0', 10);

  // Get records with joined details
  const sql = `
    SELECT 
      s.id,
      s.shop_id,
      s.product_id,
      p.name as product_name,
      p.sku as product_sku,
      p.category as product_category,
      s.quantity,
      s.unit_price,
      s.total_amount,
      s.sold_at,
      s.created_by,
      u.name as seller_name,
      s.created_at
    FROM sales s
    JOIN products p ON s.product_id = p.id AND p.shop_id = $1
    LEFT JOIN users u ON s.created_by = u.id AND u.shop_id = $1
    ${whereSql}
    ORDER BY s.sold_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  params.push(limit, offset);
  const result = await query(sql, params);

  const sales: Sale[] = result.rows.map((row) => ({
    id: row.id,
    shop_id: row.shop_id,
    product_id: row.product_id,
    product_name: row.product_name,
    product_sku: row.product_sku,
    product_category: row.product_category,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    total_amount: Number(row.total_amount),
    sold_at: new Date(row.sold_at).toISOString(),
    created_by: row.created_by,
    seller_name: row.seller_name || 'System / Staff',
    created_at: new Date(row.created_at).toISOString(),
  }));

  return { sales, total };
}

export async function getProductSalesTimeline(shopId: number, productId: number, days = 30): Promise<Array<{ date: string; quantity: number; revenue: number }>> {
  const sql = `
    SELECT 
      DATE(sold_at) as sale_date,
      SUM(quantity) as daily_quantity,
      SUM(total_amount) as daily_revenue
    FROM sales
    WHERE shop_id = $1 AND product_id = $2 AND sold_at >= NOW() - ($3 || ' days')::INTERVAL
    GROUP BY DATE(sold_at)
    ORDER BY sale_date ASC;
  `;

  const result = await query(sql, [shopId, productId, days]);
  return result.rows.map((r) => ({
    date: new Date(r.sale_date).toISOString().split('T')[0],
    quantity: Number(r.daily_quantity || 0),
    revenue: Number(r.daily_revenue || 0),
  }));
}
