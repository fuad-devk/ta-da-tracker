import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(...allowed: Role[]) {
  const session = await requireSession();
  const has = session.user.roles.some((r) => allowed.includes(r));
  if (!has) redirect("/dashboard");
  return session;
}

export async function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}

export function hasRole(roles: Role[], ...allowed: Role[]) {
  return roles.some((r) => allowed.includes(r));
}
