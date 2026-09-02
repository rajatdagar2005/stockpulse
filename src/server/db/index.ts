import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
  release: () => void | Promise<void>;
}

let pool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let isInitialized = false;

export async function getDb(): Promise<{
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
  getClient: () => Promise<DbClient>;
}> {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgres://postgres:postgres@localhost:5432/stockpulse') {
    if (!pool) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        connectionTimeoutMillis: 10000,
      });

      pool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client', err);
      });
    }

    return {
      query: async <T = any>(text: string, params?: any[]) => {
        const res = await pool!.query(text, params);
        return {
          rows: res.rows as T[],
          rowCount: res.rowCount ?? 0,
        };
      },
      getClient: async () => {
        const client = await pool!.connect();
        return {
          query: async <T = any>(text: string, params?: any[]) => {
            const res = await client.query(text, params);
            return {
              rows: res.rows as T[],
              rowCount: res.rowCount ?? 0,
            };
          },
          release: () => client.release(),
        };
      },
    };
  }

  // Use embedded PostgreSQL engine (PGlite)
  if (!pgliteInstance) {
    const dataDir = path.join(process.cwd(), '.pgdata');
    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.waitReady;
  }

  return {
    query: async <T = any>(text: string, params?: any[]) => {
      // PGlite query interface
      const res = await pgliteInstance!.query<T>(text, params || []);
      return {
        rows: res.rows,
        rowCount: res.rows ? res.rows.length : 0,
      };
    },
    getClient: async () => {
      // In embedded mode, transactions work directly on the instance with BEGIN/COMMIT/ROLLBACK
      return {
        query: async <T = any>(text: string, params?: any[]) => {
          const res = await pgliteInstance!.query<T>(text, params || []);
          return {
            rows: res.rows,
            rowCount: res.rows ? res.rows.length : 0,
          };
        },
        release: () => {},
      };
    },
  };
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const db = await getDb();
  return db.query<T>(text, params);
}

export async function getClient(): Promise<DbClient> {
  const db = await getDb();
  return db.getClient();
}

export async function initDatabase(): Promise<void> {
  if (isInitialized) return;
  
  try {
    const db = await getDb();

    // 1. Ensure shops table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        staff_join_code VARCHAR(64) UNIQUE,
        join_code_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safely add any new columns to shops table if pre-existing
    try {
      await db.query(`ALTER TABLE shops ADD COLUMN IF NOT EXISTS location VARCHAR(255);`);
      await db.query(`ALTER TABLE shops ADD COLUMN IF NOT EXISTS staff_join_code VARCHAR(64);`);
      await db.query(`ALTER TABLE shops ADD COLUMN IF NOT EXISTS join_code_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
    } catch {}

    // Ensure default demo shop exists with dedicated join code
    await db.query(`
      INSERT INTO shops (id, name, location, staff_join_code)
      VALUES (1, 'StockPulse Demo Retail', 'Main Flagship Store, Mumbai', 'DEMO-JOIN-2026')
      ON CONFLICT (id) DO UPDATE 
      SET staff_join_code = COALESCE(shops.staff_join_code, 'DEMO-JOIN-2026'),
          location = COALESCE(shops.location, 'Main Flagship Store, Mumbai');
    `);

    // Update any shop missing a staff join code
    try {
      const missingCodes = await db.query(`SELECT id FROM shops WHERE staff_join_code IS NULL OR staff_join_code = ''`);
      for (const row of missingCodes.rows) {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = 'SP-';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        code += '-';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        await db.query(`UPDATE shops SET staff_join_code = $1 WHERE id = $2`, [code, row.id]);
      }
    } catch {}

    // Reset sequence if needed
    try {
      await db.query(`SELECT setval('shops_id_seq', (SELECT GREATEST(MAX(id), 1) FROM shops));`);
    } catch {}

    // 2. Safely add shop_id to existing tables before running index queries
    const tables = ['users', 'suppliers', 'products', 'sales', 'purchase_orders'];
    for (const table of tables) {
      try {
        await db.query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE;
        `);
      } catch {}
    }

    // Set default shop_id = 1 for any legacy records
    for (const table of tables) {
      try {
        await db.query(`UPDATE ${table} SET shop_id = 1 WHERE shop_id IS NULL;`);
      } catch {}
    }

    // 3. Run full schema DDL (creates tables, constraints, and indexes)
    const schemaPath = path.join(process.cwd(), 'src', 'server', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await db.query(schemaSql);
    }

    console.log('✅ PostgreSQL Schema initialized successfully');
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing PostgreSQL schema:', error);
    throw error;
  }
}
