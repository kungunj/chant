"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatKes } from "@/lib/format";

type Viewed = { id: string; title: string; priceKes: number; image: string | null };
const KEY = "spareshub:recently-viewed";
const MAX = 12;

function read(): Viewed[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Put on a product page: remembers the product in this browser (nothing is sent to the server). */
export function TrackView({ item }: { item: Viewed }) {
  useEffect(() => {
    try {
      const list = [item, ...read().filter((v) => v.id !== item.id)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // Private browsing or storage full: just don't remember it.
    }
  }, [item]);
  return null;
}

/** Products this browser looked at recently, newest first. */
export function RecentlyViewed() {
  const [items, setItems] = useState<Viewed[]>([]);
  useEffect(() => setItems(read()), []);
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Recently viewed</h2>
        <button
          type="button"
          className="text-xs text-stone-500 hover:text-stone-900"
          onClick={() => {
            try {
              localStorage.removeItem(KEY);
            } catch {}
            setItems([]);
          }}
        >
          Clear
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((v) => (
          <Link key={v.id} href={`/products/${v.id}`} className="card w-32 shrink-0 overflow-hidden hover:shadow-md">
            <div className="aspect-square bg-stone-100">
              {v.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.image} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="p-2 text-xs">
              <p className="line-clamp-2">{v.title}</p>
              <p className="mt-1 font-semibold text-accent-700">{formatKes(v.priceKes)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
