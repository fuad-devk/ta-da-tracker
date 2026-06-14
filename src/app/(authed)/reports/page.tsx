import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseFilters, buildWhere, filtersToQuery, ALL_STATUSES, ALL_TYPES } from "@/lib/reports";
import { statusLabel } from "@/lib/approval";
import { BANDS } from "@/lib/validators";
import { RequestStatus } from "@prisma/client";
import { PrintButton } from "./_components/print-button";

export const dynamic = "force-dynamic";

const PENDING_STATUSES: RequestStatus[] = [
  RequestStatus.PENDING_LINE_MANAGER,
  RequestStatus.PENDING_ADMIN_MANAGER,
  RequestStatus.PENDING_FINANCE_MANAGER,
];

function fmtBdt(n: number) {
  return `BDT ${Math.round(n).toLocaleString()}`;
}

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.floor((+b - +a) / 86400000));
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("FINANCE_MANAGER", "ADMIN_MANAGER", "SUPER_ADMIN");
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const where = buildWhere(filters);

  const departments = (
    await prisma.user.findMany({ select: { department: true }, distinct: ["department"], orderBy: { department: "asc" } })
  ).map((d) => d.department);

  const requests = await prisma.request.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: { submitter: { select: { name: true, email: true, department: true, band: true } } },
  });

  // Finance-oriented aggregates
  const totalSubmitted = requests.length;
  const totalAmount = requests.reduce((s, r) => s + Number(r.totalAmount), 0);

  const disbursedReqs = requests.filter((r) => r.status === RequestStatus.DISBURSED);
  const disbursedAmount = disbursedReqs.reduce((s, r) => s + Number(r.totalAmount), 0);

  const readyToDisburse = requests.filter((r) => r.status === RequestStatus.APPROVED);
  const readyToDisburseAmount = readyToDisburse.reduce((s, r) => s + Number(r.totalAmount), 0);

  const pendingReqs = requests.filter((r) => PENDING_STATUSES.includes(r.status));
  const pendingAmount = pendingReqs.reduce((s, r) => s + Number(r.totalAmount), 0);

  const netReceivable = disbursedReqs.reduce(
    (s, r) => s + (r.netDueFromEmployee ? Number(r.netDueFromEmployee) : 0),
    0
  );
  const netPayableExtras = disbursedReqs.reduce(
    (s, r) => s + (r.netDueToEmployee ? Number(r.netDueToEmployee) : 0),
    0
  );

  // By payment method
  const byMethod = new Map<string, { count: number; amount: number }>();
  for (const r of disbursedReqs) {
    const k = r.paymentMethod;
    const cur = byMethod.get(k) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(r.totalAmount);
    byMethod.set(k, cur);
  }

  // By department (disbursed)
  const byDept = new Map<string, { count: number; amount: number }>();
  for (const r of disbursedReqs) {
    const k = r.submitter.department;
    const cur = byDept.get(k) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(r.totalAmount);
    byDept.set(k, cur);
  }
  const byDeptRows = Array.from(byDept.entries()).sort(([, a], [, b]) => b.amount - a.amount);

  // Monthly disbursement
  const monthly = new Map<string, { count: number; amount: number }>();
  for (const r of disbursedReqs) {
    if (!r.disbursedAt) continue;
    const k = monthKey(r.disbursedAt);
    const cur = monthly.get(k) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(r.totalAmount);
    monthly.set(k, cur);
  }
  const monthlyRows = Array.from(monthly.entries()).sort(([a], [b]) => (a < b ? 1 : -1));

  // Pending aging
  const now = new Date();
  const buckets: Record<string, Record<string, number>> = {
    PENDING_LINE_MANAGER: { "0-2": 0, "3-7": 0, "8-14": 0, "15+": 0 },
    PENDING_ADMIN_MANAGER: { "0-2": 0, "3-7": 0, "8-14": 0, "15+": 0 },
    PENDING_FINANCE_MANAGER: { "0-2": 0, "3-7": 0, "8-14": 0, "15+": 0 },
  };
  for (const r of requests) {
    if (!PENDING_STATUSES.includes(r.status)) continue;
    if (!r.submittedAt) continue;
    const days = daysBetween(r.submittedAt, now);
    const bucket = days <= 2 ? "0-2" : days <= 7 ? "3-7" : days <= 14 ? "8-14" : "15+";
    buckets[r.status][bucket] += 1;
  }

  const qs = filtersToQuery(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance reports</h1>
          <p className="text-sm text-muted-foreground">
            Disbursements, payables, receivables, and approval pipeline health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/reports/export${qs ? `?${qs}` : ""}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Download CSV
          </a>
          <PrintButton />
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Date range applies to submission date.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="text-xs font-medium">From</label>
              <input type="date" name="from" defaultValue={filters.from ?? ""} className="mt-1 block w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">To</label>
              <input type="date" name="to" defaultValue={filters.to ?? ""} className="mt-1 block w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Department</label>
              <select name="department" defaultValue={filters.department ?? ""} className="mt-1 block w-full rounded-md border bg-background px-3 py-1.5 text-sm">
                <option value="">All</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Band</label>
              <select name="band" defaultValue={filters.band ?? ""} className="mt-1 block w-full rounded-md border bg-background px-3 py-1.5 text-sm">
                <option value="">All</option>
                {BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Type</label>
              <select name="type" defaultValue={filters.type ?? ""} className="mt-1 block w-full rounded-md border bg-background px-3 py-1.5 text-sm">
                <option value="">All</option>
                {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <select name="status" defaultValue={filters.status ?? ""} className="mt-1 block w-full rounded-md border bg-background px-3 py-1.5 text-sm">
                <option value="">All</option>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3 lg:col-span-6 flex items-center gap-2">
              <button type="submit" className={buttonVariants({ size: "sm" })}>Apply</button>
              <Link href="/reports" className={buttonVariants({ size: "sm", variant: "ghost" })}>Clear</Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Finance KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Disbursed" amount={disbursedAmount} count={disbursedReqs.length} tone="emerald" />
        <KpiCard label="Ready to disburse" amount={readyToDisburseAmount} count={readyToDisburse.length} tone="blue" />
        <KpiCard label="In approval pipeline" amount={pendingAmount} count={pendingReqs.length} tone="amber" />
        <KpiCard label="Total submitted" amount={totalAmount} count={totalSubmitted} tone="zinc" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard
          label="Net payable to employees (reconciled)"
          amount={netPayableExtras}
          count={null}
          tone="emerald"
          hint="From reimbursements that exceeded the linked advance"
        />
        <KpiCard
          label="Net receivable from employees"
          amount={netReceivable}
          count={null}
          tone="rose"
          hint="Excess advance to be returned"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disbursement by payment method</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Amount (BDT)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byMethod.size === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No disbursals in range.</TableCell></TableRow>
                ) : (
                  Array.from(byMethod.entries()).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell>{k === "BANK" ? "Bank" : "bKash"}</TableCell>
                      <TableCell>{v.count}</TableCell>
                      <TableCell>{Math.round(v.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top departments (disbursed)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Amount (BDT)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDeptRows.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No disbursals in range.</TableCell></TableRow>
                ) : (
                  byDeptRows.slice(0, 8).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell>{v.count}</TableCell>
                      <TableCell>{Math.round(v.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly disbursement</CardTitle>
            <CardDescription>By disbursal month.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Total (BDT)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyRows.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No disbursals in range.</TableCell></TableRow>
                ) : (
                  monthlyRows.map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell>{v.count}</TableCell>
                      <TableCell>{Math.round(v.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending pipeline aging</CardTitle>
            <CardDescription>Days since submission, by current stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead>0–2d</TableHead>
                  <TableHead>3–7d</TableHead>
                  <TableHead>8–14d</TableHead>
                  <TableHead>15+ d</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(buckets).map(([status, b]) => (
                  <TableRow key={status}>
                    <TableCell className="text-sm">{statusLabel(status as RequestStatus)}</TableCell>
                    <TableCell>{b["0-2"]}</TableCell>
                    <TableCell>{b["3-7"]}</TableCell>
                    <TableCell>{b["8-14"]}</TableCell>
                    <TableCell className={b["15+"] > 0 ? "font-semibold text-destructive" : ""}>{b["15+"]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All requests in range</CardTitle>
          <CardDescription>
            {totalSubmitted} request{totalSubmitted === 1 ? "" : "s"} — total {fmtBdt(totalAmount)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead>Dept · Band</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right print:hidden">&nbsp;</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    No requests in range.
                  </TableCell>
                </TableRow>
              )}
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.submitter.name}</div>
                    <div className="text-xs text-muted-foreground">{r.submitter.email}</div>
                  </TableCell>
                  <TableCell className="text-xs">{r.submitter.department} · {r.submitter.band}</TableCell>
                  <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                  <TableCell className="text-xs">{r.paymentMethod === "BANK" ? "Bank" : "bKash"}</TableCell>
                  <TableCell>{Number(r.totalAmount).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right print:hidden">
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
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  amount,
  count,
  tone,
  hint,
}: {
  label: string;
  amount: number;
  count: number | null;
  tone: "emerald" | "blue" | "amber" | "rose" | "zinc";
  hint?: string;
}) {
  const tones: Record<typeof tone, string> = {
    emerald: "from-emerald-50 to-emerald-100/50 border-emerald-200",
    blue: "from-blue-50 to-blue-100/50 border-blue-200",
    amber: "from-amber-50 to-amber-100/50 border-amber-200",
    rose: "from-rose-50 to-rose-100/50 border-rose-200",
    zinc: "from-zinc-50 to-zinc-100/50 border-zinc-200",
  };
  return (
    <div className={`rounded-lg border bg-gradient-to-br p-4 transition-shadow hover:shadow-sm ${tones[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">BDT {Math.round(amount).toLocaleString()}</div>
      {count != null && (
        <div className="mt-0.5 text-xs text-muted-foreground">{count} request{count === 1 ? "" : "s"}</div>
      )}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
