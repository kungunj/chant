import { redirect } from "next/navigation";
import { requireStore } from "@/lib/auth";
import { registrationFeeKes } from "@/lib/name-check";
import { VerificationForm } from "./VerificationForm";

export default async function VerificationPage() {
  const { user, store } = await requireStore();
  if (store.status !== "DRAFT" && store.status !== "REJECTED") redirect("/dashboard");
  return (
    <div className="card mx-auto max-w-2xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Get verified to sell</h1>
        <p className="text-sm text-stone-600">
          Buyers only see sellers that SparesHub has verified. Shops must be a registered business, which we check with
          the Registrar. Individuals selling their own used items verify with their ID and an M-Pesa line in their name.
          A moderator reviews your documents, and your listings go live once you are approved. You can post products
          meanwhile.
        </p>
      </div>
      {store.status === "REJECTED" && store.reviewNote && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          Your last application was rejected: {store.reviewNote}
        </p>
      )}
      <VerificationForm
        legalName={store.legalName ?? user.name}
        phone={user.phone ? `0${user.phone.slice(3)}` : ""}
        feeKes={registrationFeeKes()}
      />
    </div>
  );
}
