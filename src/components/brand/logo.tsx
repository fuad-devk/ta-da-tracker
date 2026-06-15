import { cn } from "@/lib/utils";
import { getAppSettings } from "@/lib/app-settings";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  /** Multiplier on the configured logo height (1 = normal header, 1.5 = login screen). */
  scale?: number;
};

export async function Logo({ className, showWordmark = true, scale = 1 }: LogoProps) {
  const settings = await getAppSettings();
  const height = Math.round(settings.logoHeightPx * scale);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {settings.hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/branding/logo?v=${settings.logoVersion}`}
          alt={settings.organizationName}
          style={{ height: `${height}px`, width: "auto" }}
          className="max-w-[280px] object-contain"
        />
      ) : (
        <FallbackMark size={height} />
      )}
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight text-foreground">
            {settings.organizationName}
          </span>
          <span className="text-xs text-muted-foreground">{settings.platformName}</span>
        </div>
      )}
    </div>
  );
}

function FallbackMark({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: `${size}px`, width: `${size}px` }}
      aria-label="Logo"
    >
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
