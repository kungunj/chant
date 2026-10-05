"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Polls the payment until M-Pesa confirms or rejects it, then refreshes the page. */
export function PaymentStatusPoller({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      setSeconds(Math.round((Date.now() - started) / 1000));
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
        const body = (await res.json()) as { status?: string };
        if (body.status && body.status !== "PENDING") {
          router.refresh();
          return;
        }
      } catch {
        // network blip; keep polling
      }
      if (Date.now() - started < 3 * 60 * 1000) setTimeout(tick, 4000);
    };
    const timer = setTimeout(tick, 3000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [paymentId, router]);

  return (
    <p className="text-sm text-stone-500">
      {seconds < 180 ? "Waiting for you to enter your M-Pesa PIN…" : "Still no answer from M-Pesa. Refresh this page to check again."}
    </p>
  );
}
