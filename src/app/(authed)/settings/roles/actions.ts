"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { Role } from "@prisma/client";

const ASSIGNABLE: Role[] = [Role.ADMIN_MANAGER, Role.FINANCE_MANAGER, Role.SUPER_ADMIN];

export async function updateUserRolesAction(userId: string, fd: FormData) {
  const session = await requireSuperAdmin();
  const selected = ASSIGNABLE.filter((r) => fd.get(r) === "on");
  const roles = Array.from(new Set([Role.EMPLOYEE, ...selected]));

  // Prevent locking out the only super admin
  if (userId === session.user.id && !roles.includes(Role.SUPER_ADMIN)) {
    const otherAdmins = await prisma.user.count({
      where: { roles: { has: Role.SUPER_ADMIN }, NOT: { id: userId } },
    });
    if (otherAdmins === 0) {
      throw new Error("Cannot remove your own super admin role — no other super admin exists.");
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { roles } });
  revalidatePath("/settings/roles");
}
