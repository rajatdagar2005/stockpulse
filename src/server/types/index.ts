export type UserRole = 'OWNER' | 'STAFF';

export interface Shop {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  shop_id: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  shop_id: number;
  shop_name: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  shop_id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string | null;
  lead_time_days: number;
  created_at: string;
  updated_at: string;
}

export type ProductStatus = 'CRITICAL' | 'LOW' | 'HEALTHY' | 'OVERSTOCK' | 'DEAD_STOCK';

export interface Product {
  id: number;
  shop_id: number;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  current_stock: number;
  minimum_stock: number;
  unit_price: number;
  cost_price: number;
  supplier_id: number;
  safety_stock: number;
  created_at: string;
  updated_at: string;
  // Joined or calculated fields
  supplier_name?: string;
  supplier_lead_time?: number;
  average_daily_sales?: number;
  reorder_point?: number;
  recommended_order?: number;
  status?: ProductStatus;
  inventory_value?: number;
  sales_last_30_days?: number;
}

export interface Sale {
  id: number;
  shop_id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sold_at: string;
  created_by: number | null;
  seller_name?: string;
  created_at: string;
}

export type PurchaseOrderStatus = 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id?: number;
  purchase_order_id?: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
}

export interface PurchaseOrder {
  id: number;
  shop_id: number;
  supplier_id: number;
  supplier_name?: string;
  order_number: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  ordered_at: string;
  expected_delivery_date: string | null;
  created_by: number | null;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
  item_count?: number;
}

export interface ReorderRecommendation {
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  supplier_id: number;
  supplier_name: string;
  lead_time_days: number;
  current_stock: number;
  safety_stock: number;
  unit_price: number;
  cost_price: number;
  average_daily_sales: number;
  sales_last_30_days: number;
  reorder_point: number;
  recommended_order: number;
  status: ProductStatus;
  reason: string;
  estimated_cost: number;
}

export interface DeadStockItem {
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  cost_price: number;
  unit_price: number;
  sales_last_30_days: number;
  inventory_value: number;
  last_sold_at: string | null;
  days_since_last_sale: number | null;
}

export interface DashboardMetrics {
  totalProducts: number;
  inventoryValue: number;
  lowStockCount: number;
  deadStockCount: number;
  salesToday: {
    revenue: number;
    count: number;
  };
  salesThisMonth: {
    revenue: number;
    count: number;
  };
  pendingPurchaseOrdersCount: number;
}
