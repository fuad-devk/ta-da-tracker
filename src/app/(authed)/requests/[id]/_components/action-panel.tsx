"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  approveAction,
  rejectAction,
  requestChangesAction,
  markDisbursedAction,
} from "@/app/(authed)/_actions/approval";

type Mode = "approve" | "changes" | "reject" | "disburse";

export function ActionPanel({
  requestId,
  canApprove,
  canDisburse,
}: {
  requestId: string;
  canApprove: boolean;
  canDisburse: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");

  if (!canApprove && !canDisburse) return null;

  const run = (mode: Mode) => {
    const fd = new FormData();
    fd.set("comment", comment);
    startTransition(async () => {
      try {
        if (mode === "approve") await approveAction(requestId, fd);
        if (mode === "changes") await requestChangesAction(requestId, fd);
        if (mode === "reject") await rejectAction(requestId, fd);
        if (mode === "disburse") await markDisbursedAction(requestId, fd);
        toast.success(
          mode === "approve" ? "Approved." :
          mode === "changes" ? "Sent back to submitter." :
          mode === "reject" ? "Rejected." :
          "Marked disbursed."
        );
        setComment("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-md border bg-background p-4">
      <h3 className="text-sm font-semibold">
        {canDisburse ? "Disbursement" : "Your decision"}
      </h3>
      <Textarea
        placeholder={canDisburse ? "Optional note for the audit trail" : "Comment (required to request changes)"}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        disabled={pending}
      />
      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <>
            <Button onClick={() => run("approve")} disabled={pending}>
              Approve
            </Button>
            <Button onClick={() => run("changes")} variant="outline" disabled={pending || !comment.trim()}>
              Request changes
            </Button>
            <Button onClick={() => run("reject")} variant="destructive" disabled={pending}>
              Reject
            </Button>
          </>
        )}
        {canDisburse && (
          <Button onClick={() => run("disburse")} disabled={pending}>
            Mark disbursed
          </Button>
        )}
      </div>
    </div>
  );
}
