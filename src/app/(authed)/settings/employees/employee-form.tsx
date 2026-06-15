"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MODALITIES, ASSIGNABLE_ROLES } from "@/lib/validators";
import { DESIGNATIONS, bandFromDesignation } from "@/lib/policy";
import type { FormState } from "./actions";

export type EmployeeFormValues = {
  employeeId?: string;
  name?: string;
  email?: string;
  designation?: string;
  department?: string;
  modality?: string;
  band?: string;
  lineManagerEmail?: string;
  roles?: string[];
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN_MANAGER: "HR Manager",
  FINANCE_MANAGER: "Finance Manager",
  DEPARTMENT_HEAD: "Department Head",
  SUPER_ADMIN: "Super Admin",
};

const ROLE_HELP: Record<string, string> = {
  ADMIN_MANAGER: "Approves Stage 2 for standard claims",
  FINANCE_MANAGER: "Approves Stage 3 + marks disbursed",
  DEPARTMENT_HEAD: "Required at Stage 2 for elevated claims (>BDT 25K or retroactive)",
  SUPER_ADMIN: "Can do everything, override any stage",
};

export function EmployeeForm({
  action,
  defaults,
  submitLabel,
  showPasswordField,
  passwordHelp,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults?: EmployeeFormValues;
  submitLabel: string;
  showPasswordField: boolean;
  passwordHelp?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined
  );
  const fe = state?.fieldErrors ?? {};

  const [designation, setDesignation] = useState(defaults?.designation ?? "");
  const derivedBand = designation ? bandFromDesignation(designation) : null;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employee ID" name="employeeId" defaultValue={defaults?.employeeId} error={fe.employeeId} required />
        <Field label="Full name" name="name" defaultValue={defaults?.name} error={fe.name} required />
        <Field label="Email" name="email" type="email" defaultValue={defaults?.email} error={fe.email} required />
        <Field label="Department" name="department" defaultValue={defaults?.department} error={fe.department} required />

        <div className="space-y-1.5">
          <Label htmlFor="designation">
            Designation <span className="text-destructive">*</span>
          </Label>
          <input type="hidden" name="designation" value={designation} />
          <Select value={designation} onValueChange={(v) => setDesignation(v ?? "")}>
            <SelectTrigger id="designation">
              <SelectValue placeholder="Select a designation..." />
            </SelectTrigger>
            <SelectContent>
              {DESIGNATIONS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Band is set automatically from the designation.{" "}
            {derivedBand && (
              <span className="font-medium text-foreground">
                Band: <Badge variant="secondary" className="ml-1 align-middle">{derivedBand}</Badge>
              </span>
            )}
          </p>
          {fe.designation && <p className="text-xs text-destructive">{fe.designation}</p>}
        </div>

        <SelectField
          label="Modality"
          name="modality"
          defaultValue={defaults?.modality}
          options={MODALITIES.map((m) => ({ value: m, label: m.replace(/_/g, " ") }))}
          error={fe.modality}
          required
        />

        <Field
          label="Line Manager Email"
          name="lineManagerEmail"
          type="email"
          defaultValue={defaults?.lineManagerEmail}
          error={fe.lineManagerEmail}
          help="Leave blank if none"
          wide
        />
      </div>

      <div className="space-y-3 rounded-md border bg-muted/30 p-4">
        <Label className="text-sm">Roles</Label>
        <p className="text-xs text-muted-foreground">
          Every user is implicitly an Employee. Tick any additional roles below.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ASSIGNABLE_ROLES.map((r) => {
            const checked = defaults?.roles?.includes(r) ?? false;
            return (
              <label
                key={r}
                className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <input
                  type="checkbox"
                  name="roles"
                  value={r}
                  defaultChecked={checked}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <div className="font-medium">{ROLE_LABEL[r]}</div>
                  <div className="text-xs text-muted-foreground">{ROLE_HELP[r]}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {showPasswordField && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Password"
            name="password"
            type="password"
            error={fe.password}
            help={passwordHelp ?? "Leave blank to auto-set to Change123! (employee must change on first login)."}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  error,
  required,
  help,
  wide,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  help?: string;
  wide?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={name}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  error,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
}) {
  const [val, setVal] = useState(defaultValue ?? "");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input type="hidden" name={name} value={val} />
      <Select value={val} onValueChange={(v) => setVal(v ?? "")}>
        <SelectTrigger id={name}>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
