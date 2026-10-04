"use client";

import { register } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function RegisterForm({ next, defaultRole }: { next?: string; defaultRole: "BUYER" | "TECHNICIAN" }) {
  return (
    <ActionForm action={register} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <fieldset className="grid grid-cols-2 gap-2 text-sm">
        <legend className="label">I want to</legend>
        <label className="card flex cursor-pointer items-center gap-2 p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
          <input type="radio" name="role" value="BUYER" defaultChecked={defaultRole === "BUYER"} /> Buy parts
        </label>
        <label className="card flex cursor-pointer items-center gap-2 p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
          <input type="radio" name="role" value="TECHNICIAN" defaultChecked={defaultRole === "TECHNICIAN"} /> Sell as a technician
        </label>
      </fieldset>
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" required className="input" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="phone">M-Pesa phone number</label>
        <input id="phone" name="phone" required placeholder="0712 345 678" className="input" autoComplete="tel" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" />
      </div>
      <SubmitButton className="btn-primary w-full">Create account</SubmitButton>
    </ActionForm>
  );
}
