import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-4 border-b border-stone-200 pb-3 text-sm font-medium">
        <span className="text-stone-400">Admin</span>
        <Link href="/admin" className="hover:text-brand-600">Store approvals</Link>
        <Link href="/admin/disputes" className="hover:text-brand-600">Disputes</Link>
        <Link href="/admin/withdrawals" className="hover:text-brand-600">Withdrawals</Link>
        {user.role === "SUPER_ADMIN" && <Link href="/admin/team" className="hover:text-brand-600">Team</Link>}
      </nav>
      {children}
    </div>
  );
}
