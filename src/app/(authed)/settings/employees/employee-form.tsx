"use client";

import { useActionState } from "react";
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
import { BANDS, MODALITIES } from "@/lib/validators";
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

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employee ID" name="employeeId" defaultValue={defaults?.employeeId} error={fe.employeeId} required />
        <Field label="Name" name="name" defaultValue={defaults?.name} error={fe.name} required />
        <Field label="Email" name="email" type="email" defaultValue={defaults?.email} error={fe.email} required />
        <Field label="Designation" name="designation" defaultValue={defaults?.designation} error={fe.designation} required />
        <Field label="Department" name="department" defaultValue={defaults?.department} error={fe.department} required />

        <SelectField
          label="Modality"
          name="modality"
          defaultValue={defaults?.modality}
          options={MODALITIES.map((m) => ({ value: m, label: m.replace(/_/g, " ") }))}
          error={fe.modality}
          required
        />

        <SelectField
          label="Band"
          name="band"
          defaultValue={defaults?.band}
          options={BANDS.map((b) => ({ value: b, label: b }))}
          error={fe.band}
          required
        />

        <Field
          label="Line Manager Email"
          name="lineManagerEmail"
          type="email"
          defaultValue={defaults?.lineManagerEmail}
          error={fe.lineManagerEmail}
          help="Leave blank if none"
        />
      </div>

      {showPasswordField && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Password"
            name="password"
            type="password"
            error={fe.password}
            help={passwordHelp ?? "Leave blank to auto-generate a default password (employee must change on first login)."}
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
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  help?: string;
}) {
  return (
    <div className="space-y-1.5">
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
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select name={name} defaultValue={defaultValue}>
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
