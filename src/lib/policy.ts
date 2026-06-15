// Encoded TA/DA Policy V2.0 — band-driven allowance constants and business rules.
// Source: 10MS TA/DA Policy V2 effective 2026-07-01.

import type { Band, LocationType, MealsProvided } from "@prisma/client";

export type BandGroup = "AB" | "CDE" | "F" | "G";

export const BAND_GROUP: Record<Band, BandGroup> = {
  A: "AB",
  B1: "AB",
  B2: "AB",
  C1: "CDE",
  C2: "CDE",
  D: "CDE",
  E1: "CDE",
  E2: "CDE",
  F1: "F",
  F2: "F",
  G: "G",
};

// Per-day Dearness Allowance base rate (BDT).
export const DA_BASE_RATE: Record<BandGroup, number> = {
  AB: 600,
  CDE: 500,
  F: 400,
  G: 300,
};

// Per-night Accommodation Allowance ceiling (BDT).
export const AA_CEILING: Record<BandGroup, number> = {
  AB: 6000,
  CDE: 5000,
  F: 4000,
  G: 3000,
};

// V2 §5.5: shared car rentals capped at BDT 6,000 (3+ employees together)
export const CAR_RENTAL_CAP = 6000;

// V2 §4.7: Advance limits
export const ADVANCE_AMOUNT_CAP = 10000; // was 15,000 in V1
export const ADVANCE_MIN_TRIP_DAYS = 3;

// V2 §3 / §4.6 / §7.2: elevated-approval threshold + retroactive window
export const ELEVATED_APPROVAL_THRESHOLD = 25000;
export const RETROACTIVE_WORKING_DAYS = 7;
export const STANDARD_SUBMISSION_WORKING_DAYS = 3;

// V2 §4.3: hour tiering for DA
export const DA_MIN_HOURS = 6;
export const DA_FULL_HOURS = 12;

// V2 §4.4: partial-meal deduction per meal
export const PARTIAL_MEAL_DEDUCTION = 150;

// V2 §5 (table): weekend intercity multiplier
export const INTERCITY_MULTIPLIER_WEEKDAY = 2;
export const INTERCITY_MULTIPLIER_WEEKEND = 2.5;

// V2 §6: workflow SLAs (in working days unless noted)
export const SLA_TRAVEL_REQUEST_NOTICE_HOURS = 72;
export const SLA_LM_APPROVAL_HOURS = 24;
export const SLA_LM_SIGN_OFF_DAYS = 2;
export const SLA_FINANCE_PROCESSING_DAYS = 7;
export const ADVANCE_RETURN_DAYS = 3;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Bangladesh weekend = Friday (5) + Saturday (6). */
export function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 5 || day === 6;
}

/** Inclusive day count between two dates. */
export function tripDayCount(start: Date, end: Date): number {
  return Math.max(1, Math.floor((+end - +start) / 86400000) + 1);
}

