"use client";

import type { Courier } from "@prisma/client";
import { useState } from "react";
import { placeOrder } from "@/app/actions/checkout";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { deliveryFee } from "@/lib/delivery";
import { formatKes } from "@/lib/format";

export type CheckoutStore = {
  id: string;
  name: string;
  postaFeeKes: number | null;
  fargoFeeKes: number | null;
  items: { id: string; title: string; quantity: number; lineKes: number }[];
};

const couriers: { value: Courier; label: string }[] = [
  { value: "POSTA_KENYA", label: "Posta Kenya" },
  { value: "FARGO_COURIER", label: "Fargo Courier" },
];

export function CheckoutForm({ name, phone, stores }: { name: string; phone: string; stores: CheckoutStore[] }) {
  const firstAvailable = couriers.find((c) => stores.every((s) => deliveryFee(s, c.value) !== null))?.value ?? "POSTA_KENYA";
  const [courier, setCourier] = useState<Courier>(firstAvailable);
  const fees = stores.map((s) => deliveryFee(s, courier));
  const unavailable = stores.filter((_, i) => fees[i] === null);
  const itemsTotal = stores.reduce((sum, s) => sum + s.items.reduce((t, i) => t + i.lineKes, 0), 0);
  const total = itemsTotal + fees.reduce<number>((sum, f) => sum + (f ?? 0), 0);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <ActionForm action={placeOrder} className="space-y-5">
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
              {couriers.map((c) => (
                <label
                  key={c.value}
                  className="card flex cursor-pointer items-center gap-2 p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                >
                  <input
                    type="radio"
                    name="courier"
                    value={c.value}
                    checked={courier === c.value}
                    onChange={() => setCourier(c.value)}
                  />{" "}
                  {c.label}
                </label>
              ))}
            </div>
            {unavailable.length > 0 && (
              <p className="mt-2 text-sm text-red-700">
                {unavailable.map((s) => s.name).join(", ")} {unavailable.length === 1 ? "does" : "do"} not ship with this
                courier. Pick the other courier or remove those items from your cart.
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className="card space-y-3 p-4">
          <legend className="px-1 font-semibold">Pay with M-Pesa</legend>
          <div>
            <label className="label" htmlFor="mpesaPhone">M-Pesa number</label>
            <input id="mpesaPhone" name="mpesaPhone" defaultValue={phone} required className="input" />
            <p className="mt-1 text-xs text-stone-500">
              You will get a prompt on this phone to enter your M-Pesa PIN and approve {formatKes(total)}. SparesHub
              holds the money until you confirm you received your items.
            </p>
          </div>
        </fieldset>

        <SubmitButton className="btn-mpesa w-full py-3 text-base" pendingText="Sending M-Pesa prompt…">
          Pay {formatKes(total)} with M-Pesa
        </SubmitButton>
      </ActionForm>

      <aside className="card h-fit space-y-3 p-4 text-sm">
        <h2 className="font-semibold">Order summary</h2>
        {stores.map((s, i) => (
          <div key={s.id} className="space-y-1 border-b border-stone-200 pb-2 last:border-0">
            <p className="text-xs font-medium text-stone-500">{s.name}</p>
            {s.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <span className="truncate">{item.quantity} × {item.title}</span>
                <span className="shrink-0">{formatKes(item.lineKes)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-2 text-stone-600">
              <span>Delivery</span>
              <span>{fees[i] === null ? "not available" : fees[i] === 0 ? "Free" : formatKes(fees[i]!)}</span>
            </div>
          </div>
        ))}
        <div className="flex justify-between pt-1 font-semibold">
          <span>Total</span>
          <span>{formatKes(total)}</span>
        </div>
        {stores.length > 1 && (
          <p className="text-xs text-stone-500">Items from {stores.length} stores ship as {stores.length} separate parcels.</p>
        )}
      </aside>
    </div>
  );
}
