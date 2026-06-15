import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type AppSettings = {
  platformName: string;
  organizationName: string;
  logoUrl: string | null;
};

const DEFAULTS: AppSettings = {
  platformName: "TA/DA Tracker",
  organizationName: "10 Minute School",
  logoUrl: null,
};

async function loadAppSettings(): Promise<AppSettings> {
  try {
    const row = await prisma.appSettings.findUnique({ where: { id: "default" } });
    if (!row) return DEFAULTS;
    return {
      platformName: row.platformName,
      organizationName: row.organizationName,
      logoUrl: row.logoUrl,
    };
  } catch {
    return DEFAULTS;
  }
}

// Cached read — invalidated by tag when settings are updated.
export const getAppSettings = unstable_cache(
  loadAppSettings,
  ["app-settings"],
  { tags: ["app-settings"], revalidate: 300 }
);

export const APP_SETTINGS_TAG = "app-settings";