/** Counts days in [start, end] that fall on a weekend. */
export function countWeekendDays(start: Date, end: Date): number {
  let count = 0;
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(0, 0, 0, 0);
  while (cursor <= last) {
    if (isWeekend(cursor)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** DA rate for ONE specific day (handles weekend bump on intercity). */
export function daRateForDay(band: Band, location: LocationType, day: Date): number {
  const base = DA_BASE_RATE[BAND_GROUP[band]];
  if (location === "CITY") return base;
  return base * (isWeekend(day) ? INTERCITY_MULTIPLIER_WEEKEND : INTERCITY_MULTIPLIER_WEEKDAY);
}

/** Back-compat helper — average DA rate ignoring weekends. */
export function daRateFor(band: Band, location: LocationType): number {
  const base = DA_BASE_RATE[BAND_GROUP[band]];
  return location === "INTERCITY" ? base * INTERCITY_MULTIPLIER_WEEKDAY : base;
}

export function aaCeilingFor(band: Band): number {
  return AA_CEILING[BAND_GROUP[band]];
}

export function flightAllowed(band: Band): boolean {
  return BAND_GROUP[band] === "AB";
}

/** Tier the DA percent based on duty hours (V2 §4.3). */
export function daHourMultiplier(dutyHours: number | null | undefined): number {
  if (!dutyHours || dutyHours < DA_MIN_HOURS) return 0;
  if (dutyHours < DA_FULL_HOURS) return 0.5;
  return 1;
}

/** How many meals are provided by company on a given day (used for proration). */
export function mealsProvidedCount(m: MealsProvided): number {
  switch (m) {
    case "NONE": return 0;
    case "BREAKFAST":
    case "LUNCH":
    case "DINNER": return 1;
    case "BREAKFAST_LUNCH":
    case "LUNCH_DINNER": return 2;
    case "ALL_MEALS": return 3;
    default: return 0;
  }
}

/**
 * Compute DA cap for the whole trip per V2:
 *  Σ_days  ( daRateForDay(band, location, day)
 *            × hourTier   (50% / 100% per Section 4.3)
 *            − BDT 150 × meals_provided_per_day   (Section 4.4) )
 * If ALL_MEALS → cap is 0.
 */
export function daCapForTrip(args: {
  band: Band;
  location: LocationType;
  tripStart: Date;
  tripEnd: Date;
  dutyHoursPerDay: number;
  meals: MealsProvided;
}): number {
  if (args.meals === "ALL_MEALS") return 0;
  const hourMult = daHourMultiplier(args.dutyHoursPerDay);
  if (hourMult === 0) return 0;

  const mealDeduction = mealsProvidedCount(args.meals) * PARTIAL_MEAL_DEDUCTION;
  let total = 0;
  const cursor = new Date(args.tripStart);
  cursor.setUTCHours(0, 0, 0, 0);
  const last = new Date(args.tripEnd);
  last.setUTCHours(0, 0, 0, 0);

  while (cursor <= last) {
    const dayRate = daRateForDay(args.band, args.location, cursor);
    const dayCap = Math.max(0, dayRate * hourMult - mealDeduction);
    total += dayCap;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return total;
}

/** Accommodation cap for the trip = ceiling × nights. */
export function aaCapForTrip(args: {
  band: Band;
  tripStart: Date;
  tripEnd: Date;
  companyBookedAccommodation: boolean;
}): number {
  if (args.companyBookedAccommodation) return 0;
  const days = tripDayCount(args.tripStart, args.tripEnd);
  const nights = Math.max(0, days - 1);
  return aaCeilingFor(args.band) * nights;
}

/** Whether a claim qualifies for elevated (Dept Head) approval at Stage 2. */
export function requiresElevatedApproval(args: {
  totalAmount: number;
  retroactive: boolean;
}): boolean {
  return args.totalAmount > ELEVATED_APPROVAL_THRESHOLD || args.retroactive;
}

/** Count working days (Sun–Thu in Bangladesh) between two dates inclusive of start, exclusive of end. */
export function workingDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let count = 0;
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor < end) {
    if (!isWeekend(cursor)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Add N working days (skipping Fri/Sat) to a date. */
export function addWorkingDays(from: Date, days: number): Date {
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  let added = 0;
  while (added < days) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (!isWeekend(cursor)) added++;
  }
  return cursor;
}

// ────────────────────────────────────────────────────────────────────────────
// Designation ↔ band mapping (unchanged from V1)
// ────────────────────────────────────────────────────────────────────────────

export const BAND_DESIGNATIONS: Record<Band, { managerial: string; specialist: string | null }> = {
  A: { managerial: "CXO", specialist: null },
  B2: { managerial: "Senior Vice President", specialist: "Chief Specialist" },
  B1: { managerial: "Vice President", specialist: null },
  C2: { managerial: "Assistant Vice President", specialist: "Principal Specialist" },
  C1: { managerial: "General Manager", specialist: null },
  D: { managerial: "Manager", specialist: "Lead Specialist" },
  E2: { managerial: "Deputy Manager", specialist: "Senior Specialist" },
  E1: { managerial: "Assistant Manager", specialist: "Specialist" },
  F2: { managerial: "Senior Executive", specialist: null },
  F1: { managerial: "Executive", specialist: null },
  G: { managerial: "Temporary Employee", specialist: null },
};

export const DESIGNATION_TO_BAND: Record<string, Band> = {
  "CXO": "A",
  "Senior Vice President": "B2",
  "Chief Specialist": "B2",
  "Vice President": "B1",
  "Assistant Vice President": "C2",
  "Principal Specialist": "C2",
  "General Manager": "C1",
  "Manager": "D",
  "Lead Specialist": "D",
  "Deputy Manager": "E2",
  "Senior Specialist": "E2",
  "Assistant Manager": "E1",
  "Specialist": "E1",
  "Senior Executive": "F2",
  "Executive": "F1",
  "Admin Executive": "G",
  "Intern": "G",
  "Part-timer": "G",
  "Consultant": "G",
  "Contractual": "G",
  "Student Advisor": "G",
  "Project Executive": "G",
  "Super Admin": "A",
};

export const DESIGNATIONS = Object.keys(DESIGNATION_TO_BAND);

export function bandFromDesignation(designation: string): Band | null {
  const exact = DESIGNATION_TO_BAND[designation];
  if (exact) return exact;
  const found = Object.entries(DESIGNATION_TO_BAND).find(
    ([d]) => d.toLowerCase() === designation.trim().toLowerCase()
  );
  return found ? found[1] : null;
}
