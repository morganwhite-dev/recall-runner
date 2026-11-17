// The policy engine: deterministic rules that decide what happens to money for one case.
// No AI and no network calls. Same inputs, same answer, every time, so it can be tested.
// The AI may explain and draft; only this function decides where money goes.

export const REFUND_WINDOW_DAYS = 180; // PayPal only allows refunds within 180 days of capture
const DAY_MS = 24 * 60 * 60 * 1000;

export type BuyerChoice = "refund" | "replacement" | "repair";
export type Action =
  "REFUND" | "PAYOUT" | "TRACKING" | "REPAIR_NOTICE" | "REJECT";

export type PolicyInput = {
  choice: BuyerChoice;
  remedyOptions: string[]; // what the recall offers, from CPSC: Refund, Replace, Repair
  orderDate: Date; // effective_order_date (simulated for seeded orders)
  now: Date;
  lineAmountCents: number; // price paid for the recalled product line in this order
  orderTotalCents: number; // the whole order's captured total
  hasCapture: boolean; // is there a real PayPal payment on record for this order?
  // Money the store already gave back for this item (a goodwill refund, say). Only the rest is paid.
  alreadyRefundedCents?: number;
};

export type Decision = {
  action: Action;
  rule: string; // short code shown in the audit trail
  amountCents: number; // money to send; 0 when nothing is paid
  rationale: string; // plain-English line shown to the merchant
};

// Maps the buyer's choice to the remedy name CPSC uses.
const OFFER_NAME: Record<BuyerChoice, string> = {
  refund: "Refund",
  replacement: "Replace",
  repair: "Repair",
};

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function decideRemedy(input: PolicyInput): Decision {
  const reject = (rule: string, rationale: string): Decision => ({
    action: "REJECT",
    rule,
    amountCents: 0,
    rationale,
  });

  // 1. The buyer can only choose a remedy the recall actually offers.
  if (!input.remedyOptions.includes(OFFER_NAME[input.choice])) {
    return reject(
      "CHOICE_NOT_OFFERED",
      `The buyer chose ${input.choice}, but this recall offers ${input.remedyOptions.join(", ") || "nothing"}. Nothing was sent.`,
    );
  }

  // 2. No proof of payment, no money. Every path needs a real PayPal capture on record.
  if (!input.hasCapture) {
    return reject(
      "NO_PAYMENT_ON_RECORD",
      "There is no PayPal payment on record for this order. Nothing was sent.",
    );
  }

  // 3. Amount sanity checks. The amount comes from the stored order, never from the AI.
  if (!Number.isInteger(input.lineAmountCents) || input.lineAmountCents <= 0) {
    return reject(
      "INVALID_AMOUNT",
      "The recalled item has no valid price on the order. Nothing was sent.",
    );
  }
  if (input.lineAmountCents > input.orderTotalCents) {
    return reject(
      "AMOUNT_EXCEEDS_ORDER",
      `The item price ${formatUsd(input.lineAmountCents)} is more than the order total ${formatUsd(input.orderTotalCents)}. Nothing was sent.`,
    );
  }

  const already = input.alreadyRefundedCents ?? 0;
  if (!Number.isInteger(already) || already < 0) {
    return reject(
      "INVALID_AMOUNT",
      "The order's earlier refund record is not a valid amount. Nothing was sent.",
    );
  }

  // 4. Remedies that move no money.
  if (input.choice === "replacement") {
    return {
      action: "TRACKING",
      rule: "REPLACEMENT_SHIP",
      amountCents: 0,
      rationale:
        "The buyer chose a replacement, so a new unit ships and its tracking is added to the original PayPal order.",
    };
  }
  if (input.choice === "repair") {
    return {
      action: "REPAIR_NOTICE",
      rule: "REPAIR_KIT",
      amountCents: 0,
      rationale:
        "The buyer chose the free repair kit. No money moves; the kit request is recorded.",
    };
  }

  // 5. An item the store already refunded in part is paid only what is left; in full, nothing.
  const dueCents = input.lineAmountCents - already;
  if (dueCents <= 0) {
    return reject(
      "ALREADY_REFUNDED",
      `The store already refunded ${formatUsd(already)} for this item, which covers its ${formatUsd(input.lineAmountCents)} price. Nothing more was sent.`,
    );
  }
  const earlier = already
    ? ` ${formatUsd(already)} was already refunded, so only the rest is paid.`
    : "";

  // 6. Refunds: inside PayPal's window, refund the original payment; past it, pay by PayPal Payouts.
  const ageMs = input.now.getTime() - input.orderDate.getTime();
  const ageDays = Math.floor(ageMs / DAY_MS);
  const amount = formatUsd(dueCents);

  if (ageMs <= REFUND_WINDOW_DAYS * DAY_MS) {
    return {
      action: "REFUND",
      rule: "WITHIN_REFUND_WINDOW",
      amountCents: dueCents,
      rationale: `Paid ${ageDays} days ago, inside PayPal's ${REFUND_WINDOW_DAYS}-day refund window, so the original payment is refunded: ${amount}.${earlier}`,
    };
  }

  return {
    action: "PAYOUT",
    rule: "REFUND_WINDOW_EXCEEDED",
    amountCents: dueCents,
    rationale: `Paid ${ageDays} days ago, past PayPal's ${REFUND_WINDOW_DAYS}-day refund window, so the buyer is paid by PayPal Payouts instead: ${amount}.${earlier}`,
  };
}
