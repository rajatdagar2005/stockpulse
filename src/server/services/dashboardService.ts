import { query } from '../db/index';
import {
  getProductInventoryMetrics,
  calculateAverageDailySales,
  calculateReorderPoint,
  calculateRecommendedOrder,
  classifyStockStatus,
  generateReorderReason,
} from './reorderService';

export async function getDashboardOverview(shopId: number): Promise<{
  metrics: {
    totalProducts: number;
    inventoryValue: number;
    lowStockCount: number;
    deadStockCount: number;
    criticalStockCount: number;
    salesToday: { revenue: number; count: number };
    salesThisMonth: { revenue: number; count: number };
    pendingPOCount: number;
  };
  actionRequired: Array<{
    productId: number;
    productName: string;
    sku: string;
    category: string;
    currentStock: number;
    averageDailySales: number;
    reorderPoint: number;
    recommendedOrder: number;
    status: string;
    reason: string;
    supplierName: string;
  }>;
  recentSales: Array<{
    id: number;
    productName: string;
    quantity: number;
    totalAmount: number;
    soldAt: string;
    sellerName: string;
  }>;
  recentPurchaseOrders: Array<{
    id: number;
    orderNumber: string;
    supplierName: string;
    status: string;
    totalAmount: number;
    orderedAt: string;
    itemCount: number;
  }>;
  healthDistribution: {
    healthy: number;
    low: number;
    critical: number;
    deadStock: number;
    overstock: number;
  };
}> {
  // 1. Calculate Inventory Valuation and Counts from actual inventory metrics scoped by shopId
  const metricsList = await getProductInventoryMetrics(shopId);

  let inventoryValue = 0;
  let lowStockCount = 0;
  let deadStockCount = 0;
  let criticalStockCount = 0;
  let healthyCount = 0;
  let overstockCount = 0;

  const actionRequired: Array<any> = [];

  for (const item of metricsList) {
    inventoryValue += item.currentStock * item.costPrice;

    const ads = calculateAverageDailySales(item.salesLast30Days);
    const rop = calculateReorderPoint(ads, item.leadTimeDays, item.safetyStock);
    const recOrder = calculateRecommendedOrder(item.currentStock, ads, item.leadTimeDays, item.safetyStock);
    const status = classifyStockStatus(item.currentStock, ads, rop, item.salesLast30Days);

    if (status === 'CRITICAL') {
      criticalStockCount++;
      lowStockCount++; // Critical is also low stock
    } else if (status === 'LOW') {
      lowStockCount++;
    } else if (status === 'DEAD_STOCK') {
      deadStockCount++;
    } else if (status === 'OVERSTOCK') {
      overstockCount++;
    } else {
      healthyCount++;
    }

    if (status === 'CRITICAL' || status === 'LOW') {
      actionRequired.push({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        category: item.category,
        currentStock: item.currentStock,
        averageDailySales: ads,
        reorderPoint: rop,
        recommendedOrder: recOrder,
        status,
        reason: generateReorderReason(status, item.currentStock, ads, item.leadTimeDays, item.safetyStock, rop, recOrder),
        supplierName: item.supplierName,
      });
    }
  }

  // Sort action required by critical first
  actionRequired.sort((a, b) => {
    if (a.status === 'CRITICAL' && b.status !== 'CRITICAL') return -1;
    if (b.status === 'CRITICAL' && a.status !== 'CRITICAL') return 1;
    return b.recommendedOrder - a.recommendedOrder;
  });

  // 2. Sales Today & Sales This Month scoped to shop_id
  const todaySalesRes = await query(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as revenue,
      COUNT(id) as count
    FROM sales
    WHERE shop_id = $1 AND sold_at >= CURRENT_DATE;
  `, [shopId]);

  const monthSalesRes = await query(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as revenue,
      COUNT(id) as count
    FROM sales
    WHERE shop_id = $1 AND sold_at >= DATE_TRUNC('month', CURRENT_DATE);
  `, [shopId]);

  // 3. Pending Purchase Orders Count scoped to shop_id
  const poPendingRes = await query(`
    SELECT COUNT(*) as count 
    FROM purchase_orders 
    WHERE shop_id = $1 AND status IN ('PENDING', 'ORDERED');
  `, [shopId]);

  // 4. Recent 6 Sales scoped to shop_id
  const recentSalesRes = await query(`
    SELECT 
      s.id,
      p.name as product_name,
      s.quantity,
      s.total_amount,
      s.sold_at,
      COALESCE(u.name, 'Staff') as seller_name
    FROM sales s
    JOIN products p ON s.product_id = p.id AND p.shop_id = $1
    LEFT JOIN users u ON s.created_by = u.id AND u.shop_id = $1
    WHERE s.shop_id = $1
    ORDER BY s.sold_at DESC
    LIMIT 6;
  `, [shopId]);

  // 5. Recent 5 Purchase Orders scoped to shop_id
  const recentPoRes = await query(`
    SELECT 
      po.id,
      po.order_number,
      s.name as supplier_name,
      po.status,
      po.total_amount,
      po.ordered_at,
      COUNT(poi.id) as item_count
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id AND s.shop_id = $1
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    WHERE po.shop_id = $1
    GROUP BY po.id, s.name
    ORDER BY po.ordered_at DESC
    LIMIT 5;
  `, [shopId]);

  return {
    metrics: {
      totalProducts: metricsList.length,
      inventoryValue: Number(inventoryValue.toFixed(2)),
      lowStockCount,
      deadStockCount,
      criticalStockCount,
      salesToday: {
        revenue: Number(todaySalesRes.rows[0]?.revenue || 0),
        count: Number(todaySalesRes.rows[0]?.count || 0),
      },
      salesThisMonth: {
        revenue: Number(monthSalesRes.rows[0]?.revenue || 0),
        count: Number(monthSalesRes.rows[0]?.count || 0),
      },
      pendingPOCount: Number(poPendingRes.rows[0]?.count || 0),
    },
    actionRequired: actionRequired.slice(0, 8),
    recentSales: recentSalesRes.rows.map((r) => ({
      id: r.id,
      productName: r.product_name,
      quantity: Number(r.quantity),
      totalAmount: Number(r.total_amount),
      soldAt: new Date(r.sold_at).toISOString(),
      sellerName: r.seller_name,
    })),
    recentPurchaseOrders: recentPoRes.rows.map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      supplierName: r.supplier_name,
      status: r.status,
      totalAmount: Number(r.total_amount),
      orderedAt: new Date(r.ordered_at).toISOString(),
      itemCount: Number(r.item_count || 0),
    })),
    healthDistribution: {
      healthy: healthyCount,
      low: lowStockCount - criticalStockCount,
      critical: criticalStockCount,
      deadStock: deadStockCount,
      overstock: overstockCount,
    },
  };
}
