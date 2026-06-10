import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canUserActOnRequest, stageLabel, statusLabel } from "@/lib/approval";
import { ActionPanel } from "./_components/action-panel";
import { RequestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "REJECTED") return "destructive";
  if (status === "DISBURSED" || status === "APPROVED") return "default";
  if (status === "DRAFT" || status === "CHANGES_REQUESTED") return "outline";
  return "secondary";
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const req = await prisma.request.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, name: true, email: true, employeeId: true, band: true, department: true } },
      claimItems: { include: { receipts: true } },
      linkedAdvance: { select: { id: true, totalAmount: true, status: true } },
      approvals: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!req) notFound();

  const isSubmitter = req.submitterId === session.user.id;
  const canApprove = await canUserActOnRequest(
    { id: session.user.id, roles: session.user.roles },
    req
  );
  const canDisburse =
    req.status === RequestStatus.APPROVED &&
    !isSubmitter &&
    (session.user.roles.includes("FINANCE_MANAGER") || session.user.roles.includes("SUPER_ADMIN"));

  const canEdit = isSubmitter && req.status === RequestStatus.CHANGES_REQUESTED;
  const total = Number(req.totalAmount);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{req.type}</Badge>
            <Badge variant={statusVariant(req.status)}>{statusLabel(req.status)}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{req.purpose}</h1>
          <p className="text-sm text-muted-foreground">
            Submitted by {req.submitter.name} ({req.submitter.email}) — Band {req.submitter.band}, {req.submitter.department}
          </p>
        </div>
        <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trip details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Destination</dt>
                  <dd>{req.destination}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Location type</dt>
                  <dd>{req.locationType === "INTERCITY" ? "Intercity" : "City"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Trip start</dt>
                  <dd>{new Date(req.tripStart).toDateString()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Trip end</dt>
                  <dd>{new Date(req.tripEnd).toDateString()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Payment method</dt>
                  <dd>
                    {req.paymentMethod === "BANK"
                      ? `Bank — ${req.bankName ?? ""} ${req.bankAccount ? `(A/C ${req.bankAccount})` : ""} ${req.bankBranch ? `· ${req.bankBranch}` : ""}`
                      : `bKash — ${req.bkashNumber ?? ""}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Total amount</dt>
                  <dd className="font-semibold">BDT {total.toLocaleString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Claim items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Receipts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {req.claimItems.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell><Badge variant="outline">{it.type}</Badge></TableCell>
                      <TableCell className="text-sm">{it.description}</TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell>{Number(it.amount).toLocaleString()}</TableCell>
                      <TableCell>{(Number(it.amount) * it.quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">
                        {it.receipts.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          it.receipts.map((r) => (
                            <a key={r.id} href={r.fileUrl} target="_blank" rel="noopener" className="block text-primary underline-offset-2 hover:underline">
                              {r.fileName}
                            </a>
                          ))
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {req.linkedAdvance && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked advance</CardTitle>
                <CardDescription>
                  This reimbursement is linked to an earlier advance request.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div>Advance total: BDT {Number(req.linkedAdvance.totalAmount).toLocaleString()}</div>
                <div>Status: {statusLabel(req.linkedAdvance.status)}</div>
                <Link
                  href={`/requests/${req.linkedAdvance.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  View advance →
                </Link>
                {req.netDueToEmployee && (
                  <div className="pt-2 font-medium">
                    Net due to employee: BDT {Number(req.netDueToEmployee).toLocaleString()}
                  </div>
                )}
                {req.netDueFromEmployee && (
                  <div className="pt-2 font-medium text-destructive">
                    Employee owes: BDT {Number(req.netDueFromEmployee).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {(canApprove || canDisburse) && (
            <ActionPanel
              requestId={req.id}
              canApprove={canApprove}
              canDisburse={canDisburse}
            />
          )}

          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Changes requested</CardTitle>
                <CardDescription>An approver asked you to edit and resubmit.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/requests/${req.id}/edit`}
                  className={buttonVariants()}
                >
                  Edit and resubmit
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li>
                  <div className="font-medium">Submitted</div>
                  <div className="text-xs text-muted-foreground">
                    {req.submittedAt ? new Date(req.submittedAt).toLocaleString() : "—"} · {req.submitter.name}
                  </div>
                </li>
                {req.approvals.map((a) => (
                  <li key={a.id}>
                    <div className="font-medium">
                      {a.action === "APPROVED" ? "Approved" :
                       a.action === "REJECTED" ? "Rejected" :
                       a.action === "CHANGES_REQUESTED" ? "Changes requested" :
                       "Disbursed"}{" "}
                      <span className="text-xs text-muted-foreground">· {stageLabel(a.stage)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()} · {a.actor.name}
                    </div>
                    {a.comment && <div className="mt-1 rounded bg-muted px-2 py-1 text-xs">{a.comment}</div>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
