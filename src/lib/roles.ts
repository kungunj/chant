import type { Role } from "@prisma/client";

/** Moderator (ADMIN) accounts allowed at once; the single super admin is not counted. */
export const MAX_MODERATORS = 3;

export const roleLabels: Record<Role, string> = {
  BUYER: "Buyer",
  TECHNICIAN: "Technician",
  ADMIN: "Moderator",
  SUPER_ADMIN: "Super admin",
};

/** Moderators and the super admin: everyone who can review stores, disputes and withdrawals. */
export function isStaff(role: Role | string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
