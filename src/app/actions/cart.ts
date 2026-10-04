"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readCart, writeCart } from "@/lib/cart";

export async function addToCart(formData: FormData) {
  const id = String(formData.get("productId") ?? "");
  const qty = Math.max(1, Math.min(99, Number(formData.get("quantity") ?? 1) || 1));
  const cart = await readCart();
  cart[id] = Math.min(99, (cart[id] ?? 0) + qty);
  await writeCart(cart);
  redirect("/cart");
}

export async function updateCartItem(formData: FormData) {
  const id = String(formData.get("productId") ?? "");
  const qty = Math.floor(Number(formData.get("quantity") ?? 0));
  const cart = await readCart();
  if (qty > 0) cart[id] = Math.min(99, qty);
  else delete cart[id];
  await writeCart(cart);
  revalidatePath("/cart");
}
