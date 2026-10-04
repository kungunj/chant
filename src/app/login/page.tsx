import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="card mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <LoginForm next={next} />
      <p className="mt-4 text-sm text-stone-600">
        New here?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
