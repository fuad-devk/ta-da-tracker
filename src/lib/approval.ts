import { prisma } from "@/lib/prisma";
import {
  ApprovalStage,
  RequestStatus,
  Role,
  type User,
  type Request,
} from "@prisma/client";

export const PENDING_STATUS_FOR_STAGE: Record<ApprovalStage, RequestStatus> = {
  LINE_MANAGER: RequestStatus.PENDING_LINE_MANAGER,
  ADMIN_MANAGER: RequestStatus.PENDING_ADMIN_MANAGER,
  FINANCE_MANAGER: RequestStatus.PENDING_FINANCE_MANAGER,
};

export const STAGE_FOR_PENDING_STATUS: Partial<Record<RequestStatus, ApprovalStage>> = {
  PENDING_LINE_MANAGER: ApprovalStage.LINE_MANAGER,
  PENDING_ADMIN_MANAGER: ApprovalStage.ADMIN_MANAGER,
  PENDING_FINANCE_MANAGER: ApprovalStage.FINANCE_MANAGER,
};

export const NEXT_STAGE: Record<ApprovalStage, ApprovalStage | "DONE"> = {
  LINE_MANAGER: ApprovalStage.ADMIN_MANAGER,
  ADMIN_MANAGER: ApprovalStage.FINANCE_MANAGER,
  FINANCE_MANAGER: "DONE",
};

export function stageLabel(stage: ApprovalStage): string {
  switch (stage) {
    case "LINE_MANAGER":
      return "Line Manager";
    case "ADMIN_MANAGER":
      return "Admin Manager";
    case "FINANCE_MANAGER":
      return "Finance Manager";
  }
}

export function statusLabel(s: RequestStatus): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Decides whether the given user can act on a request at its current pending stage.
export async function canUserActOnRequest(
  user: Pick<User, "id" | "roles">,
  request: Pick<Request, "id" | "status" | "submitterId">
): Promise<boolean> {
  const stage = STAGE_FOR_PENDING_STATUS[request.status];
  if (!stage) return false;
  if (request.submitterId === user.id) return false; // can't approve own

  if (stage === ApprovalStage.LINE_MANAGER) {
    const submitter = await prisma.user.findUnique({
      where: { id: request.submitterId },
      select: { lineManagerId: true },
    });
    return submitter?.lineManagerId === user.id;
  }
  if (stage === ApprovalStage.ADMIN_MANAGER) {
    return user.roles.includes(Role.ADMIN_MANAGER) || user.roles.includes(Role.SUPER_ADMIN);
  }
  if (stage === ApprovalStage.FINANCE_MANAGER) {
    return user.roles.includes(Role.FINANCE_MANAGER) || user.roles.includes(Role.SUPER_ADMIN);
  }
  return false;
}

// Builds a Prisma `where` clause that returns requests waiting on this user.
export async function pendingForUserWhere(user: Pick<User, "id" | "roles">) {
  const reportIds = (
    await prisma.user.findMany({
      where: { lineManagerId: user.id },
      select: { id: true },
    })
  ).map((r) => r.id);

  const ors: Array<Record<string, unknown>> = [];

  if (reportIds.length > 0) {
    ors.push({
      status: RequestStatus.PENDING_LINE_MANAGER,
      submitterId: { in: reportIds },
    });
  }
  if (user.roles.includes(Role.ADMIN_MANAGER) || user.roles.includes(Role.SUPER_ADMIN)) {
    ors.push({
      status: RequestStatus.PENDING_ADMIN_MANAGER,
      NOT: { submitterId: user.id },
    });
  }
  if (user.roles.includes(Role.FINANCE_MANAGER) || user.roles.includes(Role.SUPER_ADMIN)) {
    ors.push({
      status: RequestStatus.PENDING_FINANCE_MANAGER,
      NOT: { submitterId: user.id },
    });
  }
  if (ors.length === 0) return { id: "__never__" }; // matches nothing
  return { OR: ors };
}
