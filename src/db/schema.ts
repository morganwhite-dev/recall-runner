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
  // The store's products the agent matched to this recall (SKUs). Approval opens cases for them.
  matchedSkus: text("matched_skus").array().notNull().default([]),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
    // The email PayPal verified when the buyer signed in. Payouts go here, never to a stored email.
    verifiedEmail: text("verified_email"),
    // Set when a verified PayPal webhook confirms the money moved (the "settled" flip).
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("cases_campaign_order_product").on(
      t.campaignId,
      t.orderId,
      t.productId,
    ),
  ],
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The audit trail: one row per agent step. It feeds the "Why this happened" timeline.
// actor: MODEL (the AI), RULE (fixed code), TOOL (a lookup or PayPal call), YOU (the merchant).
// step: DETECT, MATCH, INVESTIGATE, PLAN, APPROVE, NOTIFY.
export const agentDecisions = pgTable("agent_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id")
    .notNull()
    .references(() => merchants.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, {
    onDelete: "cascade",
  }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  step: text("step").notNull(),
  actor: text("actor").notNull(),
  summary: text("summary").notNull(), // the one line shown on the dashboard
  detail: jsonb("detail"), // evidence, inputs and outputs, for the expandable view
  model: text("model"), // which AI model, when actor is MODEL
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The message drafted for each buyer (what the Outbox shows). The hazard and remedy are
// quoted word for word from the CPSC record; draftedBy says whether the AI or a template wrote it.
export const notices = pgTable("notices", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .unique()
    .references(() => cases.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  hazardQuote: text("hazard_quote").notNull(),
  remedyQuote: text("remedy_quote").notNull(),
  draftedBy: text("drafted_by").notNull(), // MODEL or TEMPLATE
  fallbackReason: text("fallback_reason"), // why the template was used, if it was
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  openedAt: timestamp("opened_at", { withTimezone: true }),
});

// The private link in each buyer's notice: /r/<token>. The token is random and unguessable, and
// it only says which buyer's recalls to show. Claiming still needs Log In with PayPal.
export const buyerLinks = pgTable("buyer_links", {
  token: text("token").primaryKey(),
  buyerId: uuid("buyer_id")
    .notNull()
    .unique()
    .references(() => buyers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One "Confirm with PayPal" click, covering one or several of a buyer's recalls. The random state
// value also sits in the buyer's cookie, so a login can only finish in the browser that started
// it, and only once. What was picked for each case lives in login_attempt_items.
export const loginAttempts = pgTable("login_attempts", {
  state: text("state").primaryKey(),
  buyerId: uuid("buyer_id").references(() => buyers.id, { onDelete: "cascade" }),
  // Old single-case columns from the first Phase 4 build; unused now, dropped in a later cleanup
  // (kept so the previous deployment keeps working while the new one rolls out).
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  choice: text("choice"),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The remedy chosen for each case in one sign-in. One PayPal sign-in settles all of them.
export const loginAttemptItems = pgTable("login_attempt_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  state: text("state")
    .notNull()
    .references(() => loginAttempts.state, { onDelete: "cascade" }),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  choice: text("choice").notNull(), // refund, replacement or repair
});

// Saved AI answers, keyed by a fingerprint of the task, its inputs and the prompt version,
// so repeating the same step doesn't pay for the same answer twice.
export const llmCache = pgTable("llm_cache", {
  key: text("key").primaryKey(),
  task: text("task").notNull(),
  model: text("model").notNull(),
  output: jsonb("output").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Results of the AI tests (npm run eval). Each run of the suite shares one runGroup.
export const evalRuns = pgTable("eval_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runGroup: text("run_group").notNull(),
  caseNo: integer("case_no").notNull(),
  name: text("name").notNull(),
  area: text("area").notNull(),
  attempt: integer("attempt").notNull(),
  passed: boolean("passed").notNull(),
  detail: jsonb("detail"),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
