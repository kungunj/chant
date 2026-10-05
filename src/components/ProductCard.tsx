import Link from "next/link";
import type { Product } from "@prisma/client";
import { conditionLabels, formatKes } from "@/lib/format";
import { buyerPrice } from "@/lib/pricing";

export function ProductCard({ product, storeName }: { product: Product; storeName?: string }) {
  return (
    <Link href={`/products/${product.id}`} className="card group flex flex-col overflow-hidden hover:shadow-md">
      <div className="relative aspect-square bg-stone-100">
        {product.videoUrl && (
          <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">▶ Video</span>
        )}
        {product.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrls[0]} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-stone-400">No photo</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium group-hover:text-brand-600">{product.title}</h3>
        {product.partNumber && <p className="font-mono text-xs text-stone-500">P/N {product.partNumber}</p>}
        <p className="mt-auto pt-1 font-semibold text-accent-700">{formatKes(buyerPrice(product.priceKes))}</p>
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{conditionLabels[product.condition]}</span>
          {storeName && <span className="truncate pl-2">{storeName}</span>}
        </div>
      </div>
    </Link>
  );
}
