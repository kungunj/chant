import Link from "next/link";
import { GoogleButton } from "@/components/GoogleButton";
import { LoginForm } from "./LoginForm";

const GOOGLE_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't finish. Please try again.",
  "google-off": "Google sign-in isn't set up yet. Log in with your email instead.",
  busy: "Too many attempts. Wait a few minutes and try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="card mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      {error && Object.hasOwn(GOOGLE_ERRORS, error) && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{GOOGLE_ERRORS[error]}</p>
      )}
      <GoogleButton next={next} />
      <LoginForm next={next} />
      <p className="mt-3 text-sm">
        <Link href="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
      </p>
      <p className="mt-2 text-sm text-stone-600">
        New here?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
