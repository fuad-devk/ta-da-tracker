// Encoded TA/DA Policy — band-driven allowance constants and business rules.
// Source: 10MS TA/DA Policy effective 2024-04-01.

import type { Band, LocationType } from "@prisma/client";

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

// Per-day Dearness Allowance (BDT). Inter-district is 2x.
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

// BDT 6,000 cap on shared car rentals (3+ employees together)
export const CAR_RENTAL_CAP = 6000;

// Advance limits per policy
export const ADVANCE_AMOUNT_CAP = 15000;
export const ADVANCE_MIN_TRIP_DAYS = 3;

// DA only payable for trips > 6 hours outside station
export const DA_MIN_HOURS = 6;

export function daRateFor(band: Band, location: LocationType): number {
  const base = DA_BASE_RATE[BAND_GROUP[band]];
  return location === "INTERCITY" ? base * 2 : base;
}

export function aaCeilingFor(band: Band): number {
  return AA_CEILING[BAND_GROUP[band]];
}

export function flightAllowed(band: Band): boolean {
  return BAND_GROUP[band] === "AB";
}

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

// Canonical designations grouped by band — used to drive the designation dropdown.
// When an admin picks a designation, the band is derived automatically.
export const DESIGNATION_TO_BAND: Record<string, Band> = {
  // Band A
  "CXO": "A",
  // Band B2
  "Senior Vice President": "B2",
  "Chief Specialist": "B2",
  // Band B1
  "Vice President": "B1",
  // Band C2
  "Assistant Vice President": "C2",
  "Principal Specialist": "C2",
  // Band C1
  "General Manager": "C1",
  // Band D
  "Manager": "D",
  "Lead Specialist": "D",
  // Band E2
  "Deputy Manager": "E2",
  "Senior Specialist": "E2",
  // Band E1
  "Assistant Manager": "E1",
  "Specialist": "E1",
  // Band F2
  "Senior Executive": "F2",
  // Band F1
  "Executive": "F1",
  // Band G (temporary employees)
  "Admin Executive": "G",
  "Intern": "G",
  "Part-timer": "G",
  "Consultant": "G",
  "Contractual": "G",
  "Student Advisor": "G",
  "Project Executive": "G",
  // Internal
  "Super Admin": "A",
};

export const DESIGNATIONS = Object.keys(DESIGNATION_TO_BAND);

export function bandFromDesignation(designation: string): Band | null {
  const exact = DESIGNATION_TO_BAND[designation];
  if (exact) return exact;
  // Case-insensitive fallback
  const found = Object.entries(DESIGNATION_TO_BAND).find(
    ([d]) => d.toLowerCase() === designation.trim().toLowerCase()
  );
  return found ? found[1] : null;
}
