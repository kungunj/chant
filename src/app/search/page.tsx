import Link from "next/link";
import type { Condition, DeviceCategory } from "@prisma/client";
import { ProductCard } from "@/components/ProductCard";
import { prisma } from "@/lib/db";
import { categoryLabels, conditionLabels } from "@/lib/format";
import { buildProductWhere } from "@/lib/search";

const PAGE_SIZE = 24;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const category = sp.category && sp.category in categoryLabels ? (sp.category as DeviceCategory) : undefined;
  const condition = sp.condition && sp.condition in conditionLabels ? (sp.condition as Condition) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const price = (v: string | undefined) => (Number(v) > 0 ? Math.floor(Number(v)) : undefined);
  const minPriceKes = price(sp.min);
  const maxPriceKes = price(sp.max);
  const withVideo = sp.video === "1";
  const where = buildProductWhere({ q: sp.q, category, condition, minPriceKes, maxPriceKes, withVideo });
  const orderBy =
    sp.sort === "price_asc"
      ? { priceKes: "asc" as const }
      : sp.sort === "price_desc"
        ? { priceKes: "desc" as const }
        : { createdAt: "desc" as const };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { store: { select: { name: true } } },
      orderBy,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  const link = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, page: undefined, ...overrides })) if (v) params.set(k, v);
    return `/search?${params}`;
  };

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="space-y-5 text-sm">
        <form action="/search" className="space-y-3">
          <div>
            <label className="label" htmlFor="q">Name or part number</label>
            <input id="q" name="q" defaultValue={sp.q} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="category">Device</label>
            <select id="category" name="category" defaultValue={category ?? ""} className="input">
              <option value="">All devices</option>
              {Object.entries(categoryLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="condition">Condition</label>
            <select id="condition" name="condition" defaultValue={condition ?? ""} className="input">
              <option value="">Any condition</option>
              {Object.entries(conditionLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="label">Price (KSh)</legend>
            <div className="flex items-center gap-2">
              <input name="min" type="number" min={0} placeholder="Min" defaultValue={minPriceKes} className="input" aria-label="Minimum price" />
              <span className="text-stone-400">–</span>
              <input name="max" type="number" min={0} placeholder="Max" defaultValue={maxPriceKes} className="input" aria-label="Maximum price" />
            </div>
          </fieldset>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="video" value="1" defaultChecked={withVideo} /> Only items with a video
          </label>
          <div>
            <label className="label" htmlFor="sort">Sort</label>
            <select id="sort" name="sort" defaultValue={sp.sort ?? ""} className="input">
              <option value="">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
          <button className="btn-primary w-full">Apply</button>
        </form>
      </aside>

      <section>
        <p className="mb-4 text-sm text-stone-600">
          {total} {total === 1 ? "result" : "results"}
          {sp.q && <> for <strong>“{sp.q}”</strong></>}
          {category && <> in {categoryLabels[category]}</>}
        </p>
        {products.length === 0 ? (
          <div className="card p-6 text-sm text-stone-600">
            Nothing matches yet. Try fewer words, or just the part number without the brand.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} storeName={p.store.name} />
            ))}
          </div>
        )}
        {total > PAGE_SIZE && (
          <div className="mt-6 flex justify-center gap-3">
            {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn-secondary">Previous</Link>}
            {page * PAGE_SIZE < total && <Link href={link({ page: String(page + 1) })} className="btn-secondary">Next</Link>}
          </div>
        )}
      </section>
    </div>
  );
}
