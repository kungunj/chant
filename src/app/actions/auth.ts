"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeKenyanPhone } from "@/lib/phone";
import { createSession, destroySession } from "@/lib/session";
import type { FormState } from "./types";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["BUYER", "TECHNICIAN"]),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, role } = parsed.data;
  const phone = normalizeKenyanPhone(parsed.data.phone);
  if (!phone) return { error: "Enter a valid Safaricom/Kenyan mobile number, e.g. 0712 345 678" };

  if (await prisma.user.findUnique({ where: { email } })) return { error: "An account with that email already exists" };

  const user = await prisma.user.create({
    data: { name, email, phone, role, passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect(role === "TECHNICIAN" ? "/dashboard/store" : safeNext(formData.get("next")));
}

// Failed logins per email, to slow down password guessing. In-memory, so per server instance.
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const record = failures.get(email);
  if (record && record.count >= MAX_FAILURES && record.until > Date.now()) {
    return { error: "Too many attempts. Wait 15 minutes or reset your password." };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const count = record && record.until > Date.now() ? record.count + 1 : 1;
    failures.set(email, { count, until: Date.now() + LOCK_MS });
    return { error: "Wrong email or password" };
  }
  failures.delete(email);
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
