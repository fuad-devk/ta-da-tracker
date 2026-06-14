import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/approval";
import type { RequestStatus } from "@prisma/client";

const STYLES: Record<RequestStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  PENDING_LINE_MANAGER: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING_ADMIN_MANAGER: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING_FINANCE_MANAGER: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
  DISBURSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800 border-orange-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
};

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status], className)}>
      {statusLabel(status)}
    </Badge>
  );
}
