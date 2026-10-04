"use client";

import { useActionState } from "react";
import { saveStore } from "@/app/actions/store";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

type Store = { name: string; description: string | null; location: string | null } | null;

export function StoreForm({ store }: { store: Store }) {
  const [state, action] = useActionState(saveStore, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
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
      <SubmitButton>{store ? "Save" : "Create store"}</SubmitButton>
    </form>
  );
}
