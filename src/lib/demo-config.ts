// Choices that shape the demo walkthrough, kept in one place.
//
// The visitor approves ONE recall themselves (the featured one: a refund, the clearest money
// story). The other recalls are approved in advance when the demo is reset, as if the store had
// handled them earlier, so the buyer's page shows every remedy without extra clicks.
export const FEATURED_RECALL = "27011"; // HotHands rechargeable hand warmers (refund)

// Recorded on the audit trail so the dashboard can say "approved in advance" and never claims
// the visitor did it.
export const PRE_APPROVED_BY = "demo setup";

// The demo walkthrough, written once. The Home page lists it; the dashboard's "Try the demo" strip
// shows the same four steps (after "Start fresh demo") with their live state.
export const DEMO_STEPS = [
  { title: "Start fresh demo", text: "resets the store and opens its dashboard." },
  { title: "Approve the hand-warmers recall", text: "as the store. Nothing is sent or paid before this." },
  { title: "Open the buyer page", text: "as the customer: the sandbox buyer, marked on the dashboard." },
  { title: "Confirm with PayPal", text: "and sign in with the sandbox login below. PayPal sends the money." },
  { title: "Watch it settle", text: "back on the dashboard, usually within a minute." },
];
