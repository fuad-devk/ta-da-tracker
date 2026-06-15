import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth-guards";

const NAV = [
  { href: "/settings/employees", label: "Employees" },
  { href: "/settings/employees/upload", label: "Bulk upload" },
  { href: "/settings/roles", label: "Roles" },
  { href: "/settings/branding", label: "Branding" },
  { href: "/settings/rates", label: "Allowance rates" },
];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
          <p className="text-xs text-muted-foreground">Super admin only</p>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
