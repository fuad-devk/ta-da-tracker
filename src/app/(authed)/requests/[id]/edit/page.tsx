import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditForm } from "./edit-form";
import { RequestStatus } from "@prisma/client";
import type { ClaimItem } from "../../_components/claim-items-editor";

function toDateInput(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const req = await prisma.request.findUnique({
    where: { id },
    include: {
      claimItems: { include: { receipts: true } },
      approvals: { include: { actor: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!req) notFound();
  if (req.submitterId !== session.user.id) redirect(`/requests/${id}`);
  if (req.status !== RequestStatus.CHANGES_REQUESTED) redirect(`/requests/${id}`);

  const latestComment = req.approvals[0]?.comment;

  const items: ClaimItem[] = req.claimItems.map((c) => ({
    type: c.type as ClaimItem["type"],
    description: c.description,
    quantity: c.quantity,
    amount: Number(c.amount),
    receipts: c.receipts.map((r) => ({
      fileUrl: r.fileUrl,
      fileName: r.fileName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit and resubmit</h1>
          <p className="text-sm text-muted-foreground">
            Make the requested changes and resubmit. The request will start again from the Line Manager stage.
          </p>
        </div>
        <Link href={`/requests/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Cancel
        </Link>
      </div>

      {latestComment && (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <div className="font-medium">Reviewer note:</div>
          <div className="text-muted-foreground mt-1">{latestComment}</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditForm
            requestId={id}
            enableReceipts={req.type === "REIMBURSEMENT"}
            defaults={{
              purpose: req.purpose,
              destination: req.destination,
              locationType: req.locationType,
              tripStart: toDateInput(req.tripStart),
              tripEnd: toDateInput(req.tripEnd),
              paymentMethod: req.paymentMethod,
            }}
            defaultItems={items}
          />
        </CardContent>
      </Card>
    </div>
  );
}
