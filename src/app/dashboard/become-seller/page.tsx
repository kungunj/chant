import { redirect } from "next/navigation";
import { becomeSeller } from "@/app/actions/store";
import { requireUser } from "@/lib/auth";

export default async function BecomeSellerPage() {
  const user = await requireUser("/dashboard/become-seller");
  if (user.role !== "BUYER") redirect("/dashboard");
  return (
    <div className="card mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Sell your spares on SparesHub</h1>
      <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
        <li>Open a store and post parts with photos, part numbers and prices.</li>
        <li>Buyers pay with M-Pesa before you ship.</li>
        <li>Ship with Posta Kenya or Fargo Courier and post the tracking number.</li>
      </ul>
      <form action={becomeSeller}>
        <button className="btn-primary w-full">Open my store</button>
      </form>
    </div>
  );
}
