"use client";

import type { Product } from "@prisma/client";
import { saveProduct } from "@/app/actions/store";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { categoryLabels, conditionLabels } from "@/lib/format";

export function ProductForm({ product }: { product?: Product }) {
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
      <div>
        <label className="label" htmlFor="imageUrls">Photo links</label>
        <textarea id="imageUrls" name="imageUrls" rows={2} defaultValue={product?.imageUrls.join("\n") ?? ""} className="input font-mono text-xs" placeholder="One https:// image link per line" />
      </div>
      <SubmitButton>{product ? "Save changes" : "Post product"}</SubmitButton>
    </ActionForm>
  );
}
