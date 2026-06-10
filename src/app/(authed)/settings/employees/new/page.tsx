import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeForm } from "../employee-form";
import { createEmployeeAction } from "../actions";

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Add employee</h1>
        <Link href="/settings/employees" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to list
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee details</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            action={createEmployeeAction}
            submitLabel="Create employee"
            showPasswordField
          />
        </CardContent>
      </Card>
    </div>
  );
}
