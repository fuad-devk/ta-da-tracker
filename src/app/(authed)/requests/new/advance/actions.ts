"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { advanceRequestSchema } from "@/lib/request-validators";
import { daRateFor, aaCeilingFor } from "@/lib/policy";
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
    bankName: String(fd.get("bankName") ?? ""),
    bankAccount: String(fd.get("bankAccount") ?? ""),
    bankBranch: String(fd.get("bankBranch") ?? ""),
    bkashNumber: String(fd.get("bkashNumber") ?? ""),
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

  const totalAmount = data.items.reduce(
    (s, it) => s + Number(it.amount) * Number(it.quantity ?? 1),
    0
  );

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
      bankName: data.paymentMethod === "BANK" ? data.bankName || null : null,
      bankAccount: data.paymentMethod === "BANK" ? data.bankAccount || null : null,
      bankBranch: data.paymentMethod === "BANK" ? data.bankBranch || null : null,
      bkashNumber: data.paymentMethod === "BKASH" ? data.bkashNumber || null : null,
      totalAmount,
      submittedAt: new Date(),
      claimItems: {
        create: data.items.map((it) => ({
          type: it.type,
          description: it.description,
          quantity: it.quantity ?? 1,
          amount: it.amount,
          rateSnapshot:
            it.type === "DA"
              ? daRateFor(submitter.band as Band, data.locationType as LocationType)
              : it.type === "AA"
                ? aaCeilingFor(submitter.band as Band)
                : null,
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
