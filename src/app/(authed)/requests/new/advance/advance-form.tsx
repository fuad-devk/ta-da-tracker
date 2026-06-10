"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TripFields } from "../../_components/trip-fields";
import { ClaimItemsEditor } from "../../_components/claim-items-editor";
import { submitAdvanceAction, type SubmitState } from "./actions";
import { ADVANCE_AMOUNT_CAP, ADVANCE_MIN_TRIP_DAYS } from "@/lib/policy";

export function AdvanceForm() {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitAdvanceAction,
    undefined
  );
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Advance requests are only allowed for trips longer than {ADVANCE_MIN_TRIP_DAYS} days,
        with a total cap of BDT {ADVANCE_AMOUNT_CAP.toLocaleString()}.
      </div>

      {state?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <TripFields fieldErrors={fe} />

      <div>
        <h3 className="text-sm font-semibold mb-3">Claim items</h3>
        <ClaimItemsEditor name="items" showError={fe.items} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit advance request"}
        </Button>
      </div>
    </form>
  );
}
