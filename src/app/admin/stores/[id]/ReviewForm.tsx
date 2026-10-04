"use client";

import { reviewStore } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function ReviewForm({ storeId, status }: { storeId: string; status: string }) {
  return (
    <ActionForm action={reviewStore} className="space-y-3">
      <input type="hidden" name="storeId" value={storeId} />
      <div>
        <label className="label" htmlFor="note">Note to the seller (required to reject or suspend)</label>
        <textarea id="note" name="note" rows={2} className="input" />
      </div>
      <div className="flex flex-wrap gap-2">
        {(status === "PENDING_REVIEW" || status === "SUSPENDED") && (
          <SubmitButton name="decision" value="APPROVE">
            {status === "SUSPENDED" ? "Reinstate store" : "Approve store"}
          </SubmitButton>
        )}
        {status === "PENDING_REVIEW" && (
          <SubmitButton name="decision" value="REJECT" className="btn-danger">Reject</SubmitButton>
        )}
        {status === "APPROVED" && (
          <SubmitButton name="decision" value="SUSPEND" className="btn-danger">Suspend store</SubmitButton>
        )}
      </div>
    </ActionForm>
  );
}
