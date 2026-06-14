"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { parseCsv, toRecords } from "@/lib/csv";
import { MODALITIES } from "@/lib/validators";
import { DESIGNATIONS, bandFromDesignation } from "@/lib/policy";
import { Modality, Role } from "@prisma/client";

export type ParsedRow = {
  rowNumber: number;
  data: {
    employeeId: string;
    name: string;
    email: string;
    designation: string;
    department: string;
    modality: string;
    band: string; // derived
    lineManagerEmail: string;
  };
  errors: string[];
};

export type PreviewResult = {
  ok: boolean;
  rows: ParsedRow[];
  globalErrors: string[];
  csv: string;
};

export type CommitResult = {
  ok: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: { rowNumber: number; message: string }[];
};

const REQUIRED_HEADERS = [
  "Employee ID",
  "Name",
  "Email",
  "Designation",
  "Department",
  "Modality",
  "Line Manager Email",
];

const rowSchema = z.object({
  employeeId: z.string().min(1, "Employee ID required"),
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email"),
  designation: z.string().min(1, "Designation required").refine(
    (d) => bandFromDesignation(d) !== null,
    { message: `Designation must be one of: ${DESIGNATIONS.join(", ")}` }
  ),
  department: z.string().min(1, "Department required"),
  modality: z.enum(MODALITIES, { message: `Modality must be one of: ${MODALITIES.join(", ")}` }),
  lineManagerEmail: z.string().email("Invalid line manager email").optional().or(z.literal("")),
});

function normalizeModality(v: string): string {
  return v.trim().toUpperCase().replace(/[\s-]/g, "_");
}

export async function previewCsvAction(_prev: PreviewResult | undefined, fd: FormData): Promise<PreviewResult> {
  await requireSuperAdmin();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, rows: [], globalErrors: ["Please select a CSV file."], csv: "" };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { ok: false, rows: [], globalErrors: ["File is empty."], csv: "" };
  }

  const headers = rows[0].map((h) => h.trim());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      ok: false,
      rows: [],
      globalErrors: [`Missing required column(s): ${missing.join(", ")}`],
      csv: "",
    };
  }

  const records = toRecords(rows);

  const parsedRows: ParsedRow[] = records.map((r, idx) => {
    const designation = (r["Designation"] ?? "").trim();
    const normalized = {
      employeeId: r["Employee ID"] ?? "",
      name: r["Name"] ?? "",
      email: (r["Email"] ?? "").toLowerCase(),
      designation,
      department: r["Department"] ?? "",
      modality: normalizeModality(r["Modality"] ?? ""),
      lineManagerEmail: (r["Line Manager Email"] ?? "").toLowerCase(),
    };
    const result = rowSchema.safeParse(normalized);
    const errors = result.success
      ? []
      : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    const band = bandFromDesignation(designation) ?? "—";
    return {
      rowNumber: idx + 2,
      data: { ...normalized, band: String(band) },
      errors,
    };
  });

  // Cross-row: line manager email must exist either in DB or in this batch.
  const emailsInBatch = new Set(parsedRows.map((r) => r.data.email));
  const lmEmails = new Set(
    parsedRows
      .map((r) => r.data.lineManagerEmail)
      .filter((e) => e && !emailsInBatch.has(e))
  );
  const existingLm = lmEmails.size
    ? await prisma.user.findMany({
        where: { email: { in: Array.from(lmEmails) } },
        select: { email: true },
      })
    : [];
  const existingLmSet = new Set(existingLm.map((u) => u.email));

  for (const row of parsedRows) {
    const lm = row.data.lineManagerEmail;
    if (lm && !emailsInBatch.has(lm) && !existingLmSet.has(lm)) {
      row.errors.push(`lineManagerEmail: ${lm} not found in batch or existing users`);
    }
  }

  const hasErrors = parsedRows.some((r) => r.errors.length > 0);

  return {
    ok: !hasErrors,
    rows: parsedRows,
    globalErrors: [],
    csv: text,
  };
}

export async function commitCsvAction(csv: string): Promise<CommitResult> {
  await requireSuperAdmin();
  const rows = parseCsv(csv);
  const records = toRecords(rows);

  const result: CommitResult = { ok: true, created: 0, updated: 0, failed: 0, errors: [] };
  const allEmails = new Set<string>();

  for (let idx = 0; idx < records.length; idx++) {
    const r = records[idx];
    const rowNumber = idx + 2;
    const designation = (r["Designation"] ?? "").trim();
    const band = bandFromDesignation(designation);
    if (!band) {
      result.failed++;
      result.errors.push({ rowNumber, message: `Unknown designation: ${designation}` });
      continue;
    }
    const normalized = {
      employeeId: r["Employee ID"] ?? "",
      name: r["Name"] ?? "",
      email: (r["Email"] ?? "").toLowerCase(),
      designation,
      department: r["Department"] ?? "",
      modality: normalizeModality(r["Modality"] ?? "") as Modality,
      band,
      lineManagerEmail: (r["Line Manager Email"] ?? "").toLowerCase(),
    };

    try {
      const existing = await prisma.user.findUnique({ where: { email: normalized.email } });
      if (existing) {
        await prisma.user.update({
          where: { email: normalized.email },
          data: {
            employeeId: normalized.employeeId,
            name: normalized.name,
            designation: normalized.designation,
            department: normalized.department,
            modality: normalized.modality,
            band: normalized.band,
          },
        });
        result.updated++;
      } else {
        const tempPassword = await bcrypt.hash("Change123!", 10);
        await prisma.user.create({
          data: {
            employeeId: normalized.employeeId,
            name: normalized.name,
            email: normalized.email,
            designation: normalized.designation,
            department: normalized.department,
            modality: normalized.modality,
            band: normalized.band,
            passwordHash: tempPassword,
            roles: [Role.EMPLOYEE],
            mustChangePassword: true,
          },
        });
        result.created++;
      }
      allEmails.add(normalized.email);
    } catch (e) {
      result.failed++;
      result.errors.push({
        rowNumber,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  // Second pass: resolve line manager links.
  for (let idx = 0; idx < records.length; idx++) {
    const r = records[idx];
    const rowNumber = idx + 2;
    const email = (r["Email"] ?? "").toLowerCase();
    const lmEmail = (r["Line Manager Email"] ?? "").toLowerCase();
    if (!email || !allEmails.has(email)) continue;

    try {
      const lmId = lmEmail
        ? (await prisma.user.findUnique({ where: { email: lmEmail }, select: { id: true } }))?.id ?? null
        : null;
      await prisma.user.update({
        where: { email },
        data: { lineManagerId: lmId },
      });
    } catch (e) {
      result.errors.push({
        rowNumber,
        message: `Line manager link: ${e instanceof Error ? e.message : "Unknown error"}`,
      });
    }
  }

  if (result.failed > 0) result.ok = false;
  revalidatePath("/settings/employees");
  return result;
}
