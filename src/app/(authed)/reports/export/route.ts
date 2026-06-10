import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseFilters, buildWhere } from "@/lib/reports";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = session.user.roles.some((r) =>
    ["FINANCE_MANAGER", "ADMIN_MANAGER", "SUPER_ADMIN"].includes(r)
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const sp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (sp[k] = v));
  const filters = parseFilters(sp);
  const where = buildWhere(filters);

  const requests = await prisma.request.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: {
      submitter: { select: { name: true, email: true, employeeId: true, department: true, band: true } },
      claimItems: true,
      linkedAdvance: { select: { id: true, totalAmount: true } },
    },
  });

  const header = [
    "Request ID",
    "Type",
    "Status",
    "Submitted At",
    "Disbursed At",
    "Submitter Name",
    "Submitter Email",
    "Employee ID",
    "Department",
    "Band",
    "Purpose",
    "Destination",
    "Location Type",
    "Trip Start",
    "Trip End",
    "Payment Method",
    "Bank Name",
    "Bank Account",
    "bKash Number",
    "TA Total",
    "DA Total",
    "AA Total",
    "Total Amount",
    "Linked Advance ID",
    "Linked Advance Amount",
    "Net Due To Employee",
    "Net Due From Employee",
  ];

  const lines = [header.map(csvEscape).join(",")];

  for (const r of requests) {
    const taTotal = r.claimItems.filter((i) => i.type === "TA").reduce((s, i) => s + Number(i.amount) * i.quantity, 0);
    const daTotal = r.claimItems.filter((i) => i.type === "DA").reduce((s, i) => s + Number(i.amount) * i.quantity, 0);
    const aaTotal = r.claimItems.filter((i) => i.type === "AA").reduce((s, i) => s + Number(i.amount) * i.quantity, 0);

    const row = [
      r.id,
      r.type,
      r.status,
      r.submittedAt?.toISOString() ?? "",
      r.disbursedAt?.toISOString() ?? "",
      r.submitter.name,
      r.submitter.email,
      r.submitter.employeeId,
      r.submitter.department,
      r.submitter.band,
      r.purpose,
      r.destination,
      r.locationType,
      r.tripStart.toISOString().slice(0, 10),
      r.tripEnd.toISOString().slice(0, 10),
      r.paymentMethod,
      r.bankName ?? "",
      r.bankAccount ?? "",
      r.bkashNumber ?? "",
      taTotal,
      daTotal,
      aaTotal,
      Number(r.totalAmount),
      r.linkedAdvance?.id ?? "",
      r.linkedAdvance ? Number(r.linkedAdvance.totalAmount) : "",
      r.netDueToEmployee ? Number(r.netDueToEmployee) : "",
      r.netDueFromEmployee ? Number(r.netDueFromEmployee) : "",
    ];

    lines.push(row.map(csvEscape).join(","));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `tada-report-${stamp}.csv`;

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
