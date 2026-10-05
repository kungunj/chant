"use client";

import { useEffect, useRef, useState } from "react";

/** Main photo with thumbnails underneath; clicking the photo opens it full screen. */
export function ProductGallery({ urls, title }: { urls: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const current = urls[index];

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % urls.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + urls.length) % urls.length);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [urls.length]);

  if (!current) {
    return <div className="card flex aspect-square items-center justify-center text-stone-400">No photo</div>;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="card block aspect-square w-full cursor-zoom-in overflow-hidden"
        aria-label="Open photo full screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={title} className="h-full w-full object-contain" />
      </button>
      {urls.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(i)}
              onMouseEnter={() => setIndex(i)}
              className={`card aspect-square overflow-hidden ${i === index ? "ring-2 ring-brand-600" : "opacity-80 hover:opacity-100"}`}
              aria-label={`Photo ${i + 1} of ${urls.length}`}
              aria-current={i === index}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto max-h-[95vh] max-w-[95vw] bg-transparent p-0 backdrop:bg-black/80"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={title} className="max-h-[90vh] max-w-[95vw] object-contain" />
        <div className="mt-2 flex justify-center gap-3">
          {urls.length > 1 && (
            <button type="button" className="btn-secondary" onClick={() => setIndex((i) => (i - 1 + urls.length) % urls.length)}>
              ← Previous
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => dialog.current?.close()}>
            Close
          </button>
          {urls.length > 1 && (
            <button type="button" className="btn-secondary" onClick={() => setIndex((i) => (i + 1) % urls.length)}>
              Next →
            </button>
          )}
        </div>
      </dialog>
    </div>
  );
}
