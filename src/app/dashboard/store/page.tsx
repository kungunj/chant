import { requireTechnician } from "@/lib/auth";
import { StoreForm } from "./StoreForm";

export default async function StoreSettingsPage() {
  const user = await requireTechnician();
  return (
    <div className="card mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">{user.store ? "Store details" : "Set up your store"}</h1>
      <StoreForm store={user.store} />
    </div>
  );
}
