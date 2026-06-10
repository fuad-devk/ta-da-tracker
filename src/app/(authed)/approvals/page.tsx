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
import { pendingForUserWhere, statusLabel } from "@/lib/approval";
import { RequestStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await requireSession();

  const where = await pendingForUserWhere({
    id: session.user.id,
    roles: session.user.roles,
  });

  const pending = await prisma.request.findMany({
    where,
    orderBy: { submittedAt: "asc" },
    include: { submitter: { select: { name: true, email: true, band: true, department: true } } },
  });

  const disbursable =
    session.user.roles.includes("FINANCE_MANAGER") || session.user.roles.includes("SUPER_ADMIN")
      ? await prisma.request.findMany({
          where: { status: RequestStatus.APPROVED, NOT: { submitterId: session.user.id } },
          orderBy: { updatedAt: "asc" },
          include: { submitter: { select: { name: true, email: true, band: true, department: true } } },
        })
      : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} pending your decision
          {disbursable.length > 0 && ` · ${disbursable.length} ready for disbursal`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting your approval</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitter</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Total (BDT)</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">&nbsp;</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nothing in your queue.
                  </TableCell>
                </TableRow>
              )}
              {pending.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.submitter.name}</div>
                    <div className="text-xs text-muted-foreground">{r.submitter.department} · Band {r.submitter.band}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{r.purpose}</TableCell>
                  <TableCell>{Number(r.totalAmount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="secondary">{statusLabel(r.status)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/requests/${r.id}`}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      Review
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(session.user.roles.includes("FINANCE_MANAGER") || session.user.roles.includes("SUPER_ADMIN")) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ready for disbursal</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Total (BDT)</TableHead>
                  <TableHead className="text-right">&nbsp;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursable.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Nothing awaiting disbursal.
                    </TableCell>
                  </TableRow>
                )}
                {disbursable.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.submitter.name}</div>
                      <div className="text-xs text-muted-foreground">{r.submitter.department} · Band {r.submitter.band}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{r.purpose}</TableCell>
                    <TableCell>{Number(r.totalAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/requests/${r.id}`}
                        className={buttonVariants({ size: "sm", variant: "ghost" })}
                      >
                        Disburse
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
