import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  const roles = session?.user.roles ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {session?.user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Submit advance requests, claim reimbursements, and track approvals.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <Badge key={r} variant="secondary">
            {r.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My open requests</CardTitle>
            <CardDescription>Drafts and pending approvals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Coming in phase 3
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awaiting my approval</CardTitle>
            <CardDescription>Items in your queue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Coming in phase 3
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disbursed this month</CardTitle>
            <CardDescription>Total reimbursed to you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Coming in phase 3
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase 1 status</CardTitle>
          <CardDescription>
            Auth, schema, branding, and seed are complete. Settings portal and
            request flows come next.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
