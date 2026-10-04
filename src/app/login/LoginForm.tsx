"use client";

import { login } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={login} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
      </div>
      <SubmitButton className="btn-primary w-full">Log in</SubmitButton>
    </ActionForm>
  );
}
