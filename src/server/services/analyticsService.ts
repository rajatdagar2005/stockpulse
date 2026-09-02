import { query } from '../db/index';
import { getProductInventoryMetrics, calculateAverageDailySales, calculateReorderPoint, classifyStockStatus } from './reorderService';

export async function getSalesAnalytics(shopId: number, days = 30): Promise<{
  totalRevenue: number;
  totalUnitsSold: number;
  averageOrderValue: number;
  salesCount: number;
  timeline: Array<{ date: string; revenue: number; units: number; orders: number }>;
}> {
  const summarySql = `
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(quantity), 0) as total_units,
      COUNT(id) as sales_count
    FROM sales
    WHERE shop_id = $1 AND sold_at >= NOW() - ($2 || ' days')::INTERVAL;
  `;

  const summaryRes = await query(summarySql, [shopId, days]);
  const totalRevenue = Number(summaryRes.rows[0]?.total_revenue || 0);
  const totalUnitsSold = Number(summaryRes.rows[0]?.total_units || 0);
  const salesCount = Number(summaryRes.rows[0]?.sales_count || 0);
  const averageOrderValue = salesCount > 0 ? Number((totalRevenue / salesCount).toFixed(2)) : 0;

  const timelineSql = `
    SELECT 
      DATE(sold_at) as sale_date,
      SUM(total_amount) as revenue,
      SUM(quantity) as units,
      COUNT(id) as orders
    FROM sales
    WHERE shop_id = $1 AND sold_at >= NOW() - ($2 || ' days')::INTERVAL
    GROUP BY DATE(sold_at)
    ORDER BY sale_date ASC;
  `;

  const timelineRes = await query(timelineSql, [shopId, days]);
  const timeline = timelineRes.rows.map((r) => ({
    date: new Date(r.sale_date).toISOString().split('T')[0],
    revenue: Number(r.revenue || 0),
    units: Number(r.units || 0),
    orders: Number(r.orders || 0),
  }));

  return {
    totalRevenue,
    totalUnitsSold,
    averageOrderValue,
    salesCount,
    timeline,
  };
}

export async function getTopProducts(shopId: number, limit = 10, days = 30): Promise<Array<{
  productId: number;
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  revenue: number;
  currentStock: number;
}>> {
  const sql = `
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.sku,
      p.category,
      p.current_stock,
      COALESCE(SUM(s.quantity), 0) as units_sold,
      COALESCE(SUM(s.total_amount), 0) as revenue
    FROM products p
    JOIN sales s ON p.id = s.product_id AND s.shop_id = $1
    WHERE p.shop_id = $1 AND s.sold_at >= NOW() - ($2 || ' days')::INTERVAL
    GROUP BY p.id, p.name, p.sku, p.category, p.current_stock
    ORDER BY units_sold DESC
    LIMIT $3;
  `;

  const result = await query(sql, [shopId, days, limit]);
  return result.rows.map((r) => ({
    productId: r.product_id,
    productName: r.product_name,
    sku: r.sku,
    category: r.category,
    unitsSold: Number(r.units_sold || 0),
    revenue: Number(r.revenue || 0),
    currentStock: Number(r.current_stock || 0),
  }));
}

export async function getCategoryPerformance(shopId: number, days = 30): Promise<Array<{
  category: string;
  productCount: number;
  unitsSold: number;
  revenue: number;
  inventoryValue: number;
}>> {
  const sql = `
    SELECT 
      p.category,
      COUNT(DISTINCT p.id) as product_count,
      COALESCE(SUM(p.current_stock * p.cost_price), 0) as inventory_value,
      COALESCE(SUM(s.quantity), 0) as units_sold,
      COALESCE(SUM(s.total_amount), 0) as revenue
    FROM products p
    LEFT JOIN sales s ON p.id = s.product_id AND s.shop_id = $1 AND s.sold_at >= NOW() - ($2 || ' days')::INTERVAL
    WHERE p.shop_id = $1
    GROUP BY p.category
    ORDER BY revenue DESC;
  `;

  const result = await query(sql, [shopId, days]);
  return result.rows.map((r) => ({
    category: r.category,
    productCount: Number(r.product_count || 0),
    unitsSold: Number(r.units_sold || 0),
    revenue: Number(r.revenue || 0),
    inventoryValue: Number(r.inventory_value || 0),
  }));
}

export async function getInventoryHealthStats(shopId: number): Promise<{
  totalInventoryValue: number;
  totalProducts: number;
  healthBreakdown: {
    healthy: number;
    low: number;
    critical: number;
    deadStock: number;
    overstock: number;
  };
}> {
  const metricsList = await getProductInventoryMetrics(shopId);

  let totalValue = 0;
  const breakdown = {
    healthy: 0,
    low: 0,
    critical: 0,
    deadStock: 0,
    overstock: 0,
  };

  for (const item of metricsList) {
    totalValue += item.currentStock * item.costPrice;

    const ads = calculateAverageDailySales(item.salesLast30Days);
    const rop = calculateReorderPoint(ads, item.leadTimeDays, item.safetyStock);
    const status = classifyStockStatus(item.currentStock, ads, rop, item.salesLast30Days);

    if (status === 'HEALTHY') breakdown.healthy++;
    else if (status === 'LOW') breakdown.low++;
    else if (status === 'CRITICAL') breakdown.critical++;
    else if (status === 'DEAD_STOCK') breakdown.deadStock++;
    else if (status === 'OVERSTOCK') breakdown.overstock++;
  }

  return {
    totalInventoryValue: Number(totalValue.toFixed(2)),
    totalProducts: metricsList.length,
    healthBreakdown: breakdown,
  };
}
