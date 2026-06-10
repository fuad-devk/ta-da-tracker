import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusLabel } from "@/lib/approval";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "REJECTED") return "destructive";
  if (status === "DISBURSED" || status === "APPROVED") return "default";
  if (status === "DRAFT" || status === "CHANGES_REQUESTED") return "outline";
  return "secondary";
}

export default async function RequestsPage() {
  const session = await requireSession();

  const requests = await prisma.request.findMany({
    where: { submitterId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { claimItems: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My requests</h1>
          <p className="text-sm text-muted-foreground">
            {requests.length} request{requests.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/requests/new/advance" className={buttonVariants()}>
            New advance request
          </Link>
          <Link href="/requests/new/reimbursement" className={buttonVariants({ variant: "outline" })}>
            New reimbursement claim
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Trip dates</TableHead>
              <TableHead>Total (BDT)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  You have no requests yet.
                </TableCell>
              </TableRow>
            )}
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">
                  {r.submittedAt
                    ? new Date(r.submittedAt).toLocaleDateString()
                    : new Date(r.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.type}</Badge>
                </TableCell>
                <TableCell className="text-sm max-w-xs truncate">{r.purpose}</TableCell>
                <TableCell className="text-sm">{r.destination}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.tripStart).toLocaleDateString()} → {new Date(r.tripEnd).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">{Number(r.totalAmount).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(r.status)}>
                    {statusLabel(r.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/requests/${r.id}`}
                    className={buttonVariants({ size: "sm", variant: "ghost" })}
                  >
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
