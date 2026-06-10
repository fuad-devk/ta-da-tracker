import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "./actions";
import { hasRole } from "@/lib/auth-guards";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard"><Logo /></Link>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              <Link href="/dashboard" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Dashboard</Link>
              <Link href="/requests" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">My requests</Link>
              <Link href="/approvals" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Approvals</Link>
              {hasRole(session.user.roles, "FINANCE_MANAGER", "ADMIN_MANAGER", "SUPER_ADMIN") && (
                <Link href="/reports" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Reports</Link>
              )}
              {hasRole(session.user.roles, "SUPER_ADMIN") && (
                <Link href="/settings" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Settings</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs sm:block">
              <div className="font-medium">{session.user.name}</div>
              <div className="text-muted-foreground">{session.user.email}</div>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
