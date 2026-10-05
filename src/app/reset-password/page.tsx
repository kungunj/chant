import Link from "next/link";
import { resetPassword } from "@/app/actions/password";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <div className="card mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold">Set a new password</h1>
      <p className="text-sm text-stone-600">
        If an account exists for {email || "that email"}, we have sent a 6-digit code to its phone number.
      </p>
      <ActionForm action={resetPassword} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label className="label" htmlFor="code">Code from SMS</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="input font-mono tracking-widest" />
        </div>
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" />
        </div>
        <SubmitButton className="btn-primary w-full">Reset password</SubmitButton>
      </ActionForm>
      <Link href="/forgot-password" className="text-sm text-brand-600 hover:underline">Send a new code</Link>
    </div>
  );
}
