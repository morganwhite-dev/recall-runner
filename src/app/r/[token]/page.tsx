import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadBuyerPage, markOpened } from "@/lib/buyer";
import { isDone } from "./data";
import { Mismatch } from "./Mismatch";
import styles from "./page.module.css";
import { Problem } from "./Problem";
import { RecallFlow } from "./RecallFlow";
import { SeveralFlow } from "./SeveralFlow";
import { Success } from "./Success";

// Buyer links are private to one buyer; keep them out of search results.
export const metadata: Metadata = {
  title: "Your recall | Recall Runner",
  robots: { index: false, follow: false },
};

const ALERTS: Record<string, string> = {
  expired: "That sign-in took too long or was already used. Please choose again.",
  error: "PayPal had a problem, and nothing was sent. Please try again.",
};

// What the page shows is decided by the database, not by the URL:
//   one open recall -> the single notice; several, or several remedies -> the card view;
//   ?case=<id> or a finished case -> the receipt; ?result=mismatch -> account doesn't match.
async function BuyerView({
  params,
  searchParams,
}: PageProps<"/r/[token]">) {
  const { token } = await params;
  const { case: caseParam, result } = await searchParams;
  const page = await loadBuyerPage(token);
  if (!page) notFound();

  const { cases, storeName: store } = page;
  const only = cases.length === 1 ? cases[0] : null;
  const picked =
    typeof caseParam === "string" ? cases.find((c) => c.caseId === caseParam) : undefined;
  const target = picked ?? only;
  const alert = typeof result === "string" ? ALERTS[result] : undefined;

  let view;
  if (result === "mismatch") {
    view = <Mismatch token={token} store={store} />;
  } else if (target && isDone(target)) {
    view = <Success token={token} store={store} c={target} others={cases.length > 1} />;
  } else if (picked && !isDone(picked) && picked.status !== "OPEN") {
    view = <Problem store={store} c={picked} />;
  } else if (only && only.status === "OPEN" && only.offers.length === 1) {
    if (!caseParam) await markOpened([only.caseId]);
    view = <RecallFlow token={token} store={store} recall={only} />;
  } else {
    if (!caseParam) await markOpened(cases.map((c) => c.caseId));
    view = <SeveralFlow token={token} store={store} recalls={cases} />;
  }

  return (
    <>
      {alert && (
        <div className={styles.wrap}>
          <p className={styles.alert} role="alert">
            {alert}
          </p>
        </div>
      )}
      {view}
    </>
  );
}

// The recall itself is read per request, so it sits inside Suspense; the shell and footer don't wait.
export default function BuyerPage(props: PageProps<"/r/[token]">) {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <BuyerView {...props} />
      </Suspense>
      <footer>
        <div className={styles.wrap}>
          Demo store. The merchant and order dates are made up; the recalls are real CPSC data. Not
          affiliated with CPSC or PayPal.
        </div>
      </footer>
    </div>
  );
}
