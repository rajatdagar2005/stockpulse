import { query } from './src/server/db/index';

async function removeExtraShops() {
  const targetShopIds = [3, 4];
  console.log(`Deleting extra test shops: ${targetShopIds.join(', ')}...`);

  await query(`DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE shop_id = ANY($1))`, [targetShopIds]);
  await query(`DELETE FROM purchase_orders WHERE shop_id = ANY($1)`, [targetShopIds]);
  await query(`DELETE FROM sales WHERE shop_id = ANY($1)`, [targetShopIds]);
  await query(`DELETE FROM products WHERE shop_id = ANY($1)`, [targetShopIds]);
  await query(`DELETE FROM suppliers WHERE shop_id = ANY($1)`, [targetShopIds]);
  await query(`DELETE FROM users WHERE shop_id = ANY($1)`, [targetShopIds]);
  await query(`DELETE FROM shops WHERE id = ANY($1)`, [targetShopIds]);

  console.log('Deletion completed.');

  const res = await query(`SELECT id, name, location, staff_join_code FROM shops ORDER BY id ASC`);
  console.log('Remaining Shops in Database:');
  console.log(JSON.stringify(res.rows, null, 2));

  const usersRes = await query(`SELECT id, shop_id, name, email, role FROM users ORDER BY id ASC`);
  console.log('Remaining Users in Database:');
  console.log(JSON.stringify(usersRes.rows, null, 2));

  process.exit(0);
}

removeExtraShops().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
