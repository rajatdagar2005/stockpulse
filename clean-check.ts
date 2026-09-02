import { query } from './src/server/db/index';

async function listShops() {
  const res = await query(`SELECT id, name, location, staff_join_code, created_at FROM shops ORDER BY id ASC`);
  console.log('Current Shops in Database:');
  console.log(JSON.stringify(res.rows, null, 2));

  const usersRes = await query(`SELECT id, shop_id, name, email, role FROM users ORDER BY id ASC`);
  console.log('Current Users in Database:');
  console.log(JSON.stringify(usersRes.rows, null, 2));
}

listShops().catch(console.error);
