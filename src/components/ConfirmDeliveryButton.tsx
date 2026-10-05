"use client";

export function ConfirmDeliveryButton({ amount }: { amount: string }) {
  return (
    <button
      type="submit"
      className="btn-primary"
      onClick={(e) => {
        if (!confirm(`Confirm you received the item in good condition? ${amount} will be released to the seller. This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      I received it, release payment
    </button>
  );
}
