import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        aria-label="10 Minute School"
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
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight text-foreground">
            10 Minute School
          </span>
          <span className="text-xs text-muted-foreground">TA/DA Tracker</span>
        </div>
      )}
    </div>
  );
}
