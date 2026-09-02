import { query } from '../db/index';
import { Supplier } from '../types/index';

export async function getSuppliers(shopId: number): Promise<Array<Supplier & { product_count: number; active_order_count: number }>> {
  const sql = `
    SELECT 
      s.id,
      s.shop_id,
      s.name,
      s.contact_name,
      s.email,
      s.phone,
      s.address,
      s.lead_time_days,
      s.created_at,
      s.updated_at,
      COUNT(DISTINCT p.id) as product_count,
      COUNT(DISTINCT CASE WHEN po.status IN ('PENDING', 'ORDERED') THEN po.id END) as active_order_count
    FROM suppliers s
    LEFT JOIN products p ON s.id = p.supplier_id AND p.shop_id = $1
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.shop_id = $1
    WHERE s.shop_id = $1
    GROUP BY s.id
    ORDER BY s.name ASC;
  `;

  const result = await query(sql, [shopId]);

  return result.rows.map((r) => ({
    id: r.id,
    shop_id: r.shop_id,
    name: r.name,
    contact_name: r.contact_name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    lead_time_days: Number(r.lead_time_days),
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString(),
    product_count: Number(r.product_count || 0),
    active_order_count: Number(r.active_order_count || 0),
  }));
}

export async function getSupplierById(shopId: number, id: number): Promise<Supplier | null> {
  const sql = `SELECT * FROM suppliers WHERE id = $1 AND shop_id = $2`;
  const result = await query(sql, [id, shopId]);
  if (result.rows.length === 0) return null;

  const r = result.rows[0];
  return {
    id: r.id,
    shop_id: r.shop_id,
    name: r.name,
    contact_name: r.contact_name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    lead_time_days: Number(r.lead_time_days),
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString(),
  };
}

export async function createSupplier(shopId: number, data: {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  lead_time_days: number;
}): Promise<Supplier> {
  const sql = `
    INSERT INTO suppliers (shop_id, name, contact_name, email, phone, address, lead_time_days)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const result = await query(sql, [
    shopId,
    data.name,
    data.contact_name,
    data.email,
    data.phone,
    data.address || null,
    data.lead_time_days,
  ]);

  const r = result.rows[0];
  return {
    id: r.id,
    shop_id: r.shop_id,
    name: r.name,
    contact_name: r.contact_name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    lead_time_days: Number(r.lead_time_days),
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString(),
  };
}

export async function updateSupplier(
  shopId: number,
  id: number,
  data: {
    name?: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    lead_time_days?: number;
  }
): Promise<Supplier | null> {
  const existing = await getSupplierById(shopId, id);
  if (!existing) return null;

  const sql = `
    UPDATE suppliers
    SET 
      name = COALESCE($1, name),
      contact_name = COALESCE($2, contact_name),
      email = COALESCE($3, email),
      phone = COALESCE($4, phone),
      address = COALESCE($5, address),
      lead_time_days = COALESCE($6, lead_time_days),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $7 AND shop_id = $8
    RETURNING *;
  `;

  const result = await query(sql, [
    data.name,
    data.contact_name,
    data.email,
    data.phone,
    data.address,
    data.lead_time_days,
    id,
    shopId,
  ]);

  const r = result.rows[0];
  return {
    id: r.id,
    shop_id: r.shop_id,
    name: r.name,
    contact_name: r.contact_name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    lead_time_days: Number(r.lead_time_days),
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString(),
  };
}

export async function deleteSupplier(shopId: number, id: number): Promise<{ success: boolean; message?: string }> {
  const existing = await getSupplierById(shopId, id);
  if (!existing) {
    return { success: false, message: 'Supplier not found.' };
  }

  // Soft protection check in this shop
  const prodCheck = await query('SELECT COUNT(*) as count FROM products WHERE supplier_id = $1 AND shop_id = $2', [id, shopId]);
  const prodCount = parseInt(prodCheck.rows[0]?.count || '0', 10);
  if (prodCount > 0) {
    return {
      success: false,
      message: `Cannot delete supplier. ${prodCount} products are linked to this supplier.`,
    };
  }

  const poCheck = await query('SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = $1 AND shop_id = $2', [id, shopId]);
  const poCount = parseInt(poCheck.rows[0]?.count || '0', 10);
  if (poCount > 0) {
    return {
      success: false,
      message: `Cannot delete supplier with ${poCount} associated purchase orders.`,
    };
  }

  await query('DELETE FROM suppliers WHERE id = $1 AND shop_id = $2', [id, shopId]);
  return { success: true };
}
