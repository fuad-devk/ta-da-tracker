import { z } from "zod";
import { ADVANCE_AMOUNT_CAP, ADVANCE_MIN_TRIP_DAYS } from "./policy";

export const claimItemSchema = z.object({
  type: z.enum(["TA", "DA", "AA"]),
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
      message: `Advance total cannot exceed BDT ${ADVANCE_AMOUNT_CAP.toLocaleString()}`,
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
});

export type ReimbursementRequestInput = z.infer<typeof reimbursementRequestSchema>;
