// Creates the fictional demo merchant "Brightnest Home" with a catalog, buyers and orders.
// Safe to re-run: it deletes the merchant's old demo data first, then rebuilds it.
// Run: npm run db:seed
//
// The catalog is built around three REAL recalls (one per remedy type) plus look-alike decoys
// from invented brands, so the agent has something to correctly refuse to match.
import { eq, inArray } from "drizzle-orm";
import { db, buyers, merchants, orderItems, orders, products } from "../src/db";
import { pool } from "../src/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

// sku, name, description, category, brand, price in cents
const CATALOG = [
  // Real recalled products (matched against recalls 27011, 26791 and 26794)
  [
    "BH-HW-2P",
    "Kindlewarm Rechargeable Hand Warmers, 2-pack",
    "White and orange magnetic hand warmers with a USB-C charging cable and a built-in lithium-ion battery.",
    "Electric warmers",
    "Kindlewarm",
    3400,
  ],
  [
    "BH-RC-BP",
    "Juniper Ridge Power Co. 2500 mAh Battery Pack for Reclining Chairs",
    "Black rechargeable battery pack for power reclining chairs, model RWX-RBP02.",
    "Chair batteries",
    "Juniper Ridge Power Co.",
    10500,
  ],
  [
    "BH-DR-8",
    "Oakhollow 8-Drawer Dresser",
    "Eight-drawer wooden dresser for bedrooms, available in black, white, brown, oak and cream.",
    "Dressers",
    "Oakhollow",
    24900,
  ],
  // Decoys: same kind of product, different brand, so they must NOT match those recalls
  [
    "BH-HW-EM",
    "Emberly Rechargeable Hand Warmer, 2-pack",
    "Pocket hand warmers with a USB-C charging cable, heats for up to eight hours.",
    "Electric warmers",
    "Emberly",
    2900,
  ],
  [
    "BH-RC-SP",
    "SoftPulse 3000 mAh Battery Pack for Reclining Chairs",
    "Rechargeable battery pack that fits most power recliners.",
    "Chair batteries",
    "SoftPulse",
    7900,
  ],
  [
    "BH-DR-6",
    "Nordhaven 6-Drawer Dresser",
    "Six-drawer pine dresser with wall anchors included.",
    "Dressers",
    "Nordhaven",
    21900,
  ],
  // Unrelated everyday products
  [
    "BH-TH-LN",
    "Linen Throw Blanket",
    "Soft washed linen throw in oatmeal.",
    "Textiles",
    "Brightnest",
    4800,
  ],
  [
    "BH-CF-PO",
    "Ceramic Pour-Over Coffee Set",
    "Ceramic dripper, carafe and two mugs.",
    "Kitchen",
    "Brightnest",
    5600,
  ],
  [
    "BH-DO-BM",
    "Bamboo Desk Organizer",
    "Five-compartment desk organizer made from bamboo.",
    "Office",
    "Brightnest",
    2400,
  ],
  [
    "BH-CA-3",
    "Scented Candle Trio",
    "Three soy candles: cedar, fig and sea salt.",
    "Home fragrance",
    "Brightnest",
    3000,
  ],
] as const;

// name, email. The first buyer uses the sandbox personal account from Phase 0, so the
// Log In with PayPal check can be demoed end to end.
const BUYERS = [
  ["Morgan Demo", "sb-cpwe353506970@personal.example.com"],
  ["Alicia Rivera", "alicia.rivera@example.com"],
  ["James Okafor", "james.okafor@example.com"],
  ["Mei Chen", "mei.chen@example.com"],
  ["Sam Novak", "sam.novak@example.com"],
  ["Priya Nair", "priya.nair@example.com"],
  ["Tom Becker", "tom.becker@example.com"],
  ["Lena Fischer", "lena.fischer@example.com"],
  ["Diego Alvarez", "diego.alvarez@example.com"],
  ["Hannah Cole", "hannah.cole@example.com"],
  ["Omar Haddad", "omar.haddad@example.com"],
  ["Grace Kim", "grace.kim@example.com"],
] as const;

