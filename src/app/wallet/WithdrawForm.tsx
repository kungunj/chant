"use client";

import { withdraw } from "@/app/actions/wallet";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function WithdrawForm({ phone, max }: { phone: string; max: number }) {
  return (
    <ActionForm action={withdraw} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="amountKes">Amount (KSh)</label>
          <input id="amountKes" name="amountKes" type="number" min={1} max={max} defaultValue={max || undefined} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">M-Pesa number</label>
          <input id="phone" name="phone" defaultValue={phone} required className="input" />
        </div>
        <SubmitButton className="btn-mpesa">Withdraw</SubmitButton>
      </div>
    </ActionForm>
  );
}
