import { query } from '../db/index';
import { ProductStatus, ReorderRecommendation, DeadStockItem } from '../types/index';

export interface ProductInventoryMetrics {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  supplierId: number;
  supplierName: string;
  leadTimeDays: number;
  currentStock: number;
  safetyStock: number;
  unitPrice: number;
  costPrice: number;
  salesLast30Days: number;
  lastSoldAt: string | null;
  daysSinceLastSale: number | null;
}

export function calculateAverageDailySales(salesLast30Days: number): number {
  if (!salesLast30Days || salesLast30Days <= 0) return 0;
  return Number((salesLast30Days / 30).toFixed(2));
}

export function calculateReorderPoint(
  averageDailySales: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  const calculated = averageDailySales * leadTimeDays + safetyStock;
  return Math.ceil(calculated);
}

export function calculateRecommendedOrder(
  currentStock: number,
  averageDailySales: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  const targetStock = averageDailySales * (leadTimeDays + 7) + safetyStock;
  return Math.max(0, Math.ceil(targetStock - currentStock));
}

export function classifyStockStatus(
  currentStock: number,
  averageDailySales: number,
  reorderPoint: number,
  salesLast30Days: number
): ProductStatus {
  // 1. Dead Stock (positive stock with little or no demand in 30 days)
  if (currentStock > 0 && salesLast30Days <= 5) {
    return 'DEAD_STOCK';
  }

  // 2. Critical Stock (current inventory cannot even cover 1 day's average demand)
  if (averageDailySales > 0 && currentStock < averageDailySales) {
    return 'CRITICAL';
  }

  // 3. Low Stock (inventory is at or below reorder threshold)
  if (currentStock <= reorderPoint) {
    return 'LOW';
  }

  // 4. Overstock (stock covers >60 days of demand)
  if (averageDailySales > 0 && currentStock > averageDailySales * 60) {
    return 'OVERSTOCK';
  }

  // 5. Healthy
  return 'HEALTHY';
}

export function generateReorderReason(
  status: ProductStatus,
  currentStock: number,
  averageDailySales: number,
  leadTimeDays: number,
  safetyStock: number,
  reorderPoint: number,
  recommendedOrder: number
): string {
  const leadTimeDemand = Math.ceil(averageDailySales * leadTimeDays);

  if (status === 'CRITICAL') {
    return `Critical shortage: Current stock (${currentStock}) is below 1 day's average sales (${averageDailySales.toFixed(1)}/day). High stockout risk during the ${leadTimeDays}-day supplier lead time.`;
  }

  if (status === 'LOW') {
    return `Stock (${currentStock}) has fallen below reorder point (${reorderPoint}). Expected demand over ${leadTimeDays} days lead time is ${leadTimeDemand} units + ${safetyStock} safety buffer.`;
  }

  if (status === 'DEAD_STOCK') {
    return `Low velocity: Only recorded ${currentStock > 0 ? 'minimal' : '0'} sales in the last 30 days with ${currentStock} units tying up capital.`;
  }

  if (status === 'OVERSTOCK') {
    return `Excess stock: Inventory of ${currentStock} units exceeds 60 days of projected demand (${(averageDailySales * 60).toFixed(0)} units).`;
  }

  return `Inventory is healthy. Current stock (${currentStock}) is comfortably above the reorder point (${reorderPoint}).`;
}

