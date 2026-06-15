"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { APP_SETTINGS_TAG } from "@/lib/app-settings";

export type BrandingState = {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
} | undefined;

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  platformName: z.string().min(1, "Platform name is required").max(60),
  organizationName: z.string().min(1, "Organization name is required").max(120),
  logoHeightPx: z.coerce.number().int().min(16).max(96),
});

export async function updateBrandingAction(
  _prev: BrandingState,
  fd: FormData
): Promise<BrandingState> {
  await requireSuperAdmin();

  const parsed = schema.safeParse({
    platformName: String(fd.get("platformName") ?? "").trim(),
    organizationName: String(fd.get("organizationName") ?? "").trim(),
    logoHeightPx: String(fd.get("logoHeightPx") ?? "32"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { fieldErrors };
  }

  const clearLogo = fd.get("clearLogo") === "on";
  const file = fd.get("logo");

  // Build the logo-related update payload only if logo is being changed.
  let logoFields:
    | { logoData: Buffer | null; logoMimeType: string | null; logoVersion: { increment: 1 } }
    | undefined;

  if (clearLogo) {
    logoFields = {
      logoData: null,
      logoMimeType: null,
      logoVersion: { increment: 1 },
    };
  } else if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { fieldErrors: { logo: "Only image files are allowed" } };
    }
    if (file.size > MAX_LOGO_BYTES) {
      return { fieldErrors: { logo: `Logo exceeds 5 MB limit (${Math.round(file.size / 1024)} KB).` } };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    logoFields = {
      logoData: buffer,
      logoMimeType: file.type,
      logoVersion: { increment: 1 },
    };
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      platformName: parsed.data.platformName,
      organizationName: parsed.data.organizationName,
      logoHeightPx: parsed.data.logoHeightPx,
      ...(logoFields ?? {}),
    },
    create: {
      id: "default",
      platformName: parsed.data.platformName,
      organizationName: parsed.data.organizationName,
      logoHeightPx: parsed.data.logoHeightPx,
      ...(logoFields
        ? {
            logoData: logoFields.logoData,
            logoMimeType: logoFields.logoMimeType,
            logoVersion: 1,
          }
        : {}),
    },
  });

  revalidateTag(APP_SETTINGS_TAG);

  return { ok: true, message: "Branding updated." };
}
