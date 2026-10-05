"use client";

import { cancelOrder } from "@/app/actions/orders";
import { submitReview } from "@/app/actions/reviews";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function CancelOrderForm({ orderId, role }: { orderId: string; role: "buyer" | "seller" }) {
  return (
    <details className="rounded-md border border-stone-200 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-stone-700">Cancel this order</summary>
      <ActionForm action={cancelOrder} className="mt-3 space-y-2">
        <input type="hidden" name="orderId" value={orderId} />
        <p className="text-stone-600">
          {role === "seller"
            ? "Use this if you cannot supply the item. The buyer gets a full refund to their SparesHub wallet."
            : "You get a full refund to your SparesHub wallet, which you can withdraw to M-Pesa."}
        </p>
        <input name="reason" required minLength={3} className="input" placeholder="Reason" />
        <SubmitButton className="btn-danger">Cancel and refund</SubmitButton>
      </ActionForm>
    </details>
  );
}

export function ReviewForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm action={submitReview} className="space-y-2 text-sm">
      <input type="hidden" name="orderId" value={orderId} />
      <span className="label">Rate this seller</span>
      <div className="flex flex-row-reverse justify-end gap-1 text-2xl">
        {[5, 4, 3, 2, 1].map((n) => (
          <label key={n} className="cursor-pointer text-stone-300 hover:text-amber-400 has-[:checked]:text-amber-500 [&:has(:checked)~label]:text-amber-500">
            <input type="radio" name="rating" value={n} required className="sr-only" />★
          </label>
        ))}
      </div>
      <textarea name="comment" rows={2} className="input" placeholder="How was the part and the service? (optional)" />
      <SubmitButton>Submit review</SubmitButton>
    </ActionForm>
  );
}
