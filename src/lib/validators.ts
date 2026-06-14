import { z } from "zod";
import { DESIGNATIONS, bandFromDesignation } from "./policy";

export const BANDS = ["A", "B1", "B2", "C1", "C2", "D", "E1", "E2", "F1", "F2", "G"] as const;

export const MODALITIES = [
  "PERMANENT",
  "TEMPORARY",
  "CONTRACTUAL",
  "INTERN",
  "PART_TIME",
  "CONSULTANT",
] as const;

export const ROLES = ["SUPER_ADMIN", "ADMIN_MANAGER", "FINANCE_MANAGER", "EMPLOYEE"] as const;

// Roles an admin can assign (EMPLOYEE is always implicit)
export const ASSIGNABLE_ROLES = ["ADMIN_MANAGER", "FINANCE_MANAGER", "SUPER_ADMIN"] as const;

export const employeeBaseSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required").max(50),
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Invalid email"),
  designation: z
    .string()
    .min(1, "Designation is required")
    .refine((d) => bandFromDesignation(d) !== null, {
      message: `Designation must be one of: ${DESIGNATIONS.join(", ")}`,
    }),
  department: z.string().min(1, "Department is required").max(120),
  modality: z.enum(MODALITIES),
  lineManagerEmail: z
    .string()
    .email("Invalid line manager email")
    .optional()
    .or(z.literal("")),
  roles: z.array(z.enum(ASSIGNABLE_ROLES)).optional().default([]),
});

export const employeeCreateSchema = employeeBaseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const employeeUpdateSchema = employeeBaseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
