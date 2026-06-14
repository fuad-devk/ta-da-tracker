"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string };

export function HeaderNav({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-md px-3 py-1.5 transition-all duration-150",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
            {active && (
              <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
