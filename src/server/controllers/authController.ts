import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query, getClient } from '../db/index';
import { config } from '../config/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserProfile } from '../types/index';
import { generateStaffJoinCode } from '../utils/codeGenerator';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').transform((v) => v.trim()),
  email: z.string().email('Invalid email address format').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['OWNER', 'STAFF']).optional().default('OWNER'),
  shopName: z.string().optional(),
  shopLocation: z.string().optional(),
  shopId: z.coerce.number().int().positive().optional(),
  staffJoinCode: z.string().optional(),
});

const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').transform((v) => v.trim()),
  email: z.string().email('Invalid email address format').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function searchShops(req: Request, res: Response, next: NextFunction) {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q) {
      // Return top 10 shops for initial suggestion
      const result = await query(
        `SELECT id, name, location FROM shops ORDER BY id ASC LIMIT 10`
      );
      return res.json({
        success: true,
        data: result.rows.map((s) => ({
          id: s.id,
          name: s.name,
          location: s.location || null,
        })),
      });
    }

    const result = await query(
      `SELECT id, name, location 
       FROM shops 
       WHERE LOWER(name) LIKE LOWER($1) 
       ORDER BY name ASC 
       LIMIT 10`,
      [`%${q}%`]
    );

    return res.json({
      success: true,
      data: result.rows.map((s) => ({
        id: s.id,
        name: s.name,
        location: s.location || null,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const userRes = await query(
      `SELECT u.*, s.name as shop_name 
       FROM users u 
       LEFT JOIN shops s ON u.shop_id = s.id 
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    // Ensure user has a valid shop_id
    let shopId = user.shop_id;
    let shopName = user.shop_name;
    if (!shopId) {
      const code = generateStaffJoinCode();
      const defaultShop = await query(
        `INSERT INTO shops (name, staff_join_code) VALUES ($1, $2) RETURNING id, name`,
        [`${user.name}'s Shop`, code]
      );
      shopId = defaultShop.rows[0].id;
      shopName = defaultShop.rows[0].name;
      await query(`UPDATE users SET shop_id = $1 WHERE id = $2`, [shopId, user.id]);
    }

    const profile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      shop_id: shopId,
      shop_name: shopName || 'My Shop',
      created_at: new Date(user.created_at).toISOString(),
    };

    const token = jwt.sign(profile, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: profile,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  const client = await getClient();
  try {
    const { name, email, password, role, shopName, shopLocation, shopId, staffJoinCode } =
      registerSchema.parse(req.body);

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    await client.query('BEGIN');

    let userShopId: number;
    let finalShopName: string;

    if (role === 'OWNER') {
      // Create new isolated shop for this new OWNER
      finalShopName = (shopName || `${name}'s Store`).trim();
      const initialJoinCode = generateStaffJoinCode();
      const shopRes = await client.query(
        `INSERT INTO shops (name, location, staff_join_code, join_code_updated_at) 
         VALUES ($1, $2, $3, NOW()) 
         RETURNING id, name`,
        [finalShopName, shopLocation ? shopLocation.trim() : null, initialJoinCode]
      );
      userShopId = shopRes.rows[0].id;
      finalShopName = shopRes.rows[0].name;
    } else {
      // STAFF registration MUST join an existing business with a valid join code
      let targetShop: any = null;

      if (shopId) {
        const shopRes = await client.query(
          `SELECT id, name, staff_join_code FROM shops WHERE id = $1`,
          [shopId]
        );
        if (shopRes.rows.length > 0) {
          targetShop = shopRes.rows[0];
        }
      }

      if (!targetShop && shopName) {
        const shopRes = await client.query(
          `SELECT id, name, staff_join_code FROM shops WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [shopName.trim()]
        );
        if (shopRes.rows.length > 0) {
          targetShop = shopRes.rows[0];
        }
      }

      if (!targetShop) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'The selected business could not be found. Please search and select an existing business.',
        });
      }

      // Verify Staff Join Code
      if (!staffJoinCode || !staffJoinCode.trim()) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Staff Join Code is required to join this business.',
        });
      }

      const expectedCode = (targetShop.staff_join_code || '').trim().toUpperCase();
      const providedCode = staffJoinCode.trim().toUpperCase();

      if (!expectedCode || expectedCode !== providedCode) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Invalid Staff Join Code for this business. Please check with the business owner.',
        });
      }

      userShopId = targetShop.id;
      finalShopName = targetShop.name;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role, shop_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, shop_id, created_at`,
      [name, email.toLowerCase().trim(), passwordHash, role, userShopId]
    );

    await client.query('COMMIT');

    const newUser = result.rows[0];
    const profile: UserProfile = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      shop_id: newUser.shop_id,
      shop_name: finalShopName,
      created_at: new Date(newUser.created_at).toISOString(),
    };

    const token = jwt.sign(profile, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: profile,
      },
      message:
        role === 'OWNER'
          ? `Business "${finalShopName}" workspace created successfully.`
          : `Joined "${finalShopName}" workspace successfully.`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function getShopDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const shopRes = await query(
      `SELECT id, name, location, staff_join_code, join_code_updated_at, created_at 
       FROM shops 
       WHERE id = $1`,
      [req.user.shop_id]
    );

    if (shopRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shop details not found.' });
    }

    const shop = shopRes.rows[0];

    // Only OWNER can see staff_join_code
    if (req.user.role === 'OWNER') {
      let activeJoinCode = shop.staff_join_code;
      if (!activeJoinCode) {
        activeJoinCode = generateStaffJoinCode();
        await query(
          `UPDATE shops SET staff_join_code = $1, join_code_updated_at = NOW() WHERE id = $2`,
          [activeJoinCode, req.user.shop_id]
        );
      }

      return res.json({
        success: true,
        data: {
          id: shop.id,
          name: shop.name,
          location: shop.location,
          staff_join_code: activeJoinCode,
          join_code_updated_at: shop.join_code_updated_at,
          created_at: shop.created_at,
        },
      });
    }

    // STAFF gets safe public shop info
    return res.json({
      success: true,
      data: {
        id: shop.id,
        name: shop.name,
        location: shop.location,
        created_at: shop.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function regenerateJoinCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Only business owners can regenerate the Staff Join Code.',
      });
    }

    const newCode = generateStaffJoinCode();
    await query(
      `UPDATE shops 
       SET staff_join_code = $1, join_code_updated_at = NOW(), updated_at = NOW() 
       WHERE id = $2`,
      [newCode, req.user.shop_id]
    );

    return res.json({
      success: true,
      data: {
        staff_join_code: newCode,
        join_code_updated_at: new Date().toISOString(),
      },
      message: 'New Staff Join Code generated successfully. Previous codes are now expired.',
    });
  } catch (error) {
    next(error);
  }
}

export async function createStaffUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Only shop owners can add staff members.',
      });
    }

    const { name, email, password } = createStaffSchema.parse(req.body);

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, shop_id)
       VALUES ($1, $2, $3, 'STAFF', $4)
       RETURNING id, name, email, role, shop_id, created_at`,
      [name, email.toLowerCase().trim(), passwordHash, req.user.shop_id]
    );

    const created = result.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        shop_id: created.shop_id,
        created_at: new Date(created.created_at).toISOString(),
      },
      message: 'Staff member created successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getStaffUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await query(
      `SELECT id, name, email, role, shop_id, created_at 
       FROM users 
       WHERE shop_id = $1 
       ORDER BY created_at ASC`,
      [req.user.shop_id]
    );

    const members = result.rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      shop_id: u.shop_id,
      created_at: new Date(u.created_at).toISOString(),
    }));

    return res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteStaffUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'Only owners can remove staff members.' });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid staff user ID.' });
    }

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Owner cannot remove their own account.' });
    }

    const result = await query(
      `DELETE FROM users WHERE id = $1 AND shop_id = $2 AND role = 'STAFF' RETURNING id`,
      [id, req.user.shop_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found in your shop.' });
    }

    return res.json({
      success: true,
      message: 'Staff member removed successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.role, u.shop_id, u.created_at, s.name as shop_name 
       FROM users u 
       LEFT JOIN shops s ON u.shop_id = s.id 
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const user = userRes.rows[0];
    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          shop_id: user.shop_id,
          shop_name: user.shop_name || 'My Shop',
          created_at: new Date(user.created_at).toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

