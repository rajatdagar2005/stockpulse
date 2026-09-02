import { query, getClient } from '../db/index';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../types/index';

export interface CreatePurchaseOrderItemInput {
  productId: number;
  quantity: number;
  unitCost?: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: number;
  expectedDeliveryDate?: string;
  items: CreatePurchaseOrderItemInput[];
  userId?: number;
}

export async function generateNextOrderNumber(shopId: number): Promise<string> {
  const res = await query(
    `SELECT order_number 
     FROM purchase_orders 
     WHERE order_number LIKE 'PO-%' 
     ORDER BY id DESC 
     LIMIT 1`
  );

  if (res.rows.length === 0) {
    return 'PO-1001';
  }

  const lastOrderNumber = res.rows[0].order_number;
  const match = lastOrderNumber.match(/PO-(\d+)/);
  if (match && match[1]) {
    const lastNum = parseInt(match[1], 10);
    if (!isNaN(lastNum)) {
      return `PO-${lastNum + 1}`;
    }
  }

  return `PO-${Date.now().toString().slice(-6)}`;
}

export async function createPurchaseOrder(shopId: number, input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  const { supplierId, expectedDeliveryDate, items, userId } = input;

  if (!items || items.length === 0) {
    throw new Error('Purchase order must contain at least one product line item.');
  }

  // Prevent duplicate products in the same PO
  const productIds = items.map((i) => i.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw new Error('Duplicate products in the same purchase order are not allowed.');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify supplier exists in this specific shop
    const supRes = await client.query(
      'SELECT id, name, lead_time_days FROM suppliers WHERE id = $1 AND shop_id = $2',
      [supplierId, shopId]
    );
    if (supRes.rows.length === 0) {
      throw new Error(`Supplier with ID ${supplierId} not found in your shop.`);
    }

    const orderNumber = await generateNextOrderNumber(shopId);

    // Validate each product belongs to this shop and calculate totals
    let totalAmount = 0;
    const validatedItems: Array<{
      productId: number;
      quantity: number;
      unitCost: number;
      totalAmount: number;
    }> = [];

    for (const item of items) {
      const qty = Math.floor(Number(item.quantity));
      if (isNaN(qty) || qty <= 0) {
        throw new Error('Item quantity must be a positive whole integer greater than 0.');
      }

      // Verify product belongs to this shop
      const prodRes = await client.query(
        'SELECT id, name, sku, cost_price, current_stock FROM products WHERE id = $1 AND shop_id = $2',
        [item.productId, shopId]
      );
      if (prodRes.rows.length === 0) {
        throw new Error(`Product with ID ${item.productId} not found in your shop.`);
      }

      let unitCost = item.unitCost;
      if (unitCost === undefined || unitCost === null || isNaN(Number(unitCost)) || Number(unitCost) < 0) {
        unitCost = Number(prodRes.rows[0].cost_price);
      } else {
        unitCost = Number(Number(unitCost).toFixed(2));
      }

      const itemTotal = Number((qty * unitCost).toFixed(2));
      totalAmount += itemTotal;

      validatedItems.push({
        productId: item.productId,
        quantity: qty,
        unitCost,
        totalAmount: itemTotal,
      });
    }

    totalAmount = Number(totalAmount.toFixed(2));

    // Default expected delivery date if not provided: today + lead_time_days
    let deliveryDate = expectedDeliveryDate;
    if (!deliveryDate) {
      const leadTime = supRes.rows[0].lead_time_days || 3;
      const expected = new Date();
      expected.setDate(expected.getDate() + leadTime);
      deliveryDate = expected.toISOString();
    }

    // Insert purchase order strictly scoped to shop_id with initial PENDING status (NO stock changes here)
    const poRes = await client.query(
      `INSERT INTO purchase_orders (
         shop_id, supplier_id, order_number, status, total_amount, 
         expected_delivery_date, created_by
       )
       VALUES ($1, $2, $3, 'PENDING', $4, $5, $6)
       RETURNING id, shop_id, supplier_id, order_number, status, total_amount, ordered_at, expected_delivery_date, created_by, created_at, updated_at`,
      [shopId, supplierId, orderNumber, totalAmount, deliveryDate, userId || null]
    );

    const poId = poRes.rows[0].id;

    // Insert PO items
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO purchase_order_items (
           purchase_order_id, product_id, quantity, unit_cost, total_amount
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [poId, item.productId, item.quantity, item.unitCost, item.totalAmount]
      );
    }

    await client.query('COMMIT');

    const createdPO = await getPurchaseOrderById(shopId, poId);
    return createdPO!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getPurchaseOrders(shopId: number, filters: {
  status?: string;
  supplierId?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<{ orders: PurchaseOrder[]; total: number }> {
  const { status, supplierId, limit = 50, offset = 0 } = filters;

  const params: any[] = [shopId];
  let whereClauses: string[] = ['po.shop_id = $1'];

  if (status && status !== 'ALL') {
    params.push(status);
    whereClauses.push(`po.status = $${params.length}`);
  }

  if (supplierId) {
    params.push(supplierId);
    whereClauses.push(`po.supplier_id = $${params.length}`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const countRes = await query(`SELECT COUNT(*) as count FROM purchase_orders po ${whereSql}`, params);
  const total = parseInt(countRes.rows[0]?.count || '0', 10);

  const sql = `
    SELECT 
      po.id,
      po.shop_id,
      po.supplier_id,
      s.name as supplier_name,
      po.order_number,
      po.status,
      po.total_amount,
      po.ordered_at,
      po.expected_delivery_date,
      po.created_by,
      u.name as creator_name,
      po.created_at,
      po.updated_at,
      COUNT(poi.id) as item_count
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id AND s.shop_id = $1
    LEFT JOIN users u ON po.created_by = u.id AND u.shop_id = $1
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    ${whereSql}
    GROUP BY po.id, s.name, u.name
    ORDER BY po.ordered_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  params.push(limit, offset);
  const result = await query(sql, params);

  const orders: PurchaseOrder[] = result.rows.map((row) => ({
    id: row.id,
    shop_id: row.shop_id,
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    order_number: row.order_number,
    status: row.status as PurchaseOrderStatus,
    total_amount: Number(row.total_amount),
    ordered_at: new Date(row.ordered_at).toISOString(),
    expected_delivery_date: row.expected_delivery_date ? new Date(row.expected_delivery_date).toISOString() : null,
    created_by: row.created_by,
    creator_name: row.creator_name || 'Owner',
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    item_count: Number(row.item_count || 0),
  }));

  return { orders, total };
}

export async function getPurchaseOrderById(shopId: number, id: number): Promise<PurchaseOrder | null> {
  const poSql = `
    SELECT 
      po.id,
      po.shop_id,
      po.supplier_id,
      s.name as supplier_name,
      po.order_number,
      po.status,
      po.total_amount,
      po.ordered_at,
      po.expected_delivery_date,
      po.created_by,
      u.name as creator_name,
      po.created_at,
      po.updated_at
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id AND s.shop_id = $1
    LEFT JOIN users u ON po.created_by = u.id AND u.shop_id = $1
    WHERE po.id = $2 AND po.shop_id = $1
  `;

  const poRes = await query(poSql, [shopId, id]);
  if (poRes.rows.length === 0) return null;

  const row = poRes.rows[0];

  const itemsSql = `
    SELECT 
      poi.id,
      poi.purchase_order_id,
      poi.product_id,
      p.name as product_name,
      p.sku as product_sku,
      poi.quantity,
      poi.unit_cost,
      poi.total_amount
    FROM purchase_order_items poi
    JOIN products p ON poi.product_id = p.id AND p.shop_id = $1
    WHERE poi.purchase_order_id = $2
    ORDER BY p.name ASC
  `;

  const itemsRes = await query(itemsSql, [shopId, id]);

  const items: PurchaseOrderItem[] = itemsRes.rows.map((item) => ({
    id: item.id,
    purchase_order_id: item.purchase_order_id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku,
    quantity: Number(item.quantity),
    unit_cost: Number(item.unit_cost),
    total_amount: Number(item.total_amount),
  }));

  return {
    id: row.id,
    shop_id: row.shop_id,
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    order_number: row.order_number,
    status: row.status as PurchaseOrderStatus,
    total_amount: Number(row.total_amount),
    ordered_at: new Date(row.ordered_at).toISOString(),
    expected_delivery_date: row.expected_delivery_date ? new Date(row.expected_delivery_date).toISOString() : null,
    created_by: row.created_by,
    creator_name: row.creator_name || 'Owner',
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    items,
    item_count: items.length,
  };
}

export async function updatePurchaseOrderStatus(
  shopId: number,
  id: number,
  newStatus: PurchaseOrderStatus
): Promise<PurchaseOrder> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Lock and query the purchase order row within this shop to prevent race conditions
    const poRes = await client.query(
      `SELECT id, shop_id, supplier_id, order_number, status, total_amount, ordered_at, expected_delivery_date
       FROM purchase_orders 
       WHERE id = $1 AND shop_id = $2 
       FOR UPDATE`,
      [id, shopId]
    );

    if (poRes.rows.length === 0) {
      throw new Error(`Purchase order with ID ${id} not found in your shop.`);
    }

    const currentPO = poRes.rows[0];
    const currentStatus = currentPO.status as PurchaseOrderStatus;

    if (currentStatus === 'RECEIVED') {
      throw new Error(`Purchase order ${currentPO.order_number} has already been marked as RECEIVED and inventory stock was replenished.`);
    }

    if (currentStatus === 'CANCELLED') {
      throw new Error(`Purchase order ${currentPO.order_number} is CANCELLED and cannot be changed.`);
    }

    // Validate allowed state transitions
    const validTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
      PENDING: ['ORDERED', 'RECEIVED', 'CANCELLED'],
      ORDERED: ['RECEIVED', 'CANCELLED'],
      RECEIVED: [], // Terminal state
      CANCELLED: [], // Terminal state
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Permitted transitions: ${
          validTransitions[currentStatus].join(', ') || 'None (terminal status)'
        }`
      );
    }

    // If changing to RECEIVED, fetch PO items and atomically increment inventory stock in PostgreSQL
    if (newStatus === 'RECEIVED') {
      const itemsRes = await client.query(
        `SELECT poi.id, poi.product_id, poi.quantity, p.name as product_name, p.current_stock
         FROM purchase_order_items poi
         JOIN products p ON poi.product_id = p.id AND p.shop_id = $1
         WHERE poi.purchase_order_id = $2
         FOR UPDATE OF p`,
        [shopId, id]
      );

      if (itemsRes.rows.length === 0) {
        throw new Error(`Purchase order ${currentPO.order_number} has no valid products to receive.`);
      }

      for (const item of itemsRes.rows) {
        const qtyToAdd = Math.floor(Number(item.quantity));
        if (qtyToAdd > 0) {
          await client.query(
            `UPDATE products 
             SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND shop_id = $3`,
            [qtyToAdd, item.product_id, shopId]
          );
        }
      }
    }

    // Update status and timestamp
    await client.query(
      `UPDATE purchase_orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND shop_id = $3`,
      [newStatus, id, shopId]
    );

    await client.query('COMMIT');

    const updated = await getPurchaseOrderById(shopId, id);
    return updated!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
