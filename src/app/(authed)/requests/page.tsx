import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequestStatus } from "@prisma/client";
import { AutoRefresh } from "./_components/auto-refresh";
import { stageLabel, STAGE_FOR_PENDING_STATUS } from "@/lib/approval";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: RequestStatus[] = [
  RequestStatus.DRAFT,
  RequestStatus.PENDING_LINE_MANAGER,
  RequestStatus.PENDING_ADMIN_MANAGER,
  RequestStatus.PENDING_FINANCE_MANAGER,
  RequestStatus.APPROVED,
  RequestStatus.CHANGES_REQUESTED,
];

const HISTORY_STATUSES: RequestStatus[] = [
  RequestStatus.DISBURSED,
  RequestStatus.REJECTED,
];

const PENDING_STATUSES: RequestStatus[] = [
  RequestStatus.PENDING_LINE_MANAGER,
  RequestStatus.PENDING_ADMIN_MANAGER,
  RequestStatus.PENDING_FINANCE_MANAGER,
];

function startOfMonth() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function fmtBdt(n: number) {
  return `BDT ${Math.round(n).toLocaleString()}`;
}

function daysAgo(d: Date) {
  return Math.floor((Date.now() - +d) / 86400000);
}

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireSession();
  const { view = "active" } = await searchParams;

  const requests = await prisma.request.findMany({
    where: { submitterId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      approvals: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { actor: { select: { name: true } } },
      },
    },
  });

  const activeRequests = requests.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const historyRequests = requests.filter((r) => HISTORY_STATUSES.includes(r.status));

  const pendingApproval = requests.filter((r) => PENDING_STATUSES.includes(r.status));
  const changesRequested = requests.filter((r) => r.status === RequestStatus.CHANGES_REQUESTED);
  const awaitingDisbursal = requests.filter((r) => r.status === RequestStatus.APPROVED);

  const monthStart = startOfMonth();
  const disbursedThisMonth = requests.filter(
    (r) => r.status === RequestStatus.DISBURSED && r.disbursedAt && r.disbursedAt >= monthStart
  );
  const disbursedThisMonthAmount = disbursedThisMonth.reduce((s, r) => s + Number(r.totalAmount), 0);

  const visible = view === "history" ? historyRequests : activeRequests;

  return (
    <div className="space-y-6">
      <AutoRefresh />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My requests</h1>
          <p className="text-sm text-muted-foreground">
            Live status of your submissions. Page refreshes every 30 seconds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/requests/new/advance"
            className={buttonVariants({ variant: "outline" })}
          >
            + Advance request
          </Link>
          <Link
            href="/requests/new/reimbursement"
            className={buttonVariants() + " shadow-sm"}
          >
            + Reimbursement claim
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          tone="amber"
          label="Awaiting approval"
          value={pendingApproval.length.toString()}
          sub={
            pendingApproval.length
              ? `Currently with ${pendingApproval
                  .map((r) => stageLabel(STAGE_FOR_PENDING_STATUS[r.status]!))
                  .filter((s, i, a) => a.indexOf(s) === i)
                  .slice(0, 2)
                  .join(", ")}`
              : "Nothing in queue"
          }
        />
        <KpiCard
          tone="orange"
          label="Changes requested"
          value={changesRequested.length.toString()}
          sub={changesRequested.length ? "Action needed" : "All clear"}
        />
        <KpiCard
          tone="blue"
          label="Ready for disbursal"
          value={awaitingDisbursal.length.toString()}
          sub={awaitingDisbursal.length ? "Finance will pay soon" : "—"}
        />
        <KpiCard
          tone="emerald"
          label="Disbursed this month"
          value={fmtBdt(disbursedThisMonthAmount)}
          sub={`${disbursedThisMonth.length} payment${disbursedThisMonth.length === 1 ? "" : "s"}`}
        />
      </div>

      {changesRequested.length > 0 && (
        <Card className="border-orange-300 bg-orange-50/60">
          <CardHeader>
            <CardTitle className="text-base text-orange-900">Action needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {changesRequested.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border border-orange-200 bg-background p-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.purpose}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.approvals[0]?.actor.name
                      ? `${r.approvals[0].actor.name} asked: ${r.approvals[0].comment ?? "Please review."}`
                      : "Approver requested changes."}
                  </div>
                </div>
                <Link
                  href={`/requests/${r.id}/edit`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Edit & resubmit
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-1 border-b">
        <TabLink href="?view=active" active={view !== "history"} count={activeRequests.length}>
          Active
        </TabLink>
        <TabLink href="?view=history" active={view === "history"} count={historyRequests.length}>
          History
        </TabLink>
      </div>

      <div className="overflow-hidden rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Trip</TableHead>
              <TableHead>Total (BDT)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latest activity</TableHead>
              <TableHead className="text-right">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  {view === "history"
                    ? "No completed requests yet."
                    : "No active requests. Submit a new one above."}
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => {
              const latest = r.approvals[0];
              return (
                <TableRow key={r.id} className="transition-colors hover:bg-muted/40">
                  <TableCell className="text-xs">
                    {r.submittedAt
                      ? new Date(r.submittedAt).toLocaleDateString()
                      : new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{r.purpose}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.destination}
                    <br />
                    {new Date(r.tripStart).toLocaleDateString()} →{" "}
                    {new Date(r.tripEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {Number(r.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {latest ? (
                      <>
                        {latest.action.replace(/_/g, " ").toLowerCase()} by {latest.actor.name}
                        <br />
                        <span>{daysAgo(latest.createdAt)}d ago</span>
                      </>
                    ) : (
                      <>
                        Submitted
                        <br />
                        {r.submittedAt ? `${daysAgo(r.submittedAt)}d ago` : "—"}
                      </>
                    )}
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function KpiCard({
  tone,
  label,
  value,
  sub,
}: {
  tone: "emerald" | "blue" | "amber" | "orange";
  label: string;
  value: string;
  sub: string;
}) {
  const tones: Record<typeof tone, string> = {
    emerald: "from-emerald-50 to-emerald-100/50 border-emerald-200",
    blue: "from-blue-50 to-blue-100/50 border-blue-200",
    amber: "from-amber-50 to-amber-100/50 border-amber-200",
    orange: "from-orange-50 to-orange-100/50 border-orange-200",
  };
  return (
    <div
      className={`rounded-lg border bg-gradient-to-br p-4 transition-shadow hover:shadow-sm ${tones[tone]}`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function TabLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "relative inline-flex items-center gap-2 border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
          : "relative inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {children}
      <Badge variant="secondary" className="text-xs">{count}</Badge>
    </Link>
  );
}
