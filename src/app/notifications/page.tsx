import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  // Opening the page counts as reading them; unread ones stay highlighted for this view.
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      {notifications.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing yet.</p>
      ) : (
        <div className="card divide-y divide-stone-200">
          {notifications.map((n) => {
            const content = (
              <>
                <p className="flex items-center gap-2 font-medium">
                  {!n.readAt && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                  {n.title}
                </p>
                <p className="text-stone-600">{n.body}</p>
                <p className="text-xs text-stone-400">
                  {n.createdAt.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" })}
                </p>
              </>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className={`block p-3 text-sm hover:bg-stone-50 ${n.readAt ? "" : "bg-brand-50/50"}`}>
                {content}
              </Link>
            ) : (
              <div key={n.id} className="p-3 text-sm">{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
