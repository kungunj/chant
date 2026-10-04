"use client";

import { markWithdrawalPaid, rejectWithdrawal } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function WithdrawalActions({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ActionForm action={markWithdrawalPaid} className="flex flex-wrap gap-2">
        <input type="hidden" name="withdrawalId" value={id} />
        <input name="reference" placeholder="M-Pesa code" required className="input w-36 font-mono" />
        <SubmitButton className="btn-primary py-1">Mark paid</SubmitButton>
      </ActionForm>
      <ActionForm action={rejectWithdrawal} className="flex flex-wrap gap-2">
        <input type="hidden" name="withdrawalId" value={id} />
        <input name="note" placeholder="Reason" required className="input w-36" />
        <SubmitButton className="btn-danger py-1">Reject</SubmitButton>
      </ActionForm>
    </div>
  );
}
