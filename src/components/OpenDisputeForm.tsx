"use client";

import { openDispute } from "@/app/actions/disputes";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function OpenDisputeForm({ orderId, role }: { orderId: string; role: "buyer" | "seller" }) {
  return (
    <details className="rounded-md border border-stone-200 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-red-700">Report a problem / open a dispute</summary>
      <ActionForm action={openDispute} className="mt-3 space-y-2">
        <input type="hidden" name="orderId" value={orderId} />
        <p className="text-stone-600">
          {role === "buyer"
            ? "Item not received, not as described, or faulty? The payment stays frozen in escrow and a SparesHub moderator joins a chat with you and the seller to resolve it."
            : "Problem with this buyer? The payment stays in escrow and a SparesHub moderator joins a chat with you and the buyer."}
        </p>
        <textarea name="reason" rows={3} required minLength={10} className="input" placeholder="What went wrong?" />
        <SubmitButton className="btn-danger">Open dispute</SubmitButton>
      </ActionForm>
    </details>
  );
}
