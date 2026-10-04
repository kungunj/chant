"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resolveDispute } from "@/app/actions/admin";
import { postDisputeMessage } from "@/app/actions/disputes";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

/** Keeps the chat fresh so each side sees new messages without reloading. */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}

export function MessageForm({ disputeId }: { disputeId: string }) {
  return (
    <ActionForm action={postDisputeMessage} resetOnSuccess className="space-y-2">
      <input type="hidden" name="disputeId" value={disputeId} />
      <textarea name="body" rows={3} required className="input" placeholder="Write a message…" />
      <SubmitButton pendingText="Sending…">Send</SubmitButton>
    </ActionForm>
  );
}

export function ResolveForm({ disputeId, total }: { disputeId: string; total: number }) {
  return (
    <ActionForm action={resolveDispute} className="space-y-3">
      <input type="hidden" name="disputeId" value={disputeId} />
      <div>
        <label className="label" htmlFor="refundKes">Refund to buyer (KSh, 0 to {total.toLocaleString("en-KE")})</label>
        <input id="refundKes" name="refundKes" type="number" min={0} max={total} defaultValue={0} required className="input" />
        <p className="mt-1 text-xs text-stone-500">The rest is released to the seller. Enter {total} for a full refund.</p>
      </div>
      <div>
        <label className="label" htmlFor="resolution">Decision</label>
        <textarea id="resolution" name="resolution" rows={3} required className="input" />
      </div>
      <SubmitButton className="btn-primary">Resolve dispute</SubmitButton>
    </ActionForm>
  );
}