// buyer index, days ago, SKUs. Orders older than 180 days are past PayPal's refund window.
const ORDERS: [number, number, string[]][] = [
  // Hand warmers (recall 27011, refund)
  [4, 12, ["BH-HW-2P"]],
  [0, 45, ["BH-HW-2P", "BH-CA-3"]], // the sandbox buyer: refund path (a two-item order, only the warmers are refunded)
  [2, 120, ["BH-HW-2P"]],
  [3, 165, ["BH-HW-2P"]],
  [0, 200, ["BH-HW-2P"]], // the sandbox buyer: past 180 days, so the Payouts path lands in a real sandbox account
  [5, 260, ["BH-HW-2P"]],
  // Chair battery packs (recall 26791, replacement)
  [0, 30, ["BH-RC-BP"]], // the sandbox buyer: replacement path
  [6, 30, ["BH-RC-BP"]],
  [7, 95, ["BH-RC-BP"]],
  [8, 150, ["BH-RC-BP"]],
  [9, 215, ["BH-RC-BP"]],
  [10, 400, ["BH-RC-BP"]],
  // Dressers (recall 26794, repair kit)
  [11, 18, ["BH-DR-8"]],
  [0, 70, ["BH-DR-8"]], // the sandbox buyer: repair path
  [1, 70, ["BH-DR-8"]],
  [3, 140, ["BH-DR-8"]],
  [5, 230, ["BH-DR-8"]],
  [7, 330, ["BH-DR-8"]],
  // Decoys: similar products from other brands (should not be recalled)
  [2, 40, ["BH-HW-EM"]],
  [4, 100, ["BH-HW-EM", "BH-TH-LN"]],
  [6, 60, ["BH-RC-SP"]],
  [8, 80, ["BH-DR-6"]],
  [10, 250, ["BH-DR-6"]],
  // Unrelated purchases
  [9, 25, ["BH-TH-LN", "BH-CF-PO"]],
  [11, 110, ["BH-DO-BM"]],
  [0, 300, ["BH-CA-3"]],
];

async function main() {
  const now = Date.now();

  // Wipe the old demo data. Deleting the merchant also removes its products, orders and items
  // ("cascade"); the buyers are separate, so remove those by email.
  await db.delete(merchants).where(eq(merchants.name, "Brightnest Home"));
  await db.delete(buyers).where(
    inArray(
      buyers.email,
      BUYERS.map(([, email]) => email),
    ),
  );

  const [merchant] = await db
    .insert(merchants)
    .values({ name: "Brightnest Home" })
    .returning();

  const productRows = await db
    .insert(products)
    .values(
      CATALOG.map(([sku, name, description, category, brand, priceCents]) => ({
        merchantId: merchant.id,
        sku,
        name,
        description,
        category,
        brand,
        priceCents,
      })),
    )
    .returning();
  const bySku = new Map(productRows.map((p) => [p.sku, p]));

  const buyerRows = await db
    .insert(buyers)
    .values(BUYERS.map(([name, email]) => ({ name, email })))
    .returning();
  const byEmail = new Map(buyerRows.map((b) => [b.email, b]));

  for (const [buyerIndex, daysAgo, skus] of ORDERS) {
    const buyer = byEmail.get(BUYERS[buyerIndex][1])!;
    const items = skus.map((sku) => bySku.get(sku)!);
    const [order] = await db
      .insert(orders)
      .values({
        merchantId: merchant.id,
        buyerId: buyer.id,
        amountCents: items.reduce((sum, p) => sum + p.priceCents, 0),
        // Sandbox cannot create past-dated payments, so every seeded order carries a made-up date.
        effectiveOrderDate: new Date(now - daysAgo * DAY_MS),
        dateIsSimulated: true,
      })
      .returning();
    await db.insert(orderItems).values(
      items.map((p) => ({
        orderId: order.id,
        productId: p.id,
        quantity: 1,
        unitPriceCents: p.priceCents,
      })),
    );
  }

  console.log(
    `Seeded ${productRows.length} products, ${buyerRows.length} buyers and ${ORDERS.length} orders for Brightnest Home`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
