"use client";

import type { Product } from "@prisma/client";
import { saveProduct } from "@/app/actions/store";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { categoryLabels, conditionLabels } from "@/lib/format";

export function ProductForm({ product }: { product?: Product }) {
  const uploaded = product?.imageUrls.filter((u) => u.startsWith("/api/images/")) ?? [];
  const links = product?.imageUrls.filter((u) => !u.startsWith("/api/images/")) ?? [];
  return (
    <ActionForm action={saveProduct} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={product?.title} required className="input" placeholder="e.g. Samsung UA43 TV power board" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="partNumber">Part / product number</label>
          <input id="partNumber" name="partNumber" defaultValue={product?.partNumber ?? ""} className="input font-mono" placeholder="BN44-00807A" />
        </div>
        <div>
          <label className="label" htmlFor="brand">Brand</label>
          <input id="brand" name="brand" defaultValue={product?.brand ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="modelName">Fits model</label>
          <input id="modelName" name="modelName" defaultValue={product?.modelName ?? ""} className="input" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">Device type</label>
          <select id="category" name="category" defaultValue={product?.category ?? "LAPTOP"} className="input">
            {Object.entries(categoryLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="condition">Condition</label>
          <select id="condition" name="condition" defaultValue={product?.condition ?? "USED_WORKING"} className="input">
            {Object.entries(conditionLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="priceKes">Price (KSh)</label>
          <input id="priceKes" name="priceKes" type="number" min={1} step={1} defaultValue={product?.priceKes} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="stock">Quantity in stock</label>
          <input id="stock" name="stock" type="number" min={0} step={1} defaultValue={product?.stock ?? 1} required className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={5} defaultValue={product?.description ?? ""} className="input" placeholder="What works, what was tested, which models it fits…" />
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
        <label className="label" htmlFor="photos">Add photos</label>
        <input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="input" />
        <p className="mt-1 text-xs text-stone-500">Up to 8 photos, 8 MB each. Show labels and part numbers clearly.</p>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-stone-600">Or paste photo links</summary>
        <textarea id="imageUrls" name="imageUrls" rows={2} defaultValue={links.join("\n")} className="input mt-2 font-mono text-xs" placeholder="One https:// image link per line" />
      </details>
      <SubmitButton>{product ? "Save changes" : "Post product"}</SubmitButton>
    </ActionForm>
  );
}
