import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Money is stored as whole cents (integers), never decimals, so 18.00 dollars is 1800.
// Floating-point math can turn 0.1 + 0.2 into 0.30000000000000004; integers can't.

// The store that sells products and runs recall campaigns. The demo uses one fictional merchant.
export const merchants = pgTable("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// What the merchant sells. The agent matches recalls against these names and descriptions.
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    brand: text("brand").notNull(),
    priceCents: integer("price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("products_merchant_sku").on(t.merchantId, t.sku)],
);

// People who bought something. The email is also what Log In with PayPal is compared against.
export const buyers = pgTable("buyers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One purchase. The PayPal ids stay empty until Phase 2 attaches real sandbox captures.
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id")
    .notNull()
    .references(() => merchants.id, { onDelete: "cascade" }),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => buyers.id, { onDelete: "cascade" }),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  // The date our rules use (for example the 180-day refund window). PayPal's sandbox cannot
  // create a payment dated in the past, so seeded orders carry a made-up date and say so here.
  effectiveOrderDate: timestamp("effective_order_date", {
    withTimezone: true,
  }).notNull(),
  dateIsSimulated: boolean("date_is_simulated").notNull().default(false),
  // Groups the orders created for one judge's "Start fresh demo" session.
  demoSessionId: text("demo_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The products inside an order (an order can hold more than one).
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

// Real product recalls from the US Consumer Product Safety Commission (CPSC).
export const recalls = pgTable("recalls", {
  id: uuid("id").primaryKey().defaultRandom(),
  cpscRecallId: integer("cpsc_recall_id").notNull().unique(),
  recallNumber: text("recall_number").notNull().unique(),
  recallDate: date("recall_date").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hazards: text("hazards").notNull(),
  remedyText: text("remedy_text").notNull(),
  // Which fixes the recall offers: Refund, Replace and/or Repair.
  remedyOptions: text("remedy_options").array().notNull(),
  retailers: text("retailers").notNull(),
  manufacturers: text("manufacturers").notNull(),
  soldOnline: boolean("sold_online").notNull(),
  // The recalled products as listed by CPSC: name, type and unit count.
  products: jsonb("products").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
