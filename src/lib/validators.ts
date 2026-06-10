import { z } from "zod";

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

export const employeeBaseSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required").max(50),
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Invalid email"),
  designation: z.string().min(1, "Designation is required").max(120),
  department: z.string().min(1, "Department is required").max(120),
  modality: z.enum(MODALITIES),
  band: z.enum(BANDS),
  lineManagerEmail: z
    .string()
    .email("Invalid line manager email")
    .optional()
    .or(z.literal("")),
});

export const employeeCreateSchema = employeeBaseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const employeeUpdateSchema = employeeBaseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
