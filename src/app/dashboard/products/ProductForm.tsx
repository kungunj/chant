"use client";

import type { Product } from "@prisma/client";
import { useState } from "react";
import { saveProduct } from "@/app/actions/store";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { categoryLabels, conditionLabels } from "@/lib/format";

export function ProductForm({ product }: { product?: Product }) {
  const [condition, setCondition] = useState<string>(product?.condition ?? "USED_WORKING");
  const [videoNote, setVideoNote] = useState<string | null>(null);
  const used = condition !== "NEW_SPARE";
  const uploaded = product?.imageUrls.filter((u) => u.startsWith("/api/images/")) ?? [];
  const links = product?.imageUrls.filter((u) => !u.startsWith("/api/images/")) ?? [];
  return (
    <ActionForm action={saveProduct} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          defaultValue={product?.title}
          required
          className="input"
          placeholder="e.g. Samsung UA43 TV power board"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="partNumber">
            Part / product number
          </label>
          <input
            id="partNumber"
            name="partNumber"
            defaultValue={product?.partNumber ?? ""}
            className="input font-mono"
            placeholder="BN44-00807A"
          />
        </div>
        <div>
          <label className="label" htmlFor="brand">
            Brand
          </label>
          <input id="brand" name="brand" defaultValue={product?.brand ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="modelName">
            Fits model
          </label>
          <input id="modelName" name="modelName" defaultValue={product?.modelName ?? ""} className="input" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Device type
          </label>
          <select id="category" name="category" defaultValue={product?.category ?? "LAPTOP"} className="input">
            {Object.entries(categoryLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="condition">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="input"
          >
            {Object.entries(conditionLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="priceKes">
            Price (KSh)
          </label>
          <input
            id="priceKes"
            name="priceKes"
            type="number"
            min={1}
            step={1}
            defaultValue={product?.priceKes}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="stock">
            Quantity in stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min={0}
            step={1}
            defaultValue={product?.stock ?? 1}
            required
            className="input"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="workingParts">
            What works{used ? "" : " (optional)"}
          </label>
          <textarea
            id="workingParts"
            name="workingParts"
            rows={3}
            required={used}
            defaultValue={product?.workingParts ?? ""}
            className="input"
            placeholder="e.g. Motherboard powers on, HDMI, USB and tuner tested"
          />
        </div>
        <div>
          <label className="label" htmlFor="faultyParts">
            What doesn&apos;t work{used ? "" : " (optional)"}
          </label>
          <textarea
            id="faultyParts"
            name="faultyParts"
            rows={3}
            required={used}
            defaultValue={product?.faultyParts ?? ""}
            className="input"
            placeholder={
              condition === "USED_FOR_PARTS" ? "e.g. Screen broken, remote missing" : 'e.g. Screen broken, or "None"'
            }
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="video">
          Video of the item working
        </label>
        {product?.videoUrl && (
          <div className="mb-2 flex items-center gap-3">
            <video src={product.videoUrl} className="h-24 rounded bg-black" muted preload="metadata" />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="keepVideo" defaultChecked /> Keep this video
            </label>
          </div>
        )}
        <input
          id="video"
          name="video"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          capture="environment"
          className="input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setVideoNote(null);
            if (!file) return;
            if (file.size > 25 * 1024 * 1024) {
              setVideoNote("This video is over 25 MB. Record a shorter clip (under a minute).");
              return;
            }
            const probe = document.createElement("video");
            probe.preload = "metadata";
            probe.onloadedmetadata = () => {
              URL.revokeObjectURL(probe.src);
              if (probe.duration > 60)
                setVideoNote("Keep the video under a minute; buyers only need to see it working.");
            };
            probe.src = URL.createObjectURL(file);
          }}
        />
        {videoNote && <p className="mt-1 text-xs text-amber-700">{videoNote}</p>}
        <p className="mt-1 text-xs text-stone-500">
          Where possible, record a short clip (under a minute, max 25 MB) showing the item powered on and working.
          Listings with a video show a ▶ badge and sell faster.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={product?.description ?? ""}
          className="input"
          placeholder="Which models it fits, how it was removed, anything else buyers should know…"
        />
      </div>
      {uploaded.length > 0 && (
        <div>
          <span className="label">Current photos (untick to remove)</span>
          <div className="flex flex-wrap gap-3">
            {uploaded.map((url) => (
              <label key={url} className="card flex w-28 flex-col items-center gap-1 overflow-hidden p-1 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
                <span className="flex items-center gap-1">
                  <input type="checkbox" name="keepImage" value={url} defaultChecked /> Keep
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="photos">
          Add photos
        </label>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="input"
        />
        <p className="mt-1 text-xs text-stone-500">Up to 8 photos, 5 MB each. Show labels and part numbers clearly.</p>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-stone-600">Or paste photo links</summary>
        <textarea
          id="imageUrls"
          name="imageUrls"
          rows={2}
          defaultValue={links.join("\n")}
          className="input mt-2 font-mono text-xs"
          placeholder="One https:// image link per line"
        />
      </details>
      <SubmitButton>{product ? "Save changes" : "Post product"}</SubmitButton>
    </ActionForm>
  );
}
