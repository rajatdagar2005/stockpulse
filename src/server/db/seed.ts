import bcrypt from 'bcryptjs';
import { query, getClient } from './index';

export async function seedDatabase(force = false): Promise<void> {
  // Check if database is already seeded
  const userCheck = await query('SELECT COUNT(*) as count FROM users');
  const count = parseInt(userCheck.rows[0]?.count || '0', 10);
  
  if (count > 0 && !force) {
    console.log('🌱 Database already populated. Skipping seed.');
    return;
  }

  console.log('🌱 Seeding PostgreSQL database with realistic retail inventory data...');

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Clear existing data if force
    if (force) {
      // Find demo shop if exists
      const demoShopFind = await client.query("SELECT id FROM shops WHERE name = 'PulseMart Retail Superstore' LIMIT 1");
      if (demoShopFind.rows.length > 0) {
        const dId = demoShopFind.rows[0].id;
        await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE shop_id = $1)', [dId]);
        await client.query('DELETE FROM purchase_orders WHERE shop_id = $1', [dId]);
        await client.query('DELETE FROM sales WHERE shop_id = $1', [dId]);
        await client.query('DELETE FROM products WHERE shop_id = $1', [dId]);
        await client.query('DELETE FROM suppliers WHERE shop_id = $1', [dId]);
        await client.query('DELETE FROM users WHERE shop_id = $1', [dId]);
        await client.query('DELETE FROM shops WHERE id = $1', [dId]);
      }
    }

    // 1. Seed Demo Shop
    const shopRes = await client.query(
      `INSERT INTO shops (name)
       VALUES ($1)
       RETURNING id, name`,
      ['PulseMart Retail Superstore']
    );
    const demoShopId = shopRes.rows[0].id;

    // 2. Seed Users under Demo Shop
    const ownerPasswordHash = await bcrypt.hash('Demo@12345', 10);
    const staffPasswordHash = await bcrypt.hash('Staff@12345', 10);

    const ownerRes = await client.query(
      `INSERT INTO users (shop_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [demoShopId, 'Rajat Dagar', 'demo@stockpulse.com', ownerPasswordHash, 'OWNER']
    );
    const ownerId = ownerRes.rows[0].id;

    const staffRes = await client.query(
      `INSERT INTO users (shop_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [demoShopId, 'Pooja Sharma', 'staff@stockpulse.com', staffPasswordHash, 'STAFF']
    );
    const staffId = staffRes.rows[0].id;

    // 3. Seed Suppliers under Demo Shop
    const suppliersData = [
      {
        name: 'Amul Dairy & Fresh Foods',
        contact_name: 'Vipin Patel',
        email: 'orders@amuldairy-dist.in',
        phone: '+91 98234 56781',
        address: 'Sector 18, Udyog Vihar, Gurugram, Haryana',
        lead_time_days: 2,
      },
      {
        name: 'ITC Consumer Goods Hub',
        contact_name: 'Ananya Roy',
        email: 'supply@itc-distributors.com',
        phone: '+91 98112 34567',
        address: 'Plot 42, Okhla Phase III, New Delhi',
        lead_time_days: 4,
      },
      {
        name: 'Parle Agro & Beverages',
        contact_name: 'Manish Verma',
        email: 'sales@parle-logistics.in',
        phone: '+91 98450 12349',
        address: 'Industrial Area, Ghaziabad, Uttar Pradesh',
        lead_time_days: 3,
      },
      {
        name: 'Hindustan Unilever Direct',
        contact_name: 'Siddharth Rao',
        email: 'retail@hul-supplynet.com',
        phone: '+91 98765 43210',
        address: 'Logistics Park, Manesar, Haryana',
        lead_time_days: 5,
      },
      {
        name: 'Tata Consumer Staples',
        contact_name: 'Kavita Sundaram',
        email: 'orders@tataconsumer-hub.in',
        phone: '+91 98331 99887',
        address: 'Transport Nagar, Kanpur Road, Lucknow, UP',
        lead_time_days: 3,
      },
      {
        name: 'Reliance Wholesale Supplies',
        contact_name: 'Gaurav Singhal',
        email: 'support@reliance-wholesale-b2b.com',
        phone: '+91 98990 88776',
        address: 'Warehouse Hub 9, Sonipat, Haryana',
        lead_time_days: 6,
      },
    ];

    const supplierIds: number[] = [];
    for (const sup of suppliersData) {
      const res = await client.query(
        `INSERT INTO suppliers (shop_id, name, contact_name, email, phone, address, lead_time_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [demoShopId, sup.name, sup.contact_name, sup.email, sup.phone, sup.address, sup.lead_time_days]
      );
      supplierIds.push(res.rows[0].id);
    }

    // 3. Seed Products
    // Deliberate stock profiles:
    // Supplier index mapping:
    // 0: Amul (lead 2)
    // 1: ITC (lead 4)
    // 2: Parle (lead 3)
    // 3: HUL (lead 5)
    // 4: Tata (lead 3)
    // 5: Reliance Wholesale (lead 6)

    const rawProducts = [
      // --- CRITICAL STOCK PRODUCTS ---
      {
        name: 'Amul Taaza Toned Milk (1 Litre)',
        sku: 'DAIRY-AML-001',
        category: 'Dairy',
        description: 'Fresh homogenized toned milk pouch with 3.0% fat and 8.5% SNF.',
        current_stock: 14,
        minimum_stock: 30,
        unit_price: 54.0,
        cost_price: 48.0,
        supplier_id: supplierIds[0],
        safety_stock: 20,
        target_daily_sales: 32, // expected ~32 sales/day
      },
      {
        name: 'Britannia 100% Whole Wheat Bread (400g)',
        sku: 'BAK-BRT-001',
        category: 'Bakery',
        description: 'Soft and healthy whole wheat sliced sandwich bread.',
        current_stock: 6,
        minimum_stock: 25,
        unit_price: 50.0,
        cost_price: 40.0,
        supplier_id: supplierIds[1],
        safety_stock: 15,
        target_daily_sales: 18,
      },
      {
        name: 'Tata Tea Gold (500g)',
        sku: 'BEV-TAT-001',
        category: 'Beverages',
        description: 'Rich blend of Assam CTC teas with gently rolled aromatic long leaves.',
        current_stock: 8,
        minimum_stock: 20,
        unit_price: 320.0,
        cost_price: 275.0,
        supplier_id: supplierIds[4],
        safety_stock: 12,
        target_daily_sales: 9,
      },

      // --- LOW STOCK PRODUCTS ---
      {
        name: 'Tata Iodized Salt (1kg Pouch)',
        sku: 'STP-TAT-002',
        category: 'Household',
        description: 'Vacuum evaporated iodized crystal salt for daily cooking.',
        current_stock: 35,
        minimum_stock: 50,
        unit_price: 28.0,
        cost_price: 22.0,
        supplier_id: supplierIds[4],
        safety_stock: 25,
        target_daily_sales: 14, // reorder point: (14 * 3) + 25 = 67 -> stock 35 <= 67 (LOW)
      },
      {
        name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre)',
        sku: 'OIL-FOR-001',
        category: 'Household',
        description: 'Light and healthy refined sunflower oil enriched with vitamins A & D.',
        current_stock: 22,
        minimum_stock: 40,
        unit_price: 145.0,
        cost_price: 122.0,
        supplier_id: supplierIds[5],
        safety_stock: 20,
        target_daily_sales: 8, // reorder point: (8 * 6) + 20 = 68 -> stock 22 <= 68 (LOW)
      },
      {
        name: 'Maggi 2-Minute Masala Noodles (Pack of 12)',
        sku: 'SNK-NES-001',
        category: 'Snacks',
        description: 'Instant noodles with signature spices and authentic taste.',
        current_stock: 18,
        minimum_stock: 35,
        unit_price: 168.0,
        cost_price: 140.0,
        supplier_id: supplierIds[1],
        safety_stock: 15,
        target_daily_sales: 7, // reorder point: (7 * 4) + 15 = 43 -> stock 18 <= 43 (LOW)
      },
      {
        name: 'Frooti Mango Drink Pet Bottle (1.2L)',
        sku: 'BEV-PAR-002',
        category: 'Beverages',
        description: 'Real mango juice beverage with classic sweet flavor.',
        current_stock: 19,
        minimum_stock: 30,
        unit_price: 75.0,
        cost_price: 60.0,
        supplier_id: supplierIds[2],
        safety_stock: 15,
        target_daily_sales: 9, // reorder point: (9 * 3) + 15 = 42 -> stock 19 <= 42 (LOW)
      },

      // --- DEAD STOCK PRODUCTS (current stock > 0, 30-day sales <= 5) ---
      {
        name: 'Royal Heritage Antique Brass Pen Stand',
        sku: 'STA-ANT-001',
        category: 'Stationery',
        description: 'Handcrafted ornate brass desk organizer with velvet base.',
        current_stock: 42,
        minimum_stock: 5,
        unit_price: 899.0,
        cost_price: 620.0,
        supplier_id: supplierIds[5],
        safety_stock: 5,
        target_daily_sales: 0.05, // Almost 0 sales
      },
      {
        name: 'Ceramic Handpainted Tea Mug Set of 4',
        sku: 'HOU-CRM-001',
        category: 'Household',
        description: 'Studio pottery handmade ceramic tea cups in cobalt blue.',
        current_stock: 38,
        minimum_stock: 5,
        unit_price: 650.0,
        cost_price: 420.0,
        supplier_id: supplierIds[5],
        safety_stock: 5,
        target_daily_sales: 0.08,
      },
      {
        name: 'Mini Bluetooth Pocket Speaker (Grey)',
        sku: 'ELE-SPK-001',
        category: 'Electronics Accessories',
        description: '3W compact portable wireless speaker with auxiliary input.',
        current_stock: 30,
        minimum_stock: 8,
        unit_price: 799.0,
        cost_price: 520.0,
        supplier_id: supplierIds[5],
        safety_stock: 5,
        target_daily_sales: 0.06,
      },
      {
        name: 'Vintage Boar Bristle Shaving Brush',
        sku: 'PER-BRS-001',
        category: 'Personal Care',
        description: 'Traditional wooden handle wet shaving brush.',
        current_stock: 45,
        minimum_stock: 5,
        unit_price: 349.0,
        cost_price: 210.0,
        supplier_id: supplierIds[3],
        safety_stock: 5,
        target_daily_sales: 0.03,
      },

      // --- OVERSTOCK PRODUCTS (current_stock > daily_sales * 60) ---
      {
        name: 'Disposable Eco Paper Party Cups (Pack of 100)',
        sku: 'HOU-CUP-001',
        category: 'Household',
        description: 'Biodegradable ripple paper cups for hot and cold beverages.',
        current_stock: 320,
        minimum_stock: 20,
        unit_price: 180.0,
        cost_price: 120.0,
        supplier_id: supplierIds[5],
        safety_stock: 10,
        target_daily_sales: 1.2, // current 320 > 1.2 * 60 (72) -> OVERSTOCK
      },
      {
        name: 'Festive Floating Diya Wax Pack of 50',
        sku: 'HOU-DIY-001',
        category: 'Household',
        description: 'Smokeless scented floating wax candles for festive decoration.',
        current_stock: 280,
        minimum_stock: 15,
        unit_price: 240.0,
        cost_price: 150.0,
        supplier_id: supplierIds[5],
        safety_stock: 10,
        target_daily_sales: 1.5,
      },

      // --- HEALTHY INVENTORY PRODUCTS ---
      {
        name: 'Amul Butter Salted (500g)',
        sku: 'DAIRY-AML-002',
        category: 'Dairy',
        description: 'Pure dairy butter made from fresh cream, salted and pasteurized.',
        current_stock: 95,
        minimum_stock: 30,
        unit_price: 275.0,
        cost_price: 240.0,
        supplier_id: supplierIds[0],
        safety_stock: 25,
        target_daily_sales: 12,
      },
      {
        name: 'Amul Processed Cheese Slices (200g - 10 Slices)',
        sku: 'DAIRY-AML-003',
        category: 'Dairy',
        description: 'Individually wrapped creamy processed cheddar cheese slices.',
        current_stock: 65,
        minimum_stock: 20,
        unit_price: 145.0,
        cost_price: 125.0,
        supplier_id: supplierIds[0],
        safety_stock: 15,
        target_daily_sales: 7,
      },
      {
        name: 'Amul Masti Dahi Tub (400g)',
        sku: 'DAIRY-AML-004',
        category: 'Dairy',
        description: 'Thick pasteurized curd prepared from fresh toned milk.',
        current_stock: 80,
        minimum_stock: 25,
        unit_price: 42.0,
        cost_price: 35.0,
        supplier_id: supplierIds[0],
        safety_stock: 20,
        target_daily_sales: 15,
      },
      {
        name: 'Aashirvaad Superior MP Sharbati Atta (5kg)',
        sku: 'STP-ITC-001',
        category: 'Household',
        description: '100% pure whole wheat flour processed with traditional chakki grind.',
        current_stock: 75,
        minimum_stock: 25,
        unit_price: 285.0,
        cost_price: 245.0,
        supplier_id: supplierIds[1],
        safety_stock: 20,
        target_daily_sales: 8,
      },
      {
        name: 'Sunfeast Dark Fantasy Choco Fills (300g)',
        sku: 'SNK-ITC-002',
        category: 'Snacks',
        description: 'Crispy chocolate cookies filled with molten chocolate creme.',
        current_stock: 110,
        minimum_stock: 30,
        unit_price: 140.0,
        cost_price: 115.0,
        supplier_id: supplierIds[1],
        safety_stock: 20,
        target_daily_sales: 10,
      },
      {
        name: 'Bingo Mad Angles Achaari Masti (66g)',
        sku: 'SNK-ITC-003',
        category: 'Snacks',
        description: 'Crunchy triangle corn chips seasoned with authentic Indian pickle spices.',
        current_stock: 90,
        minimum_stock: 25,
        unit_price: 20.0,
        cost_price: 16.0,
        supplier_id: supplierIds[1],
        safety_stock: 15,
        target_daily_sales: 11,
      },
      {
        name: 'Parle-G Original Glucose Biscuits (800g Family Pack)',
        sku: 'SNK-PAR-001',
        category: 'Snacks',
        description: 'Classic crunchy glucose biscuit loaded with wheat and milk nutrition.',
        current_stock: 140,
        minimum_stock: 40,
        unit_price: 90.0,
        cost_price: 75.0,
        supplier_id: supplierIds[2],
        safety_stock: 30,
        target_daily_sales: 16,
      },
      {
        name: 'Parle Monaco Salted Crackers (200g)',
        sku: 'SNK-PAR-003',
        category: 'Snacks',
        description: 'Light and crispy salted snack crackers.',
        current_stock: 85,
        minimum_stock: 25,
        unit_price: 35.0,
        cost_price: 28.0,
        supplier_id: supplierIds[2],
        safety_stock: 20,
        target_daily_sales: 9,
      },
      {
        name: 'Parle Hide & Seek Chocolate Chip Biscuits (120g)',
        sku: 'SNK-PAR-004',
        category: 'Snacks',
        description: 'Mouthwatering cookies embedded with rich dark chocolate chips.',
        current_stock: 95,
        minimum_stock: 30,
        unit_price: 50.0,
        cost_price: 41.0,
        supplier_id: supplierIds[2],
        safety_stock: 20,
        target_daily_sales: 8,
      },
      {
        name: 'Appy Fizz Sparkling Apple Juice (600ml)',
        sku: 'BEV-PAR-005',
        category: 'Beverages',
        description: 'Carbonated apple juice beverage with crisp refreshment.',
        current_stock: 70,
        minimum_stock: 25,
        unit_price: 40.0,
        cost_price: 32.0,
        supplier_id: supplierIds[2],
        safety_stock: 15,
        target_daily_sales: 7,
      },
      {
        name: 'Surf Excel Quick Wash Detergent Powder (1kg)',
        sku: 'HOU-HUL-001',
        category: 'Household',
        description: 'Advanced stain removal laundry detergent with built-in power of bar.',
        current_stock: 80,
        minimum_stock: 25,
        unit_price: 220.0,
        cost_price: 185.0,
        supplier_id: supplierIds[3],
        safety_stock: 20,
        target_daily_sales: 6,
      },
      {
        name: 'Dove Deeply Nourishing Body Wash (250ml)',
        sku: 'PER-HUL-002',
        category: 'Personal Care',
        description: 'Gentle microbiome-safe moisturizing shower gel with NutriumMoisture.',
        current_stock: 60,
        minimum_stock: 15,
        unit_price: 199.0,
        cost_price: 155.0,
        supplier_id: supplierIds[3],
        safety_stock: 15,
        target_daily_sales: 4,
      },
      {
        name: 'Lifebuoy Total Anti-bacterial Soap (Pack of 4x125g)',
        sku: 'PER-HUL-003',
        category: 'Personal Care',
        description: 'Germ protection bathing soap bar with active silver formula.',
        current_stock: 90,
        minimum_stock: 30,
        unit_price: 140.0,
        cost_price: 115.0,
        supplier_id: supplierIds[3],
        safety_stock: 20,
        target_daily_sales: 8,
      },
      {
        name: 'Clinic Plus Strong & Long Shampoo (340ml)',
        sku: 'PER-HUL-004',
        category: 'Personal Care',
        description: 'Milk protein enriched nourishing daily hair shampoo.',
        current_stock: 70,
        minimum_stock: 20,
        unit_price: 215.0,
        cost_price: 175.0,
        supplier_id: supplierIds[3],
        safety_stock: 15,
        target_daily_sales: 5,
      },
      {
        name: 'Vim Dishwash Gel Lemon (500ml Bottle)',
        sku: 'HOU-HUL-005',
        category: 'Household',
        description: 'Tough grease remover liquid dishwash with fresh lemon aroma.',
        current_stock: 85,
        minimum_stock: 25,
        unit_price: 120.0,
        cost_price: 98.0,
        supplier_id: supplierIds[3],
        safety_stock: 20,
        target_daily_sales: 7,
      },
      {
        name: 'Tata Sampann Unpolished Toor Dal (1kg)',
        sku: 'STP-TAT-003',
        category: 'Household',
        description: 'Natural protein rich unpolished pigeon pea pulses.',
        current_stock: 65,
        minimum_stock: 20,
        unit_price: 175.0,
        cost_price: 148.0,
        supplier_id: supplierIds[4],
        safety_stock: 15,
        target_daily_sales: 6,
      },
      {
        name: 'Tata Sampann Turmeric Powder (200g)',
        sku: 'STP-TAT-004',
        category: 'Household',
        description: 'Pure ground haldi spice powder with guaranteed 3% natural curcumin.',
        current_stock: 90,
        minimum_stock: 25,
        unit_price: 65.0,
        cost_price: 52.0,
        supplier_id: supplierIds[4],
        safety_stock: 20,
        target_daily_sales: 8,
      },
      {
        name: 'Tata Coffee Grand Classic (100g Jar)',
        sku: 'BEV-TAT-005',
        category: 'Beverages',
        description: 'Agglomerated instant coffee granules with roasted chicory blend.',
        current_stock: 55,
        minimum_stock: 15,
        unit_price: 190.0,
        cost_price: 155.0,
        supplier_id: supplierIds[4],
        safety_stock: 12,
        target_daily_sales: 5,
      },
      {
        name: 'Classmate Pulse Spiral Notebook Single Line (300 Pgs)',
        sku: 'STA-ITC-001',
        category: 'Stationery',
        description: 'Polypropylene cover spiral notebook with ozone-treated bright paper.',
        current_stock: 80,
        minimum_stock: 25,
        unit_price: 125.0,
        cost_price: 95.0,
        supplier_id: supplierIds[1],
        safety_stock: 20,
        target_daily_sales: 7,
      },
      {
        name: 'Cello Butterflow Blue Ballpoint Pens (Pack of 10)',
        sku: 'STA-CEL-001',
        category: 'Stationery',
        description: 'Ultra smooth writing lubricated ball pens with rubber grip.',
        current_stock: 120,
        minimum_stock: 35,
        unit_price: 100.0,
        cost_price: 75.0,
        supplier_id: supplierIds[5],
        safety_stock: 30,
        target_daily_sales: 10,
      },
      {
        name: 'Fevicol MR Squeezy Craft Glue (100g)',
        sku: 'STA-PID-001',
        category: 'Stationery',
        description: 'Synthetic non-staining adhesive for paper, cardboard, and fabric crafts.',
        current_stock: 75,
        minimum_stock: 20,
        unit_price: 45.0,
        cost_price: 34.0,
        supplier_id: supplierIds[5],
        safety_stock: 15,
        target_daily_sales: 6,
      },
      {
        name: 'Portronics Fast USB-C Braided Cable (1.2m)',
        sku: 'ELE-POR-001',
        category: 'Electronics Accessories',
        description: '65W Power Delivery braided durable fast charging cable.',
        current_stock: 50,
        minimum_stock: 15,
        unit_price: 299.0,
        cost_price: 180.0,
        supplier_id: supplierIds[5],
        safety_stock: 12,
        target_daily_sales: 4,
      },
      {
        name: 'boAt Dual Port 20W Fast Wall Adapter',
        sku: 'ELE-BOT-001',
        category: 'Electronics Accessories',
        description: 'Dual USB-A and Type-C compact wall charger with multi-layer surge safety.',
        current_stock: 45,
        minimum_stock: 12,
        unit_price: 499.0,
        cost_price: 320.0,
        supplier_id: supplierIds[5],
        safety_stock: 10,
        target_daily_sales: 3,
      },
      {
        name: 'Duracell Ultra AA Alkaline Batteries (Pack of 4)',
        sku: 'ELE-DUR-001',
        category: 'Electronics Accessories',
        description: 'Long lasting 1.5V alkaline cell batteries with PowerCheck gauge.',
        current_stock: 85,
        minimum_stock: 20,
        unit_price: 180.0,
        cost_price: 135.0,
        supplier_id: supplierIds[5],
        safety_stock: 15,
        target_daily_sales: 7,
      },
      {
        name: 'Cadbury Dairy Milk Silk Chocolate (150g)',
        sku: 'SNK-CAD-001',
        category: 'Snacks',
        description: 'Irresistibly smooth and creamy melt-in-mouth milk chocolate bar.',
        current_stock: 90,
        minimum_stock: 25,
        unit_price: 175.0,
        cost_price: 145.0,
        supplier_id: supplierIds[1],
        safety_stock: 20,
        target_daily_sales: 8,
      },
      {
        name: 'Colgate Strong Teeth Toothpaste (500g Saver Pack)',
        sku: 'PER-COL-001',
        category: 'Personal Care',
        description: 'Calcium boost formula for all-round cavity protection and fresh breath.',
        current_stock: 105,
        minimum_stock: 30,
        unit_price: 245.0,
        cost_price: 195.0,
        supplier_id: supplierIds[3],
        safety_stock: 25,
        target_daily_sales: 9,
      },
      {
        name: 'Dettol Antiseptic Liquid (550ml)',
        sku: 'PER-DET-001',
        category: 'Personal Care',
        description: 'First aid antiseptic disinfection solution for personal hygiene.',
        current_stock: 65,
        minimum_stock: 18,
        unit_price: 195.0,
        cost_price: 160.0,
        supplier_id: supplierIds[3],
        safety_stock: 15,
        target_daily_sales: 5,
      },
      {
        name: 'Harpic Power Plus Disinfectant Toilet Cleaner (1 Litre)',
        sku: 'HOU-HAR-001',
        category: 'Household',
        description: '10x stain removal toilet liquid disinfectant with active blue action.',
        current_stock: 80,
        minimum_stock: 20,
        unit_price: 215.0,
        cost_price: 175.0,
        supplier_id: supplierIds[3],
        safety_stock: 15,
        target_daily_sales: 7,
      },
      {
        name: 'Lay’s India’s Magic Masala Potato Chips (50g)',
        sku: 'SNK-LAY-001',
        category: 'Snacks',
        description: 'Crispy sliced ridge-cut potato chips coated in hot tangy Indian spices.',
        current_stock: 130,
        minimum_stock: 40,
        unit_price: 20.0,
        cost_price: 16.0,
        supplier_id: supplierIds[1],
        safety_stock: 30,
        target_daily_sales: 14,
      },
      {
        name: 'GoodKnight Gold Flash Liquid Mosquito Vaporizer Refill (45ml)',
        sku: 'HOU-GKN-001',
        category: 'Household',
        description: 'Smart chip release mosquito protection repellent cartridge.',
        current_stock: 75,
        minimum_stock: 20,
        unit_price: 85.0,
        cost_price: 68.0,
        supplier_id: supplierIds[3],
        safety_stock: 15,
        target_daily_sales: 6,
      },
    ];

    const insertedProducts: Array<{ id: number; price: number; target_daily_sales: number }> = [];

    for (const p of rawProducts) {
      const res = await client.query(
        `INSERT INTO products (shop_id, name, sku, category, description, current_stock, minimum_stock, unit_price, cost_price, supplier_id, safety_stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, unit_price`,
        [
          demoShopId,
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
        ]
      );
      insertedProducts.push({
        id: res.rows[0].id,
        price: Number(res.rows[0].unit_price),
        target_daily_sales: p.target_daily_sales,
      });
    }

    // 4. Seed Historical Sales (300+ sales over the past 90 days)
    console.log('Generating realistic 90-day sales history...');
    const now = new Date();

    for (const prod of insertedProducts) {
      const targetRate = prod.target_daily_sales;
      if (targetRate <= 0.1) {
        // Dead stock: Generate only 1 or 2 small sales in last 90 days, 0 or 1 in last 30 days
        const pastDays = Math.floor(Math.random() * 20) + 35; // 35-55 days ago
        const saleDate = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
        const qty = 1;
        const total = qty * prod.price;
        await client.query(
          `INSERT INTO sales (shop_id, product_id, quantity, unit_price, total_amount, sold_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [demoShopId, prod.id, qty, prod.price, total, saleDate.toISOString(), staffId]
        );
        continue;
      }

      // Generate regular sales for each day across the past 30 days (and some across 90 days)
      // Past 30 days daily sales:
      for (let day = 0; day < 30; day++) {
        // Vary daily rate realistically
        const dayFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
        const dailyQty = Math.round(targetRate * dayFactor);
        
        if (dailyQty <= 0) continue;

        // Split into 1 to 3 customer transactions across that day
        const numTransactions = Math.min(3, Math.max(1, Math.ceil(dailyQty / 4)));
        let remainingQty = dailyQty;

        for (let t = 0; t < numTransactions; t++) {
          const isLast = t === numTransactions - 1;
          const qty = isLast ? remainingQty : Math.max(1, Math.floor(remainingQty / (numTransactions - t)));
          remainingQty -= qty;

          if (qty <= 0) continue;

          const hourOffset = 9 + Math.floor(Math.random() * 11); // between 9 AM and 8 PM
          const minuteOffset = Math.floor(Math.random() * 60);
          const saleTime = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
          saleTime.setHours(hourOffset, minuteOffset, 0, 0);

          const total = qty * prod.price;
          const user = Math.random() > 0.4 ? staffId : ownerId;

          await client.query(
            `INSERT INTO sales (shop_id, product_id, quantity, unit_price, total_amount, sold_at, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [demoShopId, prod.id, qty, prod.price, total, saleTime.toISOString(), user]
          );
        }
      }

      // Past 31-90 days: sample a few days for historical charts
      for (let day = 31; day <= 90; day += 3) {
        const dailyQty = Math.round(targetRate * (0.6 + Math.random() * 0.8));
        if (dailyQty <= 0) continue;

        const saleTime = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
        saleTime.setHours(14, 30, 0, 0);
        const total = dailyQty * prod.price;

        await client.query(
          `INSERT INTO sales (shop_id, product_id, quantity, unit_price, total_amount, sold_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [demoShopId, prod.id, dailyQty, prod.price, total, saleTime.toISOString(), staffId]
        );
      }
    }

    // 5. Seed Purchase Orders
    console.log('Generating realistic purchase orders...');
    const poSamples = [
      {
        order_number: 'PO-1001',
        supplier_id: supplierIds[0], // Amul
        status: 'RECEIVED',
        days_ago: 14,
        delivery_days: 2,
        items: [
          { product_id: insertedProducts[0].id, quantity: 120, unit_cost: 48.0 },
          { product_id: insertedProducts[13].id, quantity: 50, unit_cost: 240.0 },
        ],
      },
      {
        order_number: 'PO-1002',
        supplier_id: supplierIds[1], // ITC
        status: 'RECEIVED',
        days_ago: 8,
        delivery_days: 4,
        items: [
          { product_id: insertedProducts[1].id, quantity: 80, unit_cost: 40.0 },
          { product_id: insertedProducts[5].id, quantity: 40, unit_cost: 140.0 },
          { product_id: insertedProducts[16].id, quantity: 30, unit_cost: 245.0 },
        ],
      },
      {
        order_number: 'PO-1003',
        supplier_id: supplierIds[4], // Tata
        status: 'ORDERED',
        days_ago: 1,
        delivery_days: 3,
        items: [
          { product_id: insertedProducts[2].id, quantity: 60, unit_cost: 275.0 },
          { product_id: insertedProducts[3].id, quantity: 100, unit_cost: 22.0 },
        ],
      },
      {
        order_number: 'PO-1004',
        supplier_id: supplierIds[0], // Amul
        status: 'PENDING',
        days_ago: 0,
        delivery_days: 2,
        items: [
          { product_id: insertedProducts[0].id, quantity: 150, unit_cost: 48.0 },
          { product_id: insertedProducts[14].id, quantity: 40, unit_cost: 125.0 },
        ],
      },
      {
        order_number: 'PO-1005',
        supplier_id: supplierIds[2], // Parle
        status: 'PENDING',
        days_ago: 0,
        delivery_days: 3,
        items: [
          { product_id: insertedProducts[6].id, quantity: 60, unit_cost: 60.0 },
          { product_id: insertedProducts[19].id, quantity: 100, unit_cost: 75.0 },
        ],
      },
      {
        order_number: 'PO-1006',
        supplier_id: supplierIds[5], // Reliance
        status: 'CANCELLED',
        days_ago: 20,
        delivery_days: 6,
        items: [
          { product_id: insertedProducts[7].id, quantity: 20, unit_cost: 620.0 },
        ],
      },
    ];

    for (const po of poSamples) {
      const orderDate = new Date(now.getTime() - po.days_ago * 24 * 60 * 60 * 1000);
      const expectedDate = new Date(orderDate.getTime() + po.delivery_days * 24 * 60 * 60 * 1000);
      
      const totalAmount = po.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

      const poRes = await client.query(
        `INSERT INTO purchase_orders (shop_id, supplier_id, order_number, status, total_amount, ordered_at, expected_delivery_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          demoShopId,
          po.supplier_id,
          po.order_number,
          po.status,
          totalAmount,
          orderDate.toISOString(),
          expectedDate.toISOString(),
          ownerId,
        ]
      );
      const poId = poRes.rows[0].id;

      for (const item of po.items) {
        const itemTotal = item.quantity * item.unit_cost;
        await client.query(
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, total_amount)
           VALUES ($1, $2, $3, $4, $5)`,
          [poId, item.product_id, item.quantity, item.unit_cost, itemTotal]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with comprehensive retail inventory data!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
}
