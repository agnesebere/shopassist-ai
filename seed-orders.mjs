/**
 * Seed script — inserts rich test orders into the database.
 * Run with: node seed-orders.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const TEST_ORDERS = [
  {
    orderId: "ORD-78234",
    customerId: "C-10482",
    product: "Wireless Noise-Cancelling Headphones",
    category: "Electronics",
    price: "$149.99",
    status: "in_transit",
    statusLabel: "In Transit",
    carrier: "FedEx",
    trackingCode: "FX9284710234",
    eta: "Mar 8, 2026",
    orderedAt: "Feb 28, 2026",
    steps: JSON.stringify(["ordered", "processed", "shipped", "in_transit"]),
    notes: null,
  },
  {
    orderId: "ORD-77891",
    customerId: "C-10482",
    product: "Ergonomic Office Chair",
    category: "Furniture",
    price: "$329.00",
    status: "delivered",
    statusLabel: "Delivered",
    carrier: "UPS",
    trackingCode: "UP1928374650",
    eta: "Feb 25, 2026",
    orderedAt: "Feb 20, 2026",
    steps: JSON.stringify(["ordered", "processed", "shipped", "in_transit", "delivered"]),
    notes: null,
  },
  {
    orderId: "ORD-76540",
    customerId: "C-10482",
    product: "Stainless Steel Water Bottle (3-pack)",
    category: "Kitchen",
    price: "$44.99",
    status: "processing",
    statusLabel: "Processing",
    carrier: "DHL",
    trackingCode: "DH7364829103",
    eta: "Mar 10, 2026",
    orderedAt: "Mar 1, 2026",
    steps: JSON.stringify(["ordered", "processed"]),
    notes: null,
  },
  {
    orderId: "ORD-75320",
    customerId: "C-10482",
    product: "Running Shoes — Nike Air Max 270",
    category: "Footwear",
    price: "$189.00",
    status: "delayed",
    statusLabel: "Delayed",
    carrier: "FedEx",
    trackingCode: "FX8812930045",
    eta: "Mar 12, 2026",
    orderedAt: "Feb 25, 2026",
    steps: JSON.stringify(["ordered", "processed", "shipped"]),
    notes: "Delayed due to severe weather conditions at the Memphis hub. New ETA: Mar 12, 2026.",
  },
  {
    orderId: "ORD-74110",
    customerId: "C-10482",
    product: "4K Smart TV — 55 inch Samsung",
    category: "Electronics",
    price: "$699.00",
    status: "cancelled",
    statusLabel: "Cancelled",
    carrier: null,
    trackingCode: null,
    eta: null,
    orderedAt: "Feb 15, 2026",
    steps: JSON.stringify(["ordered"]),
    notes: "Order cancelled by customer on Feb 16, 2026. Full refund issued.",
  },
  {
    orderId: "ORD-73890",
    customerId: "C-10482",
    product: "Yoga Mat — Premium Non-Slip",
    category: "Sports",
    price: "$59.99",
    status: "refunded",
    statusLabel: "Refunded",
    carrier: "UPS",
    trackingCode: "UP7712938401",
    eta: "Feb 10, 2026",
    orderedAt: "Feb 3, 2026",
    steps: JSON.stringify(["ordered", "processed", "shipped", "in_transit", "delivered"]),
    notes: "Item returned by customer — wrong size. Refund of $59.99 processed on Feb 18, 2026.",
  },
  {
    orderId: "ORD-73001",
    customerId: "C-10482",
    product: "Coffee Maker — Nespresso Vertuo",
    category: "Kitchen",
    price: "$199.00",
    status: "delivered",
    statusLabel: "Delivered",
    carrier: "DHL",
    trackingCode: "DH5521748293",
    eta: "Feb 5, 2026",
    orderedAt: "Jan 30, 2026",
    steps: JSON.stringify(["ordered", "processed", "shipped", "in_transit", "delivered"]),
    notes: null,
  },
];

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("🌱 Seeding orders table...");

  for (const order of TEST_ORDERS) {
    await connection.execute(
      `INSERT INTO orders 
        (orderId, customerId, product, category, price, status, statusLabel, carrier, trackingCode, eta, orderedAt, steps, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        statusLabel = VALUES(statusLabel),
        notes = VALUES(notes),
        updatedAt = NOW()`,
      [
        order.orderId, order.customerId, order.product, order.category,
        order.price, order.status, order.statusLabel, order.carrier,
        order.trackingCode, order.eta, order.orderedAt, order.steps, order.notes
      ]
    );
    console.log(`  ✅ ${order.orderId} — ${order.product} (${order.statusLabel})`);
  }

  console.log("\n✅ Seeding complete! 7 test orders inserted.");
  await connection.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
