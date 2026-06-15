import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth-guards";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Change password</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{session.user.email}</span>
          </p>
        </div>
        <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update password</CardTitle>
          <CardDescription>
            Choose a strong password you don&apos;t use elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
