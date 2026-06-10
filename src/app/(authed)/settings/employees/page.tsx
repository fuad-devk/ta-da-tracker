import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { employeeId: { contains: q, mode: "insensitive" as const } },
          { department: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    include: { lineManager: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} employee{users.length === 1 ? "" : "s"} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/employees/upload" className={buttonVariants({ variant: "outline" })}>
            Bulk upload
          </Link>
          <Link href="/settings/employees/new" className={buttonVariants()}>
            Add employee
          </Link>
        </div>
      </div>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, email, employee ID, or department"
          className="max-w-md"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Band</TableHead>
              <TableHead>Line Manager</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell className="text-sm">{u.employeeId}</TableCell>
                <TableCell className="text-sm">{u.designation}</TableCell>
                <TableCell className="text-sm">{u.department}</TableCell>
                <TableCell><Badge variant="outline">{u.band}</Badge></TableCell>
                <TableCell className="text-sm">
                  {u.lineManager ? (
                    <>
                      <div>{u.lineManager.name}</div>
                      <div className="text-xs text-muted-foreground">{u.lineManager.email}</div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-xs">
                        {r.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/settings/employees/${u.id}`}
                    className={buttonVariants({ size: "sm", variant: "ghost" })}
                  >
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
