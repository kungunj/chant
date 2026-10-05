"use client";

import { useFormStatus } from "react-dom";
import { useActionFormPending } from "./ActionForm";

export function SubmitButton({
  children,
  pendingText,
  className = "btn-primary",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending: formPending } = useFormStatus();
  const actionFormPending = useActionFormPending();
  const pending = formPending || actionFormPending;
  return (
    <button type="submit" disabled={pending} className={className} name={name} value={value}>
      {pending ? (pendingText ?? "Please wait…") : children}
    </button>
  );
}
