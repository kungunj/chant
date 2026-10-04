"use client";

import { useActionState } from "react";
import { placeOrder } from "@/app/actions/checkout";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function CheckoutForm({ name, phone, total }: { name: string; phone: string; total: string }) {
  const [state, action] = useActionState(placeOrder, undefined);
  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />
      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 font-semibold">Delivery</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="shippingName">Recipient name</label>
            <input id="shippingName" name="shippingName" defaultValue={name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="shippingPhone">Recipient phone</label>
            <input id="shippingPhone" name="shippingPhone" defaultValue={phone} required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="shippingAddress">Address, building or P.O. Box</label>
          <input id="shippingAddress" name="shippingAddress" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="shippingTown">Town</label>
          <input id="shippingTown" name="shippingTown" required className="input" placeholder="e.g. Nakuru" />
        </div>
        <div>
          <span className="label">Courier</span>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="card flex cursor-pointer items-center gap-2 p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="courier" value="POSTA_KENYA" defaultChecked /> Posta Kenya
            </label>
            <label className="card flex cursor-pointer items-center gap-2 p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="courier" value="FARGO_COURIER" /> Fargo Courier
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 font-semibold">Pay with M-Pesa</legend>
        <div>
          <label className="label" htmlFor="mpesaPhone">M-Pesa number</label>
          <input id="mpesaPhone" name="mpesaPhone" defaultValue={phone} required className="input" />
          <p className="mt-1 text-xs text-stone-500">
            You will get a prompt on this phone to enter your M-Pesa PIN and approve {total}.
          </p>
        </div>
      </fieldset>

      <SubmitButton className="btn-mpesa w-full py-3 text-base" pendingText="Sending M-Pesa prompt…">
        Pay {total} with M-Pesa
      </SubmitButton>
    </form>
  );
}
