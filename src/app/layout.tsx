import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { SearchBar } from "@/components/SearchBar";
import { getCurrentUser } from "@/lib/auth";
import { cartCount, readCart } from "@/lib/cart";
import "./globals.css";

export const metadata: Metadata = {
  title: "SparesHub – spares and used parts for technicians",
  description:
    "Buy and sell spares and used parts for laptops, TVs, radios, phones and car electronics. Pay with M-Pesa, delivered by Posta Kenya or Fargo Courier.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, cart] = await Promise.all([getCurrentUser(), readCart()]);
  const count = cartCount(cart);

  return (
    <html lang="en">
      <body>
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
            <Link href="/" className="text-xl font-bold text-brand-600">
              Spares<span className="text-stone-900">Hub</span>
            </Link>
            <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
              <SearchBar />
            </div>
            <nav className="ml-auto flex items-center gap-4 text-sm">
              <Link href="/track" className="hover:text-brand-600">Track parcel</Link>
              <Link href="/cart" className="hover:text-brand-600">
                Cart{count > 0 && <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-xs text-white">{count}</span>}
              </Link>
              {user ? (
                <>
                  <Link href="/orders" className="hover:text-brand-600">My orders</Link>
                  <Link href="/wallet" className="hover:text-brand-600">Wallet</Link>
                  {user.role === "ADMIN" && <Link href="/admin" className="hover:text-brand-600">Admin</Link>}
                  <Link href="/dashboard" className="hover:text-brand-600">
                    {user.role === "BUYER" ? "Sell" : "My store"}
                  </Link>
                  <form action={logout}>
                    <button className="text-stone-500 hover:text-stone-900">Log out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-brand-600">Log in</Link>
                  <Link href="/register" className="btn-primary py-1.5">Sign up</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mt-12 border-t border-stone-200 py-6 text-center text-xs text-stone-500">
          SparesHub · Payments by M-Pesa · Delivery by Posta Kenya and Fargo Courier
        </footer>
      </body>
    </html>
  );
}
