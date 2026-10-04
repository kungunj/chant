import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayPhone, formatKes, walletEntryLabels, withdrawalStatusLabels } from "@/lib/format";
import { heldInEscrowForSeller, walletBalance } from "@/lib/wallet";
import { WithdrawForm } from "./WithdrawForm";

export default async function WalletPage() {
  const user = await requireUser("/wallet");
  const [balance, held, entries, withdrawals] = await Promise.all([
    walletBalance(user.id),
    heldInEscrowForSeller(user.id),
    prisma.walletEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.withdrawal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Wallet</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-sm text-stone-500">Available to withdraw</p>
          <p className="text-2xl font-bold">{formatKes(balance)}</p>
        </div>
        {user.store && (
          <div className="card p-4">
            <p className="text-sm text-stone-500">Held in escrow</p>
            <p className="text-2xl font-bold text-stone-500">{formatKes(held)}</p>
            <p className="text-xs text-stone-500">Released to you when buyers confirm delivery.</p>
          </div>
        )}
      </div>

      <div className="card space-y-3 p-4">
        <h2 className="font-semibold">Withdraw to M-Pesa</h2>
        {balance > 0 ? (
          <WithdrawForm phone={user.phone ? displayPhone(user.phone) : ""} max={balance} />
        ) : (
          <p className="text-sm text-stone-500">Nothing to withdraw yet.</p>
        )}
      </div>

      {withdrawals.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Withdrawals</h2>
          <div className="card divide-y divide-stone-200 text-sm">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="flex-1">
                  {formatKes(w.amountKes)} to {displayPhone(w.phone)}
                  {w.reference && <span className="ml-2 font-mono text-xs text-stone-500">{w.reference}</span>}
                  {w.adminNote && <span className="block text-xs text-red-700">{w.adminNote}</span>}
                </span>
                <span className="badge">{withdrawalStatusLabels[w.status]}</span>
                <span className="text-xs text-stone-500">{w.createdAt.toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">History</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-stone-500">No transactions yet.</p>
        ) : (
          <div className="card divide-y divide-stone-200 text-sm">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="flex-1">
                  {walletEntryLabels[e.type]}
                  {e.orderId && (
                    <Link href={e.type === "REFUND" ? `/orders/${e.orderId}` : `/dashboard/orders/${e.orderId}`} className="ml-2 text-xs text-brand-600 hover:underline">
                      order
                    </Link>
                  )}
                  {e.note && <span className="block text-xs text-stone-500">{e.note}</span>}
                </span>
                <span className={e.amountKes < 0 ? "text-red-700" : "text-green-700"}>
                  {e.amountKes < 0 ? "−" : "+"}
                  {formatKes(Math.abs(e.amountKes))}
                </span>
                <span className="text-xs text-stone-500">{e.createdAt.toLocaleDateString("en-KE")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
