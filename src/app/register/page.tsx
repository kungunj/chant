import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; seller?: string }> }) {
  const { next, seller } = await searchParams;
  return (
    <div className="card mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold">Create your account</h1>
      <RegisterForm next={next} defaultRole={seller ? "TECHNICIAN" : "BUYER"} />
      <p className="mt-4 text-sm text-stone-600">
        Already have an account? <Link href="/login" className="text-brand-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
