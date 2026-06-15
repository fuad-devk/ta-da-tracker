"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type TripDefaults = {
  purpose?: string;
  destination?: string;
  locationType?: "CITY" | "INTERCITY";
  tripStart?: string;
  tripEnd?: string;
  paymentMethod?: "BANK" | "BKASH";
  dutyHours?: number;
  mealsProvided?: string;
  companyBookedTravel?: boolean;
  companyBookedAccommodation?: boolean;
};

const MEALS_OPTIONS: { value: string; label: string }[] = [
  { value: "NONE", label: "None — I pay for all meals" },
  { value: "BREAKFAST", label: "Breakfast only" },
  { value: "LUNCH", label: "Lunch only" },
  { value: "DINNER", label: "Dinner only" },
  { value: "BREAKFAST_LUNCH", label: "Breakfast + lunch" },
  { value: "LUNCH_DINNER", label: "Lunch + dinner" },
  { value: "ALL_MEALS", label: "All meals provided (no DA)" },
];

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
  const [mealsProvided, setMealsProvided] = useState<string>(
    defaults?.mealsProvided ?? "NONE"
  );
  const [companyBookedTravel, setCompanyBookedTravel] = useState<boolean>(
    defaults?.companyBookedTravel ?? false
  );
  const [companyBookedAccommodation, setCompanyBookedAccommodation] = useState<boolean>(
    defaults?.companyBookedAccommodation ?? false
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
          placeholder="Describe the purpose of the trip — meetings, partners, what you'll be doing, etc."
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
      <input type="hidden" name="mealsProvided" value={mealsProvided} />
      <input type="hidden" name="companyBookedTravel" value={companyBookedTravel ? "true" : "false"} />
      <input type="hidden" name="companyBookedAccommodation" value={companyBookedAccommodation ? "true" : "false"} />

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
              sub="2× DA weekday · 2.5× weekend"
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="dutyHours">
            Duty hours per day <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dutyHours"
            name="dutyHours"
            type="number"
            min={0}
            max={24}
            step={1}
            defaultValue={defaults?.dutyHours ?? 8}
            required
          />
          <p className="text-xs text-muted-foreground">
            6–12h → 50% DA. 12+h or overnight → 100% DA.
          </p>
          {fieldErrors.dutyHours && <p className="text-xs text-destructive">{fieldErrors.dutyHours}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="mealsProvided">Meals provided by company</Label>
          <Select value={mealsProvided} onValueChange={(v) => setMealsProvided(v ?? "NONE")}>
            <SelectTrigger id="mealsProvided">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEALS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            BDT 150 deducted per company-provided meal (V2 §4.4).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={cn(
          "flex cursor-pointer items-start gap-2 rounded-md border bg-background p-3 text-sm transition-colors hover:bg-muted/40",
          companyBookedTravel && "border-primary bg-primary/5"
        )}>
          <input
            type="checkbox"
            checked={companyBookedTravel}
            onChange={(e) => setCompanyBookedTravel(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <div>
            <div className="font-medium">Company booked the travel</div>
            <div className="text-xs text-muted-foreground">No T/A claim allowed</div>
          </div>
        </label>

        <label className={cn(
          "flex cursor-pointer items-start gap-2 rounded-md border bg-background p-3 text-sm transition-colors hover:bg-muted/40",
          companyBookedAccommodation && "border-primary bg-primary/5"
        )}>
          <input
            type="checkbox"
            checked={companyBookedAccommodation}
            onChange={(e) => setCompanyBookedAccommodation(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <div>
            <div className="font-medium">Company booked the accommodation</div>
            <div className="text-xs text-muted-foreground">No A/A claim allowed</div>
          </div>
        </label>
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
