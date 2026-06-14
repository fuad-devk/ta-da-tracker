"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guards";
import {
  employeeCreateSchema,
  employeeUpdateSchema,
} from "@/lib/validators";
import { bandFromDesignation } from "@/lib/policy";
import { Modality, Role } from "@prisma/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const DEFAULT_PASSWORD = "Change123!";

function readForm(fd: FormData) {
  const obj: Record<string, string | string[]> = {};
  fd.forEach((v, k) => {
    if (typeof v !== "string") return;
    if (k === "roles") {
      const cur = obj[k];
      if (Array.isArray(cur)) cur.push(v);
      else if (typeof cur === "string") obj[k] = [cur, v];
      else obj[k] = [v];
    } else {
      obj[k] = v;
    }
  });
  if (!("roles" in obj)) obj.roles = [];
  return obj;
}

export async function createEmployeeAction(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  await requireSuperAdmin();
  const raw = readForm(fd);
  const parsed = employeeCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  const band = bandFromDesignation(data.designation);
  if (!band) return { fieldErrors: { designation: "Unknown designation" } };

  const password = data.password || DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const lineManager = data.lineManagerEmail
    ? await prisma.user.findUnique({ where: { email: data.lineManagerEmail.toLowerCase() } })
    : null;
  if (data.lineManagerEmail && !lineManager) {
    return { fieldErrors: { lineManagerEmail: "No user with that email" } };
  }

  const roles = Array.from(new Set([Role.EMPLOYEE, ...((data.roles ?? []) as Role[])]));

  try {
    await prisma.user.create({
      data: {
        employeeId: data.employeeId,
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        designation: data.designation,
        department: data.department,
        modality: data.modality as Modality,
        band,
        roles,
        lineManagerId: lineManager?.id ?? null,
        mustChangePassword: !data.password,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create employee";
    if (msg.includes("Unique constraint")) {
      return { error: "Email or Employee ID already exists." };
    }
    return { error: msg };
  }

  revalidatePath("/settings/employees");
  redirect("/settings/employees");
}

// NOTE: id is the LAST arg so we can .bind(null, id) and useActionState sees (prev, fd) signature.
export async function updateEmployeeAction(
  _prev: FormState,
  fd: FormData,
  id: string
): Promise<FormState> {
  await requireSuperAdmin();
  const raw = readForm(fd);
  const parsed = employeeUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { fieldErrors };
  }
  const data = parsed.data;
  const band = bandFromDesignation(data.designation);
  if (!band) return { fieldErrors: { designation: "Unknown designation" } };

  const lineManager = data.lineManagerEmail
    ? await prisma.user.findUnique({ where: { email: data.lineManagerEmail.toLowerCase() } })
    : null;
  if (data.lineManagerEmail && !lineManager) {
    return { fieldErrors: { lineManagerEmail: "No user with that email" } };
  }
  if (lineManager?.id === id) {
    return { fieldErrors: { lineManagerEmail: "Cannot be one's own line manager" } };
  }

  const roles = Array.from(new Set([Role.EMPLOYEE, ...((data.roles ?? []) as Role[])]));

  const updatePayload: Record<string, unknown> = {
    employeeId: data.employeeId,
    name: data.name,
    email: data.email.toLowerCase(),
    designation: data.designation,
    department: data.department,
    modality: data.modality as Modality,
    band,
    lineManagerId: lineManager?.id ?? null,
    roles,
  };

  if (data.password) {
    updatePayload.passwordHash = await bcrypt.hash(data.password, 10);
    updatePayload.mustChangePassword = false;
  }

  try {
    await prisma.user.update({ where: { id }, data: updatePayload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update employee";
    if (msg.includes("Unique constraint")) {
      return { error: "Email or Employee ID already exists." };
    }
    return { error: msg };
  }

  revalidatePath("/settings/employees");
  revalidatePath(`/settings/employees/${id}`);
  redirect("/settings/employees");
}

export async function deleteEmployeeAction(id: string) {
  await requireSuperAdmin();
  try {
    await prisma.user.delete({ where: { id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Foreign key")) {
      return { error: "Cannot delete: employee has submissions on file." };
    }
    throw e;
  }
  revalidatePath("/settings/employees");
  redirect("/settings/employees");
}
