"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatKes } from "@/lib/format";

type Suggestion = { id: string; title: string; partNumber: string | null; priceKes: number; image: string | null };

/** Search box with live suggestions as you type; arrow keys and Enter pick one. */
export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) {
          setItems(await res.json());
          setActive(-1);
        }
      } catch {
        // Aborted by the next keystroke, or offline: keep the plain search working.
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const showList = open && items.length > 0;

  return (
    <form action="/search" className="relative flex" ref={box} role="search">
      <input
        name="q"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            setOpen(false);
            router.push(`/products/${items[active].id}`);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search by part name or number, e.g. BN44-00807A or HP 15 hinge"
        className="input rounded-r-none"
        aria-label="Search products"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      />
      <button className="btn-primary rounded-l-none">Search</button>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg"
        >
          {items.map((item, i) => (
            <li
              key={item.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                router.push(`/products/${item.id}`);
              }}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${i === active ? "bg-brand-50" : ""}`}
            >
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-stone-100">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.title}</span>
                {item.partNumber && <span className="block font-mono text-xs text-stone-500">P/N {item.partNumber}</span>}
              </span>
              <span className="font-medium">{formatKes(item.priceKes)}</span>
            </li>
          ))}
          <li className="border-t border-stone-100 px-3 py-2 text-xs text-stone-500">Press Enter to see all results</li>
        </ul>
      )}
    </form>
  );
}