export async function getProductInventoryMetrics(shopId: number): Promise<ProductInventoryMetrics[]> {
  const sql = `
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.sku,
      p.category,
      p.supplier_id,
      s.name as supplier_name,
      s.lead_time_days,
      p.current_stock,
      p.safety_stock,
      p.unit_price,
      p.cost_price,
      COALESCE(sales_30.total_sales, 0) as sales_last_30_days,
      last_sale.last_sold_at,
      ROUND(EXTRACT(EPOCH FROM (NOW() - last_sale.last_sold_at)) / 86400) as days_since_last_sale
    FROM products p
    JOIN suppliers s ON p.supplier_id = s.id AND s.shop_id = $1
    LEFT JOIN (
      SELECT product_id, SUM(quantity) as total_sales
      FROM sales
      WHERE shop_id = $1 AND sold_at >= NOW() - INTERVAL '30 days'
      GROUP BY product_id
    ) sales_30 ON p.id = sales_30.product_id
    LEFT JOIN (
      SELECT product_id, MAX(sold_at) as last_sold_at
      FROM sales
      WHERE shop_id = $1
      GROUP BY product_id
    ) last_sale ON p.id = last_sale.product_id
    WHERE p.shop_id = $1
    ORDER BY p.name ASC;
  `;

  const result = await query(sql, [shopId]);

  return result.rows.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    category: row.category,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    leadTimeDays: row.lead_time_days || 3,
    currentStock: Number(row.current_stock),
    safetyStock: Number(row.safety_stock),
    unitPrice: Number(row.unit_price),
    costPrice: Number(row.cost_price),
    salesLast30Days: Number(row.sales_last_30_days),
    lastSoldAt: row.last_sold_at ? new Date(row.last_sold_at).toISOString() : null,
    daysSinceLastSale: row.days_since_last_sale !== null ? Number(row.days_since_last_sale) : null,
  }));
}

export async function getReorderRecommendations(shopId: number): Promise<ReorderRecommendation[]> {
  const metricsList = await getProductInventoryMetrics(shopId);
  const recommendations: ReorderRecommendation[] = [];

  for (const item of metricsList) {
    const averageDailySales = calculateAverageDailySales(item.salesLast30Days);
    const reorderPoint = calculateReorderPoint(
      averageDailySales,
      item.leadTimeDays,
      item.safetyStock
    );
    const recommendedOrder = calculateRecommendedOrder(
      item.currentStock,
      averageDailySales,
      item.leadTimeDays,
      item.safetyStock
    );
    const status = classifyStockStatus(
      item.currentStock,
      averageDailySales,
      reorderPoint,
      item.salesLast30Days
    );

    // Only include items needing attention (CRITICAL or LOW) or with recommended order > 0
    if (status === 'CRITICAL' || status === 'LOW' || recommendedOrder > 0) {
      const reason = generateReorderReason(
        status,
        item.currentStock,
        averageDailySales,
        item.leadTimeDays,
        item.safetyStock,
        reorderPoint,
        recommendedOrder
      );

      recommendations.push({
        product_id: item.productId,
        product_name: item.productName,
        sku: item.sku,
        category: item.category,
        supplier_id: item.supplierId,
        supplier_name: item.supplierName,
        lead_time_days: item.leadTimeDays,
        current_stock: item.currentStock,
        safety_stock: item.safetyStock,
        unit_price: item.unitPrice,
        cost_price: item.costPrice,
        average_daily_sales: averageDailySales,
        sales_last_30_days: item.salesLast30Days,
        reorder_point: reorderPoint,
        recommended_order: recommendedOrder,
        status,
        reason,
        estimated_cost: Number((recommendedOrder * item.costPrice).toFixed(2)),
      });
    }
  }

  // Sort CRITICAL first, then LOW, then by recommended order quantity descending
  return recommendations.sort((a, b) => {
    if (a.status === 'CRITICAL' && b.status !== 'CRITICAL') return -1;
    if (b.status === 'CRITICAL' && a.status !== 'CRITICAL') return 1;
    return b.recommended_order - a.recommended_order;
  });
}

export async function getDeadStockItems(shopId: number): Promise<DeadStockItem[]> {
  const metricsList = await getProductInventoryMetrics(shopId);
  const deadStock: DeadStockItem[] = [];

  for (const item of metricsList) {
    if (item.currentStock > 0 && item.salesLast30Days <= 5) {
      deadStock.push({
        product_id: item.productId,
        product_name: item.productName,
        sku: item.sku,
        category: item.category,
        current_stock: item.currentStock,
        cost_price: item.costPrice,
        unit_price: item.unitPrice,
        sales_last_30_days: item.salesLast30Days,
        inventory_value: Number((item.currentStock * item.costPrice).toFixed(2)),
        last_sold_at: item.lastSoldAt,
        days_since_last_sale: item.daysSinceLastSale,
      });
    }
  }

  // Sort by inventory value tied up descending
  return deadStock.sort((a, b) => b.inventory_value - a.inventory_value);
}
