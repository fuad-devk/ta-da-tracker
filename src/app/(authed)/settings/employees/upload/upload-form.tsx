"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { previewCsvAction, commitCsvAction, type PreviewResult } from "./actions";

export function UploadForm() {
  const [preview, formAction, pending] = useActionState<PreviewResult | undefined, FormData>(
    previewCsvAction,
    undefined
  );
  const [committing, startCommit] = useTransition();
  const [committed, setCommitted] = useState<null | Awaited<ReturnType<typeof commitCsvAction>>>(null);

  const commit = () => {
    if (!preview?.csv) return;
    startCommit(async () => {
      const res = await commitCsvAction(preview.csv);
      setCommitted(res);
      if (res.ok) {
        toast.success(`Imported ${res.created} new, updated ${res.updated} existing.`);
      } else {
        toast.error(`Completed with ${res.failed} failures. See details below.`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">CSV file</Label>
          <Input id="file" name="file" type="file" accept=".csv,text/csv" required disabled={pending} />
          <p className="text-xs text-muted-foreground">
            Required columns: Employee ID, Name, Email, Designation, Department, Modality, Line Manager Email.
            <br />
            Modality values: PERMANENT, TEMPORARY, CONTRACTUAL, INTERN, PART_TIME, CONSULTANT.
            <br />
            Band is derived from the designation automatically.
          </p>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Parsing..." : "Preview"}
        </Button>
      </form>

      {preview?.globalErrors && preview.globalErrors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {preview.globalErrors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      {preview?.rows && preview.rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Preview</h2>
              <p className="text-sm text-muted-foreground">
                {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} —{" "}
                {preview.ok ? (
                  <Badge variant="secondary">All valid</Badge>
                ) : (
                  <Badge variant="destructive">
                    {preview.rows.filter((r) => r.errors.length > 0).length} invalid
                  </Badge>
                )}
              </p>
            </div>
            <Button onClick={commit} disabled={!preview.ok || committing}>
              {committing ? "Importing..." : "Confirm import"}
            </Button>
          </div>

          <div className="overflow-hidden rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Line Mgr</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row) => (
                  <TableRow key={row.rowNumber} className={row.errors.length > 0 ? "bg-destructive/5" : ""}>
                    <TableCell className="text-xs">{row.rowNumber}</TableCell>
                    <TableCell className="text-sm">{row.data.employeeId}</TableCell>
                    <TableCell className="text-sm">{row.data.name}</TableCell>
                    <TableCell className="text-sm">{row.data.email}</TableCell>
                    <TableCell className="text-sm">{row.data.designation}</TableCell>
                    <TableCell className="text-sm">{row.data.department}</TableCell>
                    <TableCell className="text-sm">{row.data.modality}</TableCell>
                    <TableCell className="text-sm">{row.data.band}</TableCell>
                    <TableCell className="text-sm">{row.data.lineManagerEmail || "—"}</TableCell>
                    <TableCell>
                      {row.errors.length === 0 ? (
                        <Badge variant="outline" className="text-green-700">Ready</Badge>
                      ) : (
                        <div className="space-y-0.5">
                          {row.errors.map((err, i) => (
                            <div key={i} className="text-xs text-destructive">{err}</div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {committed && (
        <div className="rounded-md border bg-background p-4">
          <h3 className="font-medium">Import results</h3>
          <ul className="mt-2 text-sm">
            <li>Created: {committed.created}</li>
            <li>Updated: {committed.updated}</li>
            <li>Failed: {committed.failed}</li>
          </ul>
          {committed.errors.length > 0 && (
            <div className="mt-3 space-y-1 text-xs text-destructive">
              {committed.errors.map((e, i) => (
                <div key={i}>Row {e.rowNumber}: {e.message}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
