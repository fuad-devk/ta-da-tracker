"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type TripDefaults = {
  purpose?: string;
  destination?: string;
  locationType?: "CITY" | "INTERCITY";
  tripStart?: string;
  tripEnd?: string;
  paymentMethod?: "BANK" | "BKASH";
};

export function TripFields({
  defaults,
  fieldErrors = {},
}: {
  defaults?: TripDefaults;
  fieldErrors?: Record<string, string>;
}) {
  const [paymentMethod, setPaymentMethod] = useState<"BANK" | "BKASH">(
    defaults?.paymentMethod ?? "BANK"
  );
  const [locationType, setLocationType] = useState<"CITY" | "INTERCITY">(
    defaults?.locationType ?? "CITY"
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="purpose">
          Purpose <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="purpose"
          name="purpose"
          rows={4}
          placeholder="Describe the purpose of the trip in detail — meetings, partners, what you'll be doing, etc."
          defaultValue={defaults?.purpose}
          required
          className="resize-y"
        />
        {fieldErrors.purpose && <p className="text-xs text-destructive">{fieldErrors.purpose}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="destination">
            Destination <span className="text-destructive">*</span>
          </Label>
          <Input
            id="destination"
            name="destination"
            placeholder="e.g. Chittagong"
            defaultValue={defaults?.destination}
            required
          />
          {fieldErrors.destination && <p className="text-xs text-destructive">{fieldErrors.destination}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tripStart">
            Trip start <span className="text-destructive">*</span>
          </Label>
          <Input id="tripStart" name="tripStart" type="date" defaultValue={defaults?.tripStart} required />
          {fieldErrors.tripStart && <p className="text-xs text-destructive">{fieldErrors.tripStart}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tripEnd">
            Trip end <span className="text-destructive">*</span>
          </Label>
          <Input id="tripEnd" name="tripEnd" type="date" defaultValue={defaults?.tripEnd} required />
          {fieldErrors.tripEnd && <p className="text-xs text-destructive">{fieldErrors.tripEnd}</p>}
        </div>
      </div>

      <input type="hidden" name="locationType" value={locationType} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Location</Label>
          <div className="flex gap-2">
            <ChoicePill
              active={locationType === "CITY"}
              onClick={() => setLocationType("CITY")}
              label="City"
              sub="Same district"
            />
            <ChoicePill
              active={locationType === "INTERCITY"}
              onClick={() => setLocationType("INTERCITY")}
              label="Intercity"
              sub="Across districts (2× DA)"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pay me via</Label>
          <div className="flex gap-2">
            <ChoicePill
              active={paymentMethod === "BANK"}
              onClick={() => setPaymentMethod("BANK")}
              label="Bank"
              sub="Account on file"
            />
            <ChoicePill
              active={paymentMethod === "BKASH"}
              onClick={() => setPaymentMethod("BKASH")}
              label="bKash"
              sub="Number on file"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoicePill({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border px-3 py-2 text-left text-sm transition-all",
        active
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-input bg-background hover:border-primary/40 hover:bg-muted"
      )}
    >
      <div className="font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}
