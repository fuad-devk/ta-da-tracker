"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import {
  advanceRequestSchema,
  reimbursementRequestSchema,
} from "@/lib/request-validators";
import { daRateFor, aaCeilingFor } from "@/lib/policy";
import {
  RequestStatus,
  type Band,
  type LocationType,
} from "@prisma/client";
import { sendEmail, emailLayout, approvalUrl } from "@/lib/email";
import { stageLabel } from "@/lib/approval";

export type EditState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

export async function resubmitAction(
  requestId: string,
  _prev: EditState,
  fd: FormData
): Promise<EditState> {
  const session = await requireSession();

  const existing = await prisma.request.findUnique({
    where: { id: requestId },
    select: { submitterId: true, status: true, type: true },
  });
  if (!existing) return { error: "Request not found" };
  if (existing.submitterId !== session.user.id) {
    return { error: "Not authorized to edit this request." };
  }
  if (existing.status !== RequestStatus.CHANGES_REQUESTED) {
    return { error: "Only requests in CHANGES_REQUESTED state can be edited." };
  }

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

  const schema = existing.type === "ADVANCE" ? advanceRequestSchema : reimbursementRequestSchema;
  const parsed = schema.safeParse(payload);
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
    return { error: "No line manager assigned." };
  }

  const totalAmount = data.items.reduce(
    (s, it) => s + Number(it.amount) * Number(it.quantity ?? 1),
    0
  );

  await prisma.$transaction([
    prisma.claimItem.deleteMany({ where: { requestId } }),
    prisma.request.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.PENDING_LINE_MANAGER,
        purpose: data.purpose,
        destination: data.destination,
        locationType: data.locationType as LocationType,
        tripStart: data.tripStart,
        tripEnd: data.tripEnd,
        paymentMethod: data.paymentMethod,
        bankName: null,
        bankAccount: null,
        bankBranch: null,
        bkashNumber: null,
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
            receipts: {
              create: (it.receipts ?? []).map((r) => ({
                fileUrl: r.fileUrl,
                fileName: r.fileName,
                mimeType: r.mimeType,
                sizeBytes: r.sizeBytes,
              })),
            },
          })),
        },
      },
    }),
  ]);

  // Notify line manager that revised request needs review
  const lineManager = await prisma.user.findUnique({
    where: { id: submitter.lineManagerId },
    select: { email: true, name: true },
  });
  if (lineManager) {
    await sendEmail({
      to: lineManager.email,
      subject: `Revised request awaiting your approval — ${submitter.name}`,
      type: "approval_request",
      requestId,
      html: emailLayout(
        "A revised request is awaiting your approval",
        `<p><strong>${submitter.name}</strong> resubmitted a request after making the requested changes.</p>
         <p><strong>Total:</strong> BDT ${totalAmount.toLocaleString()}<br/>
         <strong>Purpose:</strong> ${data.purpose}</p>
         <p>Starts again from the ${stageLabel("LINE_MANAGER")} stage.</p>`,
        approvalUrl(requestId),
        "Review request"
      ),
    });
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  revalidatePath("/approvals");
  redirect(`/requests/${requestId}`);
}
