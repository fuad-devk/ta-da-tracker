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

export type TripDefaults = {
  purpose?: string;
  destination?: string;
  locationType?: "CITY" | "INTERCITY";
  tripStart?: string;
  tripEnd?: string;
  paymentMethod?: "BANK" | "BKASH";
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  bkashNumber?: string;
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="purpose">Purpose <span className="text-destructive">*</span></Label>
          <Textarea id="purpose" name="purpose" rows={2} defaultValue={defaults?.purpose} required />
          {fieldErrors.purpose && <p className="text-xs text-destructive">{fieldErrors.purpose}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destination">Destination <span className="text-destructive">*</span></Label>
          <Input id="destination" name="destination" defaultValue={defaults?.destination} required />
          {fieldErrors.destination && <p className="text-xs text-destructive">{fieldErrors.destination}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Location <span className="text-destructive">*</span></Label>
          <input type="hidden" name="locationType" value={locationType} />
          <Select value={locationType} onValueChange={(v) => setLocationType(v as "CITY" | "INTERCITY")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CITY">City (within district)</SelectItem>
              <SelectItem value="INTERCITY">Intercity (across districts)</SelectItem>
            </SelectContent>
          </Select>
          {fieldErrors.locationType && <p className="text-xs text-destructive">{fieldErrors.locationType}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tripStart">Trip start <span className="text-destructive">*</span></Label>
          <Input id="tripStart" name="tripStart" type="date" defaultValue={defaults?.tripStart} required />
          {fieldErrors.tripStart && <p className="text-xs text-destructive">{fieldErrors.tripStart}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tripEnd">Trip end <span className="text-destructive">*</span></Label>
          <Input id="tripEnd" name="tripEnd" type="date" defaultValue={defaults?.tripEnd} required />
          {fieldErrors.tripEnd && <p className="text-xs text-destructive">{fieldErrors.tripEnd}</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/30 p-4">
        <Label className="text-sm">Payment method <span className="text-destructive">*</span></Label>
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === "BANK"}
              onChange={() => setPaymentMethod("BANK")}
              className="h-4 w-4"
            />
            Bank
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === "BKASH"}
              onChange={() => setPaymentMethod("BKASH")}
              className="h-4 w-4"
            />
            bKash
          </label>
        </div>

        {paymentMethod === "BANK" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" name="bankName" defaultValue={defaults?.bankName} />
              {fieldErrors.bankName && <p className="text-xs text-destructive">{fieldErrors.bankName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankAccount">Account number</Label>
              <Input id="bankAccount" name="bankAccount" defaultValue={defaults?.bankAccount} />
              {fieldErrors.bankAccount && <p className="text-xs text-destructive">{fieldErrors.bankAccount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankBranch">Branch</Label>
              <Input id="bankBranch" name="bankBranch" defaultValue={defaults?.bankBranch} />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bkashNumber">bKash number</Label>
              <Input id="bkashNumber" name="bkashNumber" defaultValue={defaults?.bkashNumber} />
              {fieldErrors.bkashNumber && <p className="text-xs text-destructive">{fieldErrors.bkashNumber}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
