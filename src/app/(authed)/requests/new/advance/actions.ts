"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { advanceRequestSchema } from "@/lib/request-validators";
import { daRateFor, aaCeilingFor, ADVANCE_AMOUNT_CAP } from "@/lib/policy";
import {
  RequestStatus,
  RequestType,
  type Band,
  type LocationType,
} from "@prisma/client";
import { sendEmail, emailLayout, approvalUrl } from "@/lib/email";

export type SubmitState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

function tripDays(start: Date, end: Date) {
  return Math.max(1, Math.ceil((+end - +start) / 86400000) + 1);
}

export async function submitAdvanceAction(_prev: SubmitState, fd: FormData): Promise<SubmitState> {
  const session = await requireSession();

  const itemsRaw = fd.get("items");
  let items: unknown[] = [];
  try {
    items = JSON.parse(typeof itemsRaw === "string" ? itemsRaw : "[]");
  } catch {
    return { error: "Could not read claim items" };
  }

  const payload = {
    purpose: String(fd.get("purpose") ?? ""),
    destination: String(fd.get("destination") ?? ""),
    locationType: String(fd.get("locationType") ?? ""),
    tripStart: String(fd.get("tripStart") ?? ""),
    tripEnd: String(fd.get("tripEnd") ?? ""),
    paymentMethod: String(fd.get("paymentMethod") ?? ""),
    items,
  };

  const parsed = advanceRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { fieldErrors };
  }
  const data = parsed.data;

  const submitter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { band: true, lineManagerId: true, name: true, email: true },
  });
  if (!submitter) return { error: "User not found" };
  if (!submitter.lineManagerId) {
    return { error: "No line manager assigned to your profile. Contact your administrator." };
  }

  // Per-item policy caps
  const days = tripDays(data.tripStart, data.tripEnd);
  const nights = Math.max(0, days - 1);
  const daRate = daRateFor(submitter.band as Band, data.locationType as LocationType);
  const aaCeiling = aaCeilingFor(submitter.band as Band);
  const daCap = daRate * days;
  const aaCap = aaCeiling * nights;

  for (const it of data.items) {
    if (it.type === "DA" && Number(it.amount) > daCap) {
      return { fieldErrors: { items: `Dearness amount exceeds policy cap of BDT ${daCap.toLocaleString()} (${daRate.toLocaleString()} × ${days} days).` } };
    }
    if (it.type === "AA" && Number(it.amount) > aaCap) {
      return { fieldErrors: { items: `Accommodation amount exceeds policy cap of BDT ${aaCap.toLocaleString()} (${aaCeiling.toLocaleString()} × ${nights} nights).` } };
    }
  }

  const totalAmount = data.items.reduce((s, it) => s + Number(it.amount), 0);
  if (totalAmount > ADVANCE_AMOUNT_CAP) {
    return { fieldErrors: { items: `Advance total cannot exceed BDT ${ADVANCE_AMOUNT_CAP.toLocaleString()}.` } };
  }

  const lineManager = await prisma.user.findUnique({
    where: { id: submitter.lineManagerId },
    select: { id: true, email: true, name: true },
  });

  const request = await prisma.request.create({
    data: {
      type: RequestType.ADVANCE,
      status: RequestStatus.PENDING_LINE_MANAGER,
      submitterId: session.user.id,
      purpose: data.purpose,
      destination: data.destination,
      locationType: data.locationType as LocationType,
      tripStart: data.tripStart,
      tripEnd: data.tripEnd,
      paymentMethod: data.paymentMethod,
      totalAmount,
      submittedAt: new Date(),
      claimItems: {
        create: data.items.map((it) => ({
          type: it.type,
          description: it.description,
          quantity: 1,
          amount: it.amount,
          rateSnapshot:
            it.type === "DA" ? daRate : it.type === "AA" ? aaCeiling : null,
        })),
      },
    },
  });

  if (lineManager) {
    await sendEmail({
      to: lineManager.email,
      subject: `Advance request awaiting your approval — ${submitter.name}`,
      type: "approval_request",
      requestId: request.id,
      html: emailLayout(
        "An advance request is awaiting your approval",
        `<p><strong>${submitter.name}</strong> submitted an advance request totalling <strong>BDT ${totalAmount.toLocaleString()}</strong>.</p>
         <p><strong>Purpose:</strong> ${data.purpose}<br/>
         <strong>Destination:</strong> ${data.destination}<br/>
         <strong>Trip:</strong> ${data.tripStart.toDateString()} → ${data.tripEnd.toDateString()}</p>`,
        approvalUrl(request.id),
        "Review request"
      ),
    });
  }

  revalidatePath("/requests");
  revalidatePath("/approvals");
  redirect(`/requests/${request.id}`);
}
