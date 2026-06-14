import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdvanceForm } from "./advance-form";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { aaCeilingFor, daRateFor } from "@/lib/policy";

export const dynamic = "force-dynamic";

export default async function NewAdvancePage() {
  const session = await requireSession();
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { band: true },
  });

  const band = me?.band ?? "G";
  const cityDaRate = daRateFor(band, "CITY");
  const intercityDaRate = daRateFor(band, "INTERCITY");
  const aaCeiling = aaCeilingFor(band);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New advance request</h1>
          <p className="text-sm text-muted-foreground">
            Request money before incurring travel costs.
          </p>
        </div>
        <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to my requests
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request details</CardTitle>
        </CardHeader>
        <CardContent>
          <AdvanceForm caps={{ band, cityDaRate, intercityDaRate, aaCeiling }} />
        </CardContent>
      </Card>
    </div>
  );
}
