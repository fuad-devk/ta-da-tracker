import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type AppSettings = {
  platformName: string;
  organizationName: string;
  hasLogo: boolean;
  logoVersion: number;
  logoHeightPx: number;
};

const DEFAULTS: AppSettings = {
  platformName: "TA/DA Tracker",
  organizationName: "10 Minute School",
  hasLogo: false,
  logoVersion: 0,
  logoHeightPx: 32,
};

async function loadAppSettings(): Promise<AppSettings> {
  try {
    const row = await prisma.appSettings.findUnique({
      where: { id: "default" },
      select: {
        platformName: true,
        organizationName: true,
        logoData: true,
        logoVersion: true,
        logoHeightPx: true,
      },
    });
    if (!row) return DEFAULTS;
    return {
      platformName: row.platformName,
      organizationName: row.organizationName,
      hasLogo: !!row.logoData,
      logoVersion: row.logoVersion,
      logoHeightPx: row.logoHeightPx,
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
