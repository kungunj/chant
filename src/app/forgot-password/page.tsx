import { requestPasswordReset } from "@/app/actions/password";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default function ForgotPasswordPage() {
  return (
    <div className="card mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold">Forgot your password?</h1>
      <p className="text-sm text-stone-600">Enter your email and we will text a reset code to the phone number on your account.</p>
      <ActionForm action={requestPasswordReset} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <SubmitButton className="btn-primary w-full">Send code</SubmitButton>
      </ActionForm>
    </div>
  );
}
