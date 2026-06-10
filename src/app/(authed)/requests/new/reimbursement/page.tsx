import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { ReimbursementForm } from "./reimbursement-form";

export const dynamic = "force-dynamic";

export default async function NewReimbursementPage() {
  const session = await requireSession();

  const advances = await prisma.request.findMany({
    where: {
      submitterId: session.user.id,
      type: "ADVANCE",
      status: { in: ["APPROVED", "DISBURSED"] },
      reimbursement: null,
    },
    orderBy: { tripStart: "desc" },
    select: { id: true, purpose: true, totalAmount: true, tripStart: true },
  });

  const options = advances.map((a) => ({
    id: a.id,
    purpose: a.purpose,
    totalAmount: a.totalAmount.toString(),
    tripStart: a.tripStart.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New reimbursement claim</h1>
          <p className="text-sm text-muted-foreground">
            Claim costs you&apos;ve already incurred. Attach receipts for each line item.
          </p>
        </div>
        <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to my requests
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claim details</CardTitle>
        </CardHeader>
        <CardContent>
          <ReimbursementForm availableAdvances={options} />
        </CardContent>
      </Card>
    </div>
  );
}
