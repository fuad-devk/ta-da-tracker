import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeForm } from "../employee-form";
import { updateEmployeeAction, deleteEmployeeAction, type FormState } from "../actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { lineManager: { select: { email: true } } },
  });
  if (!user) notFound();

  async function update(prev: FormState, fd: FormData): Promise<FormState> {
    "use server";
    return updateEmployeeAction(prev, fd, id);
  }

  async function del() {
    "use server";
    await deleteEmployeeAction(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit employee</h1>
          <p className="text-sm text-muted-foreground">{user.name} ({user.email})</p>
        </div>
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
            action={update}
            submitLabel="Save changes"
            showPasswordField
            passwordHelp="Leave blank to keep the existing password."
            defaults={{
              employeeId: user.employeeId,
              name: user.name,
              email: user.email,
              designation: user.designation,
              department: user.department,
              modality: user.modality,
              band: user.band,
              lineManagerEmail: user.lineManager?.email ?? "",
              roles: user.roles.filter((r) => r !== "EMPLOYEE"),
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={del}>
            <Button type="submit" variant="destructive" size="sm">
              Delete employee
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Removes the user. Blocked if the employee has any submitted requests on file.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
