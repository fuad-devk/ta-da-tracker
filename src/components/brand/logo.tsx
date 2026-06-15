import { cn } from "@/lib/utils";
import { getAppSettings } from "@/lib/app-settings";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  /** Larger size for prominent placements like the login screen */
  size?: "sm" | "md" | "lg";
};

export async function Logo({ className, showWordmark = true, size = "sm" }: LogoProps) {
  const settings = await getAppSettings();
  const dims = size === "lg" ? "h-14 w-14" : size === "md" ? "h-10 w-10" : "h-8 w-8";
  const fontSize = size === "lg" ? "text-base" : "text-sm";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {settings.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={settings.logoUrl}
          alt={settings.organizationName}
          className={cn(dims, "rounded-sm object-contain")}
        />
      ) : (
        <FallbackMark className={dims} />
      )}
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className={cn(fontSize, "font-bold tracking-tight text-foreground")}>
            {settings.organizationName}
          </span>
          <span className="text-xs text-muted-foreground">{settings.platformName}</span>
        </div>
      )}
    </div>
  );
}

function FallbackMark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Logo">
      <rect width="40" height="40" rx="8" fill="oklch(0.58 0.22 27)" />
      <text
        x="50%"
        y="55%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="16"
        fill="white"
      >
        10
      </text>
    </svg>
  );
}
