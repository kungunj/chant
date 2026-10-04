import { redirect } from "next/navigation";
import { requireStore } from "@/lib/auth";
import { VerificationForm } from "./VerificationForm";

export default async function VerificationPage() {
  const { user, store } = await requireStore();
  if (store.status !== "DRAFT" && store.status !== "REJECTED") redirect("/dashboard");
  return (
    <div className="card mx-auto max-w-2xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Verify your identity</h1>
        <p className="text-sm text-stone-600">
          Buyers only see stores that SparesHub has verified. Upload your ID and a selfie; a moderator reviews them
          and approves your store. You can post products meanwhile, and they go live once you are approved.
        </p>
      </div>
      {store.status === "REJECTED" && store.reviewNote && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          Your last application was rejected: {store.reviewNote}
        </p>
      )}
      <VerificationForm legalName={store.legalName ?? user.name} />
    </div>
  );
}
