"use client";

import { addModerator, removeModerator } from "@/app/actions/team";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function AddModeratorForm() {
  return (
    <ActionForm action={addModerator} className="flex flex-wrap gap-2">
      <input name="email" type="email" placeholder="their@email.com" required className="input w-64" />
      <SubmitButton className="btn-primary">Make moderator</SubmitButton>
    </ActionForm>
  );
}

export function RemoveModeratorButton({ userId }: { userId: string }) {
  return (
    <ActionForm action={removeModerator}>
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton className="btn-danger py-1">Remove</SubmitButton>
    </ActionForm>
  );
}
