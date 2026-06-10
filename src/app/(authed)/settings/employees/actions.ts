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
import { Band, Modality, Role } from "@prisma/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const DEFAULT_PASSWORD = "Change123!";

function formToObject(fd: FormData) {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : "";
  });
  return obj;
}

export async function createEmployeeAction(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  await requireSuperAdmin();
  const raw = formToObject(fd);
  const parsed = employeeCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  const password = data.password || DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const lineManager = data.lineManagerEmail
    ? await prisma.user.findUnique({ where: { email: data.lineManagerEmail.toLowerCase() } })
    : null;

  if (data.lineManagerEmail && !lineManager) {
    return { fieldErrors: { lineManagerEmail: "No user with that email" } };
  }

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
        band: data.band as Band,
        roles: [Role.EMPLOYEE],
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

export async function updateEmployeeAction(
  id: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  await requireSuperAdmin();
  const raw = formToObject(fd);
  const parsed = employeeUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;

  const lineManager = data.lineManagerEmail
    ? await prisma.user.findUnique({ where: { email: data.lineManagerEmail.toLowerCase() } })
    : null;
  if (data.lineManagerEmail && !lineManager) {
    return { fieldErrors: { lineManagerEmail: "No user with that email" } };
  }
  if (lineManager?.id === id) {
    return { fieldErrors: { lineManagerEmail: "Cannot be one's own line manager" } };
  }

  const updatePayload: Record<string, unknown> = {
    employeeId: data.employeeId,
    name: data.name,
    email: data.email.toLowerCase(),
    designation: data.designation,
    department: data.department,
    modality: data.modality as Modality,
    band: data.band as Band,
    lineManagerId: lineManager?.id ?? null,
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
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings/employees");
}
