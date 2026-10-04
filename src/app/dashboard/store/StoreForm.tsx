"use client";

import { saveStore } from "@/app/actions/store";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

type Store = {
  name: string;
  description: string | null;
  location: string | null;
  postaFeeKes: number | null;
  fargoFeeKes: number | null;
} | null;

const feeValue = (fee: number | null | undefined, fallback: number) => (fee === undefined ? fallback : (fee ?? ""));

export function StoreForm({ store }: { store: Store }) {
  return (
    <ActionForm action={saveStore} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Store name</label>
        <input id="name" name="name" defaultValue={store?.name} required className="input" placeholder="e.g. Kamau Electronics Repairs" />
      </div>
      <div>
        <label className="label" htmlFor="location">Location</label>
        <input id="location" name="location" defaultValue={store?.location ?? ""} className="input" placeholder="e.g. Luthuli Avenue, Nairobi" />
      </div>
      <div>
        <label className="label" htmlFor="description">About your store</label>
        <textarea id="description" name="description" rows={4} defaultValue={store?.description ?? ""} className="input" />
      </div>
      <fieldset>
        <legend className="label">Delivery fee per order (KSh)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-stone-600" htmlFor="postaFeeKes">Posta Kenya</label>
            <input id="postaFeeKes" name="postaFeeKes" type="number" min={0} defaultValue={feeValue(store?.postaFeeKes, 300)} className="input" />
          </div>
          <div>
            <label className="text-xs text-stone-600" htmlFor="fargoFeeKes">Fargo Courier</label>
            <input id="fargoFeeKes" name="fargoFeeKes" type="number" min={0} defaultValue={feeValue(store?.fargoFeeKes, 400)} className="input" />
          </div>
        </div>
        <p className="mt-1 text-xs text-stone-500">Leave a courier empty if you do not ship with it. Enter 0 for free delivery.</p>
      </fieldset>
      <SubmitButton>{store ? "Save" : "Create store"}</SubmitButton>
    </ActionForm>
  );
}
