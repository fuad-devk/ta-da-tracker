import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const row = await prisma.appSettings.findUnique({
    where: { id: "default" },
    select: { logoData: true, logoMimeType: true },
  });

  if (!row?.logoData) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = Buffer.from(row.logoData);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": row.logoMimeType ?? "image/png",
      // Cache for 1 hour; cache-busted by ?v= query param on the <img src>.
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
