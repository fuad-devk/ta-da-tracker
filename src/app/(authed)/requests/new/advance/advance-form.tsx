"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TripFields } from "../../_components/trip-fields";
import { ClaimItemsEditor } from "../../_components/claim-items-editor";
import { submitAdvanceAction, type SubmitState } from "./actions";
import { ADVANCE_AMOUNT_CAP, ADVANCE_MIN_TRIP_DAYS } from "@/lib/policy";

type CapInputs = {
  band: string;
  cityDaRate: number;
  intercityDaRate: number;
  aaCeiling: number;
};

export function AdvanceForm({ caps }: { caps: CapInputs }) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitAdvanceAction,
    undefined
  );
  const fe = state?.fieldErrors ?? {};
  // Note: per-item DA/AA caps are enforced server-side using actual trip dates.

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900">
        Advance is for trips longer than {ADVANCE_MIN_TRIP_DAYS} days, capped at BDT {ADVANCE_AMOUNT_CAP.toLocaleString()}. Band {caps.band} rates apply.
      </div>

      {state?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <TripFields fieldErrors={fe} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Claim items</h3>
          <span className="text-xs text-muted-foreground">Add Travel, Dearness, or Accommodation lines</span>
        </div>
        <ClaimItemsEditor
          name="items"
          showError={fe.items}
          caps={{ da: null, aa: null, overall: ADVANCE_AMOUNT_CAP }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Submitting..." : "Submit advance request"}
        </Button>
      </div>
    </form>
  );
}

