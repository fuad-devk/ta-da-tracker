"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { uploadFile } from "@/lib/storage";
import { APP_SETTINGS_TAG } from "@/lib/app-settings";

export type BrandingState = {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
} | undefined;

const schema = z.object({
  platformName: z.string().min(1, "Platform name is required").max(60),
  organizationName: z.string().min(1, "Organization name is required").max(120),
});

export async function updateBrandingAction(
  _prev: BrandingState,
  fd: FormData
): Promise<BrandingState> {
  await requireSuperAdmin();

  const parsed = schema.safeParse({
    platformName: String(fd.get("platformName") ?? "").trim(),
    organizationName: String(fd.get("organizationName") ?? "").trim(),
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

  let newLogoUrl: string | null | undefined = undefined; // undefined = don't change
  if (clearLogo) {
    newLogoUrl = null;
  } else if (file instanceof File && file.size > 0) {
    try {
      const uploaded = await uploadFile(file, { folder: "branding" });
      newLogoUrl = uploaded.fileUrl;
    } catch (e) {
      return { fieldErrors: { logo: e instanceof Error ? e.message : "Upload failed" } };
    }
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      platformName: parsed.data.platformName,
      organizationName: parsed.data.organizationName,
      ...(newLogoUrl !== undefined ? { logoUrl: newLogoUrl } : {}),
    },
    create: {
      id: "default",
      platformName: parsed.data.platformName,
      organizationName: parsed.data.organizationName,
      logoUrl: newLogoUrl ?? null,
    },
  });

  revalidateTag(APP_SETTINGS_TAG);

  return { ok: true, message: "Branding updated." };
}
