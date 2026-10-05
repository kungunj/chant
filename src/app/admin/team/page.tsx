import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_MODERATORS } from "@/lib/roles";
import { AddModeratorForm, RemoveModeratorButton } from "./TeamForms";

export default async function AdminTeamPage() {
  const me = await requireSuperAdmin();
  const moderators = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Moderators review store applications, moderate disputes and pay out withdrawals. Only you, the super admin, can
        add or remove them. You can have up to {MAX_MODERATORS}.
      </p>
      <div className="card divide-y divide-stone-200 text-sm">
        <div className="flex flex-wrap items-center gap-4 p-3">
          <span className="flex-1">
            <strong>{me.name}</strong> <span className="text-stone-500">· {me.email}</span>
          </span>
          <span className="badge">Super admin</span>
        </div>
        {moderators.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-4 p-3">
            <span className="flex-1">
              <strong>{m.name}</strong> <span className="text-stone-500">· {m.email}</span>
            </span>
            <span className="badge">Moderator</span>
            <RemoveModeratorButton userId={m.id} />
          </div>
        ))}
      </div>
      <p className="text-sm text-stone-500">
        {moderators.length} of {MAX_MODERATORS} moderator places used.
      </p>
      {moderators.length < MAX_MODERATORS && (
        <div className="space-y-2">
          <h2 className="font-semibold">Add a moderator</h2>
          <p className="text-sm text-stone-600">They need a SparesHub buyer account first. Sellers can&apos;t be moderators.</p>
          <AddModeratorForm />
        </div>
      )}
    </div>
  );
}
