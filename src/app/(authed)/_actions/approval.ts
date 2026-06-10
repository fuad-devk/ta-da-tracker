"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import {
  ApprovalAction,
  ApprovalStage,
  RequestStatus,
} from "@prisma/client";
import {
  canUserActOnRequest,
  NEXT_STAGE,
  PENDING_STATUS_FOR_STAGE,
  STAGE_FOR_PENDING_STATUS,
  stageLabel,
} from "@/lib/approval";
import { sendEmail, emailLayout, requestUrl, approvalUrl } from "@/lib/email";

async function loadRequest(id: string) {
  return prisma.request.findUnique({
    where: { id },
    include: { submitter: true },
  });
}

async function notifyNextApprover(requestId: string, nextStatus: RequestStatus) {
  const req = await loadRequest(requestId);
  if (!req) return;
  const stage = STAGE_FOR_PENDING_STATUS[nextStatus];
  if (!stage) return;

  let recipients: { email: string; name: string }[] = [];

  if (stage === ApprovalStage.LINE_MANAGER) {
    if (req.submitter.lineManagerId) {
      const lm = await prisma.user.findUnique({
        where: { id: req.submitter.lineManagerId },
        select: { email: true, name: true },
      });
      if (lm) recipients = [lm];
    }
  } else if (stage === ApprovalStage.ADMIN_MANAGER) {
    recipients = await prisma.user.findMany({
      where: { roles: { has: "ADMIN_MANAGER" } },
      select: { email: true, name: true },
    });
  } else if (stage === ApprovalStage.FINANCE_MANAGER) {
    recipients = await prisma.user.findMany({
      where: { roles: { has: "FINANCE_MANAGER" } },
      select: { email: true, name: true },
    });
  }

  await Promise.all(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `${req.type === "ADVANCE" ? "Advance" : "Reimbursement"} request awaiting your approval`,
        type: "approval_request",
        requestId: req.id,
        html: emailLayout(
          `An ${req.type.toLowerCase()} request is awaiting your approval`,
          `<p><strong>${req.submitter.name}</strong> submitted a request totalling <strong>BDT ${Number(req.totalAmount).toLocaleString()}</strong>.</p>
           <p><strong>Purpose:</strong> ${req.purpose}<br/>
           <strong>Destination:</strong> ${req.destination}</p>`,
          approvalUrl(req.id),
          "Review request"
        ),
      })
    )
  );
}

async function notifySubmitter(requestId: string, subject: string, body: string) {
  const req = await loadRequest(requestId);
  if (!req) return;
  await sendEmail({
    to: req.submitter.email,
    subject,
    type: "status_update",
    requestId: req.id,
    html: emailLayout(subject, body, requestUrl(req.id), "View request"),
  });
}

