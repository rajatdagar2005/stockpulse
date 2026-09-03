# StockPulse

**Smart Inventory & Reordering Platform**

live demo - https://stockpulse-2z1p.onrender.com/login

## Overview

StockPulse is a modern, multi-tenant inventory management system designed to solve the critical business challenges of stockouts and tied-up capital from overstocking. It moves away from manual guesswork by leveraging data-driven logic to maintain optimal inventory levels, streamlining purchase order workflows, and providing real-time, actionable analytics for retail owners.

## Key Features

- **Multi-Tenant Architecture**: Securely isolated workspace per shop with role-based access control (`OWNER` and `STAFF` roles). Shops use unique, rotatable join codes to onboard staff.
- **Smart Reorder Logic**: Automatically calculates data-driven reorder points and recommended order quantities based on 30-day sales velocity and supplier lead times.
- **Inventory Health Classification**: The analytics engine automatically categorizes products into:
  - **Dead Stock**: Tying up capital (positive stock, but $\le$ 5 sales in the last 30 days).
  - **Critical**: High stockout risk (current inventory cannot cover 1 day's average demand).
  - **Low**: Action required (inventory has fallen to or below the calculated reorder point).
  - **Overstock**: Excess capital (stock covers >60 days of projected demand).
  - **Healthy**: Inventory levels are optimal.
- **Purchase Order Workflow**: End-to-end state machine tracking from `PENDING` $\rightarrow$ `ORDERED` $\rightarrow$ `RECEIVED` (or `CANCELLED`).
- **Real-Time Analytics**: Visual dashboard providing metrics on sales velocity, category performance, and total inventory capital valuation.

## Engineering the Reorder Logic

StockPulse implements standard supply chain management formulas dynamically calculated via PostgreSQL aggregations and backend services:

- **Average Daily Sales (ADS)** = `Sales (Last 30 Days) / 30`
- **Reorder Point** = `(ADS * Lead Time in Days) + Safety Stock`
- **Recommended Order Quantity** = `(ADS * (Lead Time + 7 days)) + Safety Stock - Current Stock`

*Business Value*: By factoring in specific supplier lead times and a 7-day restock buffer, the system guarantees businesses only order what they need to bridge the gap without accumulating dead stock.

## Tech Stack

**Frontend**
- **React 19** (Vite)
- **Tailwind CSS v4** (Utility-first styling)
- **Recharts** (Data Visualization)
- **Framer Motion** (Micro-interactions)
- **React Router v7**

**Backend**
- **Node.js & Express**
- **PostgreSQL** (via `pg` driver)
- **Zod** (Request schema validation)
- **JWT** (Stateless authentication) & **bcryptjs**

**Infrastructure**
- **Production**: Render (App Hosting) + Neon (Serverless Postgres)
- **Local Development**: PGlite (Zero-setup embedded PostgreSQL engine)

## Architecture & Database

The application follows a traditional RESTful API architecture. Both the frontend SPA and API are served from a single cohesive Express backend in production.

### Database Schema

| Table | Description |
|---|---|
| `shops` | Multi-tenant root entity. Generates unique staff join codes. |
| `users` | Role-based accounts linked to a shop. |
| `products` | Core inventory items, strictly tied to a `supplier_id`. |
| `suppliers`| Vendor details including the critical `lead_time_days` metric. |
| `sales` | Transaction records used to derive sales velocity and history. |
| `purchase_orders` | Tracks orders to suppliers through their lifecycle. |
| `purchase_order_items`| Line items for a specific purchase order. |

### Authentication & Security
- **Stateless Sessions**: JWT-based authentication.
- **Role-Based Access Control (RBAC)**: Backend middleware strictly enforces `requireAuth` and `requireOwner` for destructive actions or shop administration.
- **Tenant Isolation**: Every core table maintains a foreign key to `shops`, and queries are strictly bound by the authenticated user's `shop_id`.

## Local Development

Getting started is incredibly fast. StockPulse makes a specific engineering decision to use **PGlite** for local development. This means **you do not need a running PostgreSQL server or Docker** on your machine to start developing!

### Prerequisites
- Node.js (v20+)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stockpulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Leave DATABASE_URL empty to use zero-setup PGlite locally!
   # PGlite will store data in the local .pgdata/ folder.
   
   JWT_SECRET=<your_secure_development_secret>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The backend API and Vite frontend will start concurrently. The application will automatically run schema migrations and seed the database with a robust set of demo data.

## Deployment

StockPulse is optimized for deployment on **Render** (as a Web Service) with **Neon** serving as the production database.

1. Set `NODE_ENV=production`
2. Provide a valid Neon PostgreSQL connection string in `DATABASE_URL`.
3. Provide a strong, cryptographically secure `JWT_SECRET`.
4. The deployment process utilizes `npm run build`, which compiles the Vite frontend into `dist/` and bundles the Express server using `esbuild` to `dist/server.cjs`.
5. The service is started using `npm start` (`node dist/server.cjs`), which serves both the API and the static frontend.

## Future Improvements

- **Barcode Scanning Support**: Integrating camera-based scanning in the frontend for rapid point-of-sale operations.
- **Export to CSV/PDF**: Generating tangible reports for purchase orders and inventory valuation.
- **Automated Email Alerts**: Implementing a CRON job to proactively email owners regarding critical and low stock items.
- **Supplier Portal**: A dedicated interface for suppliers to log in, view pending orders, and update PO statuses directly.

---
*Note: This repository does not currently specify an open-source license. All rights reserved.*
