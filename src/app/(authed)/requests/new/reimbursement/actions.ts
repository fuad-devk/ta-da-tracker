"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guards";
import { reimbursementRequestSchema } from "@/lib/request-validators";
import {
  daCapForTrip,
  aaCapForTrip,
  requiresElevatedApproval,
  workingDaysBetween,
  RETROACTIVE_WORKING_DAYS,
  daRateForDay,
  aaCeilingFor,
} from "@/lib/policy";
import {
  RequestStatus,
  RequestType,
  type Band,
  type LocationType,
  type MealsProvided,
} from "@prisma/client";
import { sendEmail, emailLayout, approvalUrl } from "@/lib/email";

export type SubmitState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

export async function submitReimbursementAction(
  _prev: SubmitState,
  fd: FormData
): Promise<SubmitState> {
  const session = await requireSession();

  const itemsRaw = fd.get("items");
  let items: unknown[] = [];
  try {
    items = JSON.parse(typeof itemsRaw === "string" ? itemsRaw : "[]");
  } catch {
    return { error: "Could not read claim items" };
  }

  const linkedAdvanceId = String(fd.get("linkedAdvanceId") ?? "").trim() || null;

  const payload = {
    purpose: String(fd.get("purpose") ?? ""),
    destination: String(fd.get("destination") ?? ""),
    locationType: String(fd.get("locationType") ?? ""),
    tripStart: String(fd.get("tripStart") ?? ""),
    tripEnd: String(fd.get("tripEnd") ?? ""),
    paymentMethod: String(fd.get("paymentMethod") ?? ""),
    dutyHours: String(fd.get("dutyHours") ?? "8"),
    mealsProvided: String(fd.get("mealsProvided") ?? "NONE"),
    companyBookedTravel: String(fd.get("companyBookedTravel") ?? "false") === "true",
    companyBookedAccommodation: String(fd.get("companyBookedAccommodation") ?? "false") === "true",
    items,
  };

  const parsed = reimbursementRequestSchema.safeParse(payload);
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

  if (linkedAdvanceId) {
    const adv = await prisma.request.findUnique({
      where: { id: linkedAdvanceId },
      select: { id: true, submitterId: true, type: true, status: true, reimbursement: { select: { id: true } } },
    });
    if (!adv || adv.submitterId !== session.user.id || adv.type !== "ADVANCE") {
      return { error: "Invalid linked advance." };
    }
    if (!["APPROVED", "DISBURSED"].includes(adv.status)) {
      return { error: "Linked advance must be approved or disbursed." };
    }
    if (adv.reimbursement) {
      return { error: "That advance is already linked to another reimbursement." };
    }
  }

  // V2 caps
  const daCap = daCapForTrip({
    band: submitter.band as Band,
    location: data.locationType as LocationType,
    tripStart: data.tripStart,
    tripEnd: data.tripEnd,
    dutyHoursPerDay: data.dutyHours,
    meals: data.mealsProvided as MealsProvided,
  });
  const aaCap = aaCapForTrip({
    band: submitter.band as Band,
    tripStart: data.tripStart,
    tripEnd: data.tripEnd,
    companyBookedAccommodation: data.companyBookedAccommodation,
  });

  for (const it of data.items) {
    if (it.type === "DA" && Number(it.amount) > daCap) {
      return { fieldErrors: { items: `Dearness amount exceeds V2 policy cap of BDT ${daCap.toLocaleString()}.` } };
    }
    if (it.type === "AA" && Number(it.amount) > aaCap) {
      return { fieldErrors: { items: `Accommodation amount exceeds V2 policy cap of BDT ${aaCap.toLocaleString()}.` } };
    }
  }

  const totalAmount = data.items.reduce((s, it) => s + Number(it.amount), 0);

  // V2: retroactive if submitted more than RETROACTIVE_WORKING_DAYS after trip end
  const workingDaysLate = workingDaysBetween(data.tripEnd, new Date());
  const retroactive = workingDaysLate > RETROACTIVE_WORKING_DAYS;
  const needsElevated = requiresElevatedApproval({ totalAmount, retroactive });

  // Rate snapshot at first day
  const firstDayDaRate = daRateForDay(
    submitter.band as Band,
    data.locationType as LocationType,
    data.tripStart
  );
  const aaCeiling = aaCeilingFor(submitter.band as Band);

  const lineManager = await prisma.user.findUnique({
    where: { id: submitter.lineManagerId },
    select: { id: true, email: true, name: true },
  });

  const request = await prisma.request.create({
    data: {
      type: RequestType.REIMBURSEMENT,
      status: RequestStatus.PENDING_LINE_MANAGER,
      submitterId: session.user.id,
      purpose: data.purpose,
      destination: data.destination,
      locationType: data.locationType as LocationType,
      tripStart: data.tripStart,
      tripEnd: data.tripEnd,
      paymentMethod: data.paymentMethod,
      totalAmount,
      linkedAdvanceId,
      submittedAt: new Date(),
      dutyHours: data.dutyHours,
      mealsProvided: data.mealsProvided as MealsProvided,
      companyBookedTravel: data.companyBookedTravel,
      companyBookedAccommodation: data.companyBookedAccommodation,
      needsElevatedApproval: needsElevated,
      retroactive,
      claimItems: {
        create: data.items.map((it) => ({
          type: it.type,
          description: it.description,
          quantity: 1,
          amount: it.amount,
          rateSnapshot:
            it.type === "DA" ? firstDayDaRate : it.type === "AA" ? aaCeiling : null,
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
  });

  if (lineManager) {
    await sendEmail({
      to: lineManager.email,
      subject: `Reimbursement claim awaiting your approval — ${submitter.name}`,
      type: "approval_request",
      requestId: request.id,
      html: emailLayout(
        "A reimbursement claim is awaiting your approval",
        `<p><strong>${submitter.name}</strong> submitted a reimbursement claim totalling <strong>BDT ${totalAmount.toLocaleString()}</strong>.</p>
         <p><strong>Purpose:</strong> ${data.purpose}<br/>
         <strong>Destination:</strong> ${data.destination}</p>
         ${needsElevated ? `<p><strong>⚠️ Elevated approval:</strong> ${retroactive ? "submitted late (retroactive)" : "exceeds BDT 25,000"} — Department Head sign-off required at Stage 2.</p>` : ""}`,
        approvalUrl(request.id),
        "Review claim"
      ),
    });
  }

  revalidatePath("/requests");
  revalidatePath("/approvals");
  redirect(`/requests/${request.id}`);
}
