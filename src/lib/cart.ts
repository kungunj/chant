import { cookies } from "next/headers";

const COOKIE = "spareshub_cart";

/** productId -> quantity */
export type Cart = Record<string, number>;

export async function readCart(): Promise<Cart> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const cart: Cart = {};
    for (const [id, qty] of Object.entries(parsed)) {
      if (typeof qty === "number" && Number.isInteger(qty) && qty > 0) cart[id] = Math.min(qty, 99);
    }
    return cart;
  } catch {
    return {};
  }
}

export async function writeCart(cart: Cart) {
  const store = await cookies();
  if (Object.keys(cart).length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function cartCount(cart: Cart) {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}
