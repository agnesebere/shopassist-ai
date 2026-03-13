import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Orders Table ─────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("orderId", { length: 32 }).notNull().unique(),
  customerId: varchar("customerId", { length: 64 }).notNull(),
  product: varchar("product", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }),
  price: varchar("price", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["ordered", "processing", "shipped", "in_transit", "delivered", "cancelled", "refunded", "delayed"]).notNull(),
  statusLabel: varchar("statusLabel", { length: 64 }).notNull(),
  carrier: varchar("carrier", { length: 64 }),
  trackingCode: varchar("trackingCode", { length: 64 }),
  eta: varchar("eta", { length: 64 }),
  orderedAt: varchar("orderedAt", { length: 64 }).notNull(),
  steps: text("steps").notNull(), // JSON array stored as string
  notes: text("notes"), // optional internal notes (e.g. delay reason)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;