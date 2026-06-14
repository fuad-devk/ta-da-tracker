"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripFields } from "../../_components/trip-fields";
import { ClaimItemsEditor } from "../../_components/claim-items-editor";
import { submitReimbursementAction, type SubmitState } from "./actions";

type AdvanceOption = {
  id: string;
  purpose: string;
  totalAmount: string;
  tripStart: string;
};

export function ReimbursementForm({
  availableAdvances,
  band,
}: {
  availableAdvances: AdvanceOption[];
  band: string;
}) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitReimbursementAction,
    undefined
  );
  const fe = state?.fieldErrors ?? {};
  const [linkedAdvanceId, setLinkedAdvanceId] = useState<string>("");

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
        Claim costs already incurred — attach receipts. Band {band} rates apply to Dearness and Accommodation lines.
      </div>

      {state?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {availableAdvances.length > 0 && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-4">
          <Label>Link to a prior advance (optional)</Label>
          <input type="hidden" name="linkedAdvanceId" value={linkedAdvanceId} />
          <Select value={linkedAdvanceId} onValueChange={(v) => setLinkedAdvanceId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="No advance — standalone claim" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No advance — standalone claim</SelectItem>
              {availableAdvances.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.purpose.slice(0, 60)} — BDT {Number(a.totalAmount).toLocaleString()} (
                  {new Date(a.tripStart).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Finance auto-calculates the net due to you (or from you) when disbursing.
          </p>
        </div>
      )}

      <TripFields fieldErrors={fe} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Claim items</h3>
          <span className="text-xs text-muted-foreground">Attach a receipt per line</span>
        </div>
        <ClaimItemsEditor name="items" showError={fe.items} enableReceipts />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Submitting..." : "Submit reimbursement claim"}
        </Button>
      </div>
    </form>
  );
}
