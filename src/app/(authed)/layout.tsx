import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "./actions";
import { hasRole } from "@/lib/auth-guards";
import { HeaderNav } from "@/components/header-nav";
import { UserMenu } from "@/components/user-menu";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items: { href: string; label: string }[] = [
    { href: "/requests", label: "My requests" },
    { href: "/approvals", label: "Approvals" },
  ];
  if (hasRole(session.user.roles, "FINANCE_MANAGER", "ADMIN_MANAGER", "SUPER_ADMIN")) {
    items.push({ href: "/reports", label: "Reports" });
  }
  if (hasRole(session.user.roles, "SUPER_ADMIN")) {
    items.push({ href: "/settings", label: "Settings" });
  }

  const initials = (session.user.name ?? "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/requests" className="transition-opacity hover:opacity-80">
              <Logo />
            </Link>
            <HeaderNav items={items} />
          </div>
          <div className="flex items-center gap-3">
            <UserMenu
              name={session.user.name ?? "User"}
              email={session.user.email ?? ""}
              initials={initials || "•"}
              onSignOut={signOutAction}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 animate-in fade-in duration-300">
        {children}
      </main>
    </div>
  );
}
