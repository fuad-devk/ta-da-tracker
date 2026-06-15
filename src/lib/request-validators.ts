import { z } from "zod";
import { ADVANCE_AMOUNT_CAP, ADVANCE_MIN_TRIP_DAYS, DA_MIN_HOURS } from "./policy";

export const MEALS_PROVIDED = [
  "NONE",
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "BREAKFAST_LUNCH",
  "LUNCH_DINNER",
  "ALL_MEALS",
] as const;

export const claimItemSchema = z.object({
  type: z.enum(["TA", "DA", "AA", "CANCELLATION"]),
  description: z.string().min(1, "Description required").max(1000),
  quantity: z.coerce.number().int().positive().default(1),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  receipts: z
    .array(
      z.object({
        fileUrl: z.string().min(1),
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        sizeBytes: z.number().int().nonnegative(),
      })
    )
    .optional()
    .default([]),
});

export type ClaimItemInput = z.infer<typeof claimItemSchema>;

const baseSchema = z.object({
  purpose: z.string().min(3, "Purpose required").max(2000),
  destination: z.string().min(2, "Destination required").max(120),
  locationType: z.enum(["CITY", "INTERCITY"]),
  tripStart: z.coerce.date(),
  tripEnd: z.coerce.date(),
  paymentMethod: z.enum(["BANK", "BKASH"]),
  dutyHours: z.coerce.number().int().min(0).max(24).optional().default(8),
  mealsProvided: z.enum(MEALS_PROVIDED).default("NONE"),
  companyBookedTravel: z.coerce.boolean().default(false),
  companyBookedAccommodation: z.coerce.boolean().default(false),
  estimatedCost: z.coerce.number().nonnegative().optional(),
  items: z.array(claimItemSchema).min(1, "Add at least one claim item"),
});

export const advanceRequestSchema = baseSchema.superRefine((data, ctx) => {
  if (data.tripEnd < data.tripStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tripEnd"],
      message: "Trip end must be on or after trip start",
    });
  }
  const days = Math.ceil((+data.tripEnd - +data.tripStart) / 86400000) + 1;
  if (days <= ADVANCE_MIN_TRIP_DAYS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tripEnd"],
      message: `Advance is only allowed for trips longer than ${ADVANCE_MIN_TRIP_DAYS} days`,
    });
  }
  const total = data.items.reduce((s, it) => s + Number(it.amount), 0);
  if (total > ADVANCE_AMOUNT_CAP) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: `Advance total cannot exceed BDT ${ADVANCE_AMOUNT_CAP.toLocaleString()}. Higher amounts must be requested via reimbursement after the trip.`,
    });
  }
  if (data.dutyHours < DA_MIN_HOURS && data.items.some((i) => i.type === "DA")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dutyHours"],
      message: `Dearness Allowance requires duty hours of at least ${DA_MIN_HOURS}`,
    });
  }
  if (data.companyBookedTravel && data.items.some((i) => i.type === "TA")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Travel Allowance cannot be claimed when travel is company-booked.",
    });
  }
  if (data.companyBookedAccommodation && data.items.some((i) => i.type === "AA")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Accommodation Allowance cannot be claimed when accommodation is company-booked.",
    });
  }
});

export type AdvanceRequestInput = z.infer<typeof advanceRequestSchema>;

export const reimbursementRequestSchema = baseSchema.superRefine((data, ctx) => {
  if (data.tripEnd < data.tripStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tripEnd"],
      message: "Trip end must be on or after trip start",
    });
  }
  if (data.dutyHours < DA_MIN_HOURS && data.items.some((i) => i.type === "DA")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dutyHours"],
      message: `Dearness Allowance requires duty hours of at least ${DA_MIN_HOURS}`,
    });
  }
  if (data.companyBookedTravel && data.items.some((i) => i.type === "TA")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Travel Allowance cannot be claimed when travel is company-booked.",
    });
  }
  if (data.companyBookedAccommodation && data.items.some((i) => i.type === "AA")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Accommodation Allowance cannot be claimed when accommodation is company-booked.",
    });
  }
});

export type ReimbursementRequestInput = z.infer<typeof reimbursementRequestSchema>;
