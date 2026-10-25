import type { Metadata } from "next";
import { Suspense } from "react";
import { Mismatch } from "./Mismatch";
import { RecallFlow } from "./RecallFlow";
import { SeveralFlow } from "./SeveralFlow";
import styles from "./page.module.css";
import { Success } from "./Success";

// Buyer links are private to one case; keep them out of search results.
export const metadata: Metadata = {
  title: "Your recall | Recall Runner",
  robots: { index: false, follow: false },
};

// ?view= makes each state linkable for the demo. TODO: derive it from the case state by token.
async function BuyerView({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { token } = await params;
  const { view } = await searchParams;

  if (view === "success") return <Success token={token} />;
  if (view === "mismatch") return <Mismatch />;
  if (view === "several") return <SeveralFlow />;
  return <RecallFlow />;
}

export default function BuyerPage({ params, searchParams }: PageProps<"/r/[token]">) {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <BuyerView params={params} searchParams={searchParams} />
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
