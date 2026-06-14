import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ASSIGNED_ROLES: Role[] = [Role.ADMIN_MANAGER, Role.FINANCE_MANAGER, Role.SUPER_ADMIN];

export default async function RolesPage({
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
        ],
      }
    : { roles: { hasSome: ASSIGNED_ROLES } };

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Users with elevated roles. Edit any user to assign or remove roles.
          </p>
        </div>
        <Link href="/settings/employees" className={buttonVariants({ variant: "outline" })}>
          All employees
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find anyone</CardTitle>
          <CardDescription>Search by name or email to assign roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2">
            <Input name="q" defaultValue={q ?? ""} placeholder="Name or email" className="max-w-md" />
            <Link href="/settings/roles" className={buttonVariants({ variant: "ghost", size: "sm" })}>Clear</Link>
            <button type="submit" className={buttonVariants({ size: "sm", variant: "secondary" })}>Search</button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Department · Band</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  {q ? "No users match that search." : "No users have elevated roles yet."}
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id} className="hover:bg-muted/40">
                <TableCell>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell className="text-xs">
                  {u.department} · {u.band}
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
                    Edit roles
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
