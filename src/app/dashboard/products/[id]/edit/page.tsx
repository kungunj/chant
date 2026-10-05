import { notFound } from "next/navigation";
import { requireStore } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markupPercent } from "@/lib/pricing";
import { ProductForm } from "../../ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireStore();
  const product = await prisma.product.findFirst({ where: { id, storeId: store.id, deletedAt: null } });
  if (!product) notFound();
  return (
    <div className="card mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Edit product</h1>
      <ProductForm product={product} markupPercent={markupPercent()} />
    </div>
  );
}
