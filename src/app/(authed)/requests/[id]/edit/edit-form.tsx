"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TripFields, type TripDefaults } from "../../_components/trip-fields";
import { ClaimItemsEditor, type ClaimItem } from "../../_components/claim-items-editor";
import { resubmitAction, type EditState } from "./actions";

export function EditForm({
  requestId,
  defaults,
  defaultItems,
  enableReceipts = false,
}: {
  requestId: string;
  defaults: TripDefaults;
  defaultItems: ClaimItem[];
  enableReceipts?: boolean;
}) {
  const bound = async (prev: EditState, fd: FormData) => resubmitAction(requestId, prev, fd);
  const [state, formAction, pending] = useActionState<EditState, FormData>(bound, undefined);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <TripFields defaults={defaults} fieldErrors={fe} />

      <div>
        <h3 className="text-sm font-semibold mb-3">Claim items</h3>
        <ClaimItemsEditor
          name="items"
          defaultItems={defaultItems}
          showError={fe.items}
          enableReceipts={enableReceipts}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Resubmitting..." : "Resubmit for approval"}
        </Button>
      </div>
    </form>
  );
}
