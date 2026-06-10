import { Prisma, RequestStatus, RequestType, Band } from "@prisma/client";
import { BANDS } from "./validators";

export type ReportFilters = {
  from?: string;
  to?: string;
  department?: string;
  band?: string;
  status?: string;
  type?: string;
};

export function parseFilters(sp: Record<string, string | undefined>): ReportFilters {
  return {
    from: sp.from || undefined,
    to: sp.to || undefined,
    department: sp.department || undefined,
    band: sp.band || undefined,
    status: sp.status || undefined,
    type: sp.type || undefined,
  };
}

export function filtersToQuery(f: ReportFilters): string {
  const sp = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  return sp.toString();
}

// Builds the Prisma `where` clause from filters.
// Date filter applies to submittedAt by default (we report by submission window).
export function buildWhere(f: ReportFilters): Prisma.RequestWhereInput {
  const where: Prisma.RequestWhereInput = {};

  if (f.from || f.to) {
    where.submittedAt = {};
    if (f.from) (where.submittedAt as Prisma.DateTimeFilter).gte = new Date(f.from);
    if (f.to) {
      const end = new Date(f.to);
      end.setHours(23, 59, 59, 999);
      (where.submittedAt as Prisma.DateTimeFilter).lte = end;
    }
  }

  if (f.status && Object.values(RequestStatus).includes(f.status as RequestStatus)) {
    where.status = f.status as RequestStatus;
  }
  if (f.type && Object.values(RequestType).includes(f.type as RequestType)) {
    where.type = f.type as RequestType;
  }

  const userFilters: Prisma.UserWhereInput = {};
  if (f.department) userFilters.department = f.department;
  if (f.band && (BANDS as readonly string[]).includes(f.band)) {
    userFilters.band = f.band as Band;
  }
  if (Object.keys(userFilters).length > 0) {
    where.submitter = { is: userFilters };
  }

  return where;
}

export const ALL_STATUSES = Object.values(RequestStatus);
export const ALL_TYPES = Object.values(RequestType);