export async function approveAction(requestId: string, formData: FormData) {
  const session = await requireSession();
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const req = await loadRequest(requestId);
  if (!req) throw new Error("Request not found");

  const ok = await canUserActOnRequest(
    { id: session.user.id, roles: session.user.roles },
    req
  );
  if (!ok) throw new Error("Not authorized to act on this request.");

  const stage = STAGE_FOR_PENDING_STATUS[req.status];
  if (!stage) throw new Error("Request is not in an approvable state.");

  const next = NEXT_STAGE[stage];
  const nextStatus =
    next === "DONE" ? RequestStatus.APPROVED : PENDING_STATUS_FOR_STAGE[next];

  await prisma.$transaction([
    prisma.approvalRecord.create({
      data: {
        requestId,
        actorId: session.user.id,
        stage,
        action: ApprovalAction.APPROVED,
        comment,
      },
    }),
    prisma.request.update({
      where: { id: requestId },
      data: { status: nextStatus },
    }),
  ]);

  if (next === "DONE") {
    await notifySubmitter(
      requestId,
      "Your request has been fully approved",
      `<p>Your request has cleared all approval stages and is awaiting Finance disbursement.</p>`
    );
  } else {
    await notifyNextApprover(requestId, nextStatus);
    await notifySubmitter(
      requestId,
      `${stageLabel(stage)} approved your request`,
      `<p>Approved by ${session.user.name} at the ${stageLabel(stage)} stage. Now with ${stageLabel(next)}.</p>${comment ? `<p><em>Comment:</em> ${comment}</p>` : ""}`
    );
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath(`/approvals/${requestId}`);
  revalidatePath("/approvals");
  revalidatePath("/requests");
}

export async function rejectAction(requestId: string, formData: FormData) {
  const session = await requireSession();
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const req = await loadRequest(requestId);
  if (!req) throw new Error("Request not found");

  const ok = await canUserActOnRequest(
    { id: session.user.id, roles: session.user.roles },
    req
  );
  if (!ok) throw new Error("Not authorized to act on this request.");

  const stage = STAGE_FOR_PENDING_STATUS[req.status];
  if (!stage) throw new Error("Request is not in an approvable state.");

  await prisma.$transaction([
    prisma.approvalRecord.create({
      data: {
        requestId,
        actorId: session.user.id,
        stage,
        action: ApprovalAction.REJECTED,
        comment,
      },
    }),
    prisma.request.update({
      where: { id: requestId },
      data: { status: RequestStatus.REJECTED },
    }),
  ]);

  await notifySubmitter(
    requestId,
    "Your request was rejected",
    `<p>Rejected by ${session.user.name} at the ${stageLabel(stage)} stage.</p>${comment ? `<p><em>Reason:</em> ${comment}</p>` : ""}`
  );

  revalidatePath(`/requests/${requestId}`);
  revalidatePath(`/approvals/${requestId}`);
  revalidatePath("/approvals");
  revalidatePath("/requests");
}

export async function requestChangesAction(requestId: string, formData: FormData) {
  const session = await requireSession();
  const comment = String(formData.get("comment") ?? "").trim();
  if (!comment) throw new Error("A comment is required when requesting changes.");

  const req = await loadRequest(requestId);
  if (!req) throw new Error("Request not found");

  const ok = await canUserActOnRequest(
    { id: session.user.id, roles: session.user.roles },
    req
  );
  if (!ok) throw new Error("Not authorized to act on this request.");

  const stage = STAGE_FOR_PENDING_STATUS[req.status];
  if (!stage) throw new Error("Request is not in an approvable state.");

  await prisma.$transaction([
    prisma.approvalRecord.create({
      data: {
        requestId,
        actorId: session.user.id,
        stage,
        action: ApprovalAction.CHANGES_REQUESTED,
        comment,
      },
    }),
    prisma.request.update({
      where: { id: requestId },
      data: { status: RequestStatus.CHANGES_REQUESTED },
    }),
  ]);

  await notifySubmitter(
    requestId,
    "Changes requested on your request",
    `<p>${session.user.name} (${stageLabel(stage)}) requested changes.</p><p><em>Comment:</em> ${comment}</p><p>Edit and resubmit when ready.</p>`
  );

  revalidatePath(`/requests/${requestId}`);
  revalidatePath(`/approvals/${requestId}`);
  revalidatePath("/approvals");
  revalidatePath("/requests");
}

export async function markDisbursedAction(requestId: string, formData: FormData) {
  const session = await requireSession();
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (
    !session.user.roles.includes("FINANCE_MANAGER") &&
    !session.user.roles.includes("SUPER_ADMIN")
  ) {
    throw new Error("Only Finance can mark disbursed.");
  }

  const req = await prisma.request.findUnique({
    where: { id: requestId },
    include: { linkedAdvance: true, submitter: true },
  });
  if (!req) throw new Error("Request not found");
  if (req.status !== RequestStatus.APPROVED) {
    throw new Error("Request must be approved before disbursal.");
  }

  // For reimbursements linked to an advance, compute net amounts.
  let netDueToEmployee: number | null = null;
  let netDueFromEmployee: number | null = null;
  if (req.type === "REIMBURSEMENT" && req.linkedAdvance) {
    const claim = Number(req.totalAmount);
    const advance = Number(req.linkedAdvance.totalAmount);
    const net = claim - advance;
    if (net >= 0) {
      netDueToEmployee = net;
    } else {
      netDueFromEmployee = Math.abs(net);
    }
  }

  await prisma.$transaction([
    prisma.approvalRecord.create({
      data: {
        requestId,
        actorId: session.user.id,
        stage: ApprovalStage.FINANCE_MANAGER,
        action: ApprovalAction.DISBURSED,
        comment,
      },
    }),
    prisma.request.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.DISBURSED,
        disbursedAt: new Date(),
        netDueToEmployee,
        netDueFromEmployee,
      },
    }),
  ]);

  const netLine =
    netDueToEmployee !== null
      ? `<p>Net due to employee: <strong>BDT ${netDueToEmployee.toLocaleString()}</strong> (claim BDT ${Number(req.totalAmount).toLocaleString()} − advance BDT ${Number(req.linkedAdvance?.totalAmount ?? 0).toLocaleString()}).</p>`
      : netDueFromEmployee !== null
        ? `<p>Excess from advance — employee owes: <strong>BDT ${netDueFromEmployee.toLocaleString()}</strong>.</p>`
        : `<p>Total disbursed: <strong>BDT ${Number(req.totalAmount).toLocaleString()}</strong>.</p>`;

  await notifySubmitter(
    requestId,
    "Your request has been disbursed",
    `<p>Marked disbursed by ${session.user.name}.</p>${netLine}`
  );

  revalidatePath(`/requests/${requestId}`);
  revalidatePath(`/approvals/${requestId}`);
  revalidatePath("/approvals");
  revalidatePath("/requests");
}
