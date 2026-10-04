import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { getSessionUserId } from "./session";

export const getCurrentUser = cache(async () => {
  const id = await getSessionUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, role: true, store: true },
  });
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** Technicians (sellers) must have opened a store to manage listings. */
export async function requireTechnician() {
  const user = await requireUser("/dashboard");
  if (user.role !== "TECHNICIAN" && user.role !== "ADMIN") redirect("/dashboard/become-seller");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export async function requireStore() {
  const user = await requireTechnician();
  if (!user.store) redirect("/dashboard/store");
  return { user, store: user.store };
}
