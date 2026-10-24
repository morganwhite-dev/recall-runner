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

// One recall the merchant is acting on. Nothing is paid until a person approves it.
// Status: DRAFT (proposed), APPROVED (merchant said yes), CLOSED.
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id")
    .notNull()
    .references(() => merchants.id, { onDelete: "cascade" }),
  recallId: uuid("recall_id")
    .notNull()
    .references(() => recalls.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("DRAFT"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One buyer's affected purchase inside a campaign: which order, which recalled product, what the
// buyer chose, and what the policy engine decided. One row per campaign + order + product, so the
// same purchase can never become two cases.
export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // What the buyer picked: refund, replacement or repair. Empty until they choose.
    choice: text("choice"),
    // OPEN, REJECTED, REFUNDED, PAYOUT_SENT, REPLACEMENT_SHIPPED, REPAIR_KIT_REQUESTED, FAILED
    status: text("status").notNull().default("OPEN"),
    // The policy engine's decision, kept so the dashboard can show exactly why.
    action: text("action"),
    ruleApplied: text("rule_applied"),
    rationale: text("rationale"),
    amountCents: integer("amount_cents"),
    // The PayPal id for what happened: refund id, payout batch id or tracking number.
    paypalRef: text("paypal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("cases_campaign_order_product").on(t.campaignId, t.orderId, t.productId)],
);

// The ledger: every PayPal call that moves money or ships a replacement. A row is written as
// PENDING before the call and updated after, so a crash mid-call leaves a trace. The request id is
// unique and is also sent to PayPal, which is what makes a retry unable to pay twice.
export const paypalActions = pgTable("paypal_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  op: text("op").notNull(), // REFUND, PAYOUT or TRACKING
  requestId: text("request_id").notNull().unique(),
  status: text("status").notNull().default("PENDING"), // PENDING, SUCCEEDED, FAILED
  httpStatus: integer("http_status"),
  paypalRef: text("paypal_ref"),
  response: jsonb("response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
