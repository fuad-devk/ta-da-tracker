import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { updateUserRolesAction } from "./actions";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ASSIGNABLE: Role[] = [Role.ADMIN_MANAGER, Role.FINANCE_MANAGER, Role.SUPER_ADMIN];

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
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-sm text-muted-foreground">
          Assign Admin Manager, Finance Manager, and Super Admin roles. Line-manager
          role is implicit — anyone listed as another employee&apos;s line manager.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find user</CardTitle>
          <CardDescription>Search by name or email. Showing first 100.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2">
            <Input name="q" defaultValue={q ?? ""} placeholder="Name or email" className="max-w-md" />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Current roles</TableHead>
              <TableHead>Assign roles</TableHead>
              <TableHead className="text-right">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const boundAction = updateUserRolesAction.bind(null, u.id);
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
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
                  <TableCell colSpan={2}>
                    <form action={boundAction} className="flex flex-wrap items-center gap-4">
                      {ASSIGNABLE.map((r) => (
                        <label key={r} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name={r}
                            defaultChecked={u.roles.includes(r)}
                            className="h-4 w-4 rounded border-input"
                          />
                          {r.replace(/_/g, " ")}
                        </label>
                      ))}
                      <Button type="submit" size="sm" variant="outline">
                        Save
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
