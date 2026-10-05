import Link from "next/link";
import { notFound } from "next/navigation";
import { retryPayment } from "@/app/actions/checkout";
import { retryNameCheck } from "@/app/actions/verification";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKes, paymentStatusLabels } from "@/lib/format";
import { PaymentStatusPoller } from "./PaymentStatus";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/payments/${id}`);
  const payment = await prisma.payment.findFirst({
    where: { id, userId: user.id },
    include: { orders: { include: { store: { select: { name: true } } } } },
  });
  if (!payment) notFound();
  const nameCheck = payment.purpose === "NAME_CHECK";

  return (
    <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{nameCheck ? "Confirm your M-Pesa name" : "M-Pesa payment"}</h1>
      {nameCheck && (
        <p className="text-sm text-stone-600">
          Approve the KSh 1 prompt on your phone. Safaricom then tells us the name your M-Pesa line is registered
          in, and we check it matches your ID.
        </p>
      )}
      <p className="text-3xl font-bold">{formatKes(payment.amountKes)}</p>
      <p className="text-sm text-stone-600">to be paid from {`0${payment.phone.slice(3)}`}</p>

      <p
        className={`badge text-sm ${
          payment.status === "SUCCESS"
            ? "bg-green-100 text-green-800"
            : payment.status === "PENDING"
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
        }`}
      >
        {paymentStatusLabels[payment.status]}
      </p>

      {payment.status === "PENDING" && <PaymentStatusPoller paymentId={payment.id} />}

      {payment.status === "SUCCESS" && nameCheck && (
        <div className="space-y-3 text-sm">
          <p className="text-stone-600">
            Thanks. A SparesHub moderator will review your ID and M-Pesa name, and your listings go live once you are
            approved.
          </p>
          <Link href="/dashboard" className="btn-primary">Back to my listings</Link>
        </div>
      )}

      {payment.status === "SUCCESS" && !nameCheck && (
        <div className="space-y-3 text-sm">
          {payment.mpesaReceipt && (
            <p>
              M-Pesa receipt <span className="font-mono font-semibold">{payment.mpesaReceipt}</span>
            </p>
          )}
          <p className="text-stone-600">
            Your money is held safely by SparesHub and only released to the seller after you confirm you received
            the item. The seller will now ship your order.
          </p>
          <Link href="/orders" className="btn-primary">View my orders</Link>
        </div>
      )}

      {(payment.status === "FAILED" || payment.status === "CANCELLED") && (
        <div className="space-y-3 text-sm">
          {payment.resultDesc && <p className="text-stone-600">{payment.resultDesc}</p>}
          {nameCheck && (
            <form action={retryNameCheck} className="space-y-2">
              <input name="mpesaPhone" defaultValue={`0${payment.phone.slice(3)}`} className="input text-center" />
              <SubmitButton className="btn-mpesa w-full" pendingText="Sending M-Pesa prompt…">
                Send the prompt again
              </SubmitButton>
            </form>
          )}
          {payment.orders.length > 0 && (
            <form action={retryPayment} className="space-y-2">
              <input type="hidden" name="paymentId" value={payment.id} />
              <input name="mpesaPhone" defaultValue={`0${payment.phone.slice(3)}`} className="input text-center" />
              <SubmitButton className="btn-mpesa w-full" pendingText="Sending M-Pesa prompt…">
                Try again
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
