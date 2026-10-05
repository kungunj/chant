import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayPhone, formatKes, withdrawalStatusLabels } from "@/lib/format";
import { WithdrawalActions } from "./WithdrawalActions";

export default async function AdminWithdrawalsPage() {
  await requireAdmin();
  const withdrawals = await prisma.withdrawal.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 100,
  });
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Send the money from the SparesHub M-Pesa account (B2C or the M-Pesa app), then record the transaction code here.
        Rejecting returns the money to the user&apos;s wallet.
      </p>
      {withdrawals.length === 0 ? (
        <p className="text-sm text-stone-500">No withdrawal requests.</p>
      ) : (
        <div className="card divide-y divide-stone-200 text-sm">
          {withdrawals.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-4 p-3">
              <span className="flex-1">
                <strong>{formatKes(w.amountKes)}</strong> to {displayPhone(w.phone)}
                <span className="block text-xs text-stone-500">
                  {w.user.name} · {w.user.email} · {w.createdAt.toLocaleString("en-KE")}
                </span>
              </span>
              {w.status === "REQUESTED" ? (
                <WithdrawalActions id={w.id} />
              ) : (
                <span className="badge">
                  {withdrawalStatusLabels[w.status]} {w.reference ?? w.adminNote ?? ""}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
