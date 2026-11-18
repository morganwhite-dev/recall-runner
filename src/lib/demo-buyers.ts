// The extra sandbox buyers a judge can pick, one per money scenario. Each has its own PayPal sandbox
// login (see sandbox-buyers.ts), an order on the hand-warmers recall, and one thing that is special
// about it. The dates are made up (PayPal's sandbox cannot create a payment in the past).
//
// "changed" is the odd one: the store has an old email on file, so the PayPal account the buyer
// signs in with does not match it, and the claim is refused with nothing paid.

export type DemoBuyer = {
  key: string; // the SANDBOX_BUYERS key
  name: string;
  label: string; // shown in the "Pick a buyer" menu
  story: string; // one plain sentence on what happens
  sku: string; // what they bought
  daysAgo: number;
  refundedCents: number; // the store already refunded this much of the item
  // false: the store's email is NOT the PayPal login's email (the "changed email" buyer).
  emailMatchesLogin: boolean;
  storeEmail?: string; // used when emailMatchesLogin is false
};

export const DEMO_BUYERS: DemoBuyer[] = [
  {
    key: "recent",
    name: "Riley Brooks",
    label: "Recent order",
    story: "Bought 30 days ago, inside PayPal's 180-day window, so the payment is refunded.",
    sku: "BH-HW-2P",
    daysAgo: 30,
    refundedCents: 0,
    emailMatchesLogin: true,
  },
  {
    key: "old",
    name: "Owen Hartley",
    label: "Old order",
    story: "Bought 250 days ago, past the refund window, so PayPal Payouts pays them instead.",
    sku: "BH-HW-2P",
    daysAgo: 250,
    refundedCents: 0,
    emailMatchesLogin: true,
  },
  {
    key: "changed",
    name: "Casey Whitfield",
    label: "Changed email",
    story: "Signs in with a PayPal account that does not match the email on the order, so nothing is paid.",
    sku: "BH-HW-2P",
    daysAgo: 60,
    refundedCents: 0,
    emailMatchesLogin: false,
    storeEmail: "casey.whitfield@example.com",
  },
  {
    key: "partly",
    name: "Parker Lane",
    label: "Partly refunded",
    story: "The store already refunded $10.00 of the $34.00, so only the remaining $24.00 is paid.",
    sku: "BH-HW-2P",
    daysAgo: 120,
    refundedCents: 1000,
    emailMatchesLogin: true,
  },
];
