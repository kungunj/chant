import { requireStore } from "@/lib/auth";
import { ProductForm } from "../ProductForm";

export default async function NewProductPage() {
  await requireStore();
  return (
    <div className="card mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Post a product</h1>
      <ProductForm />
    </div>
  );
}
