import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
};

export function ProgressBar({ value, max = 100, className, barClassName, size = "md" }: ProgressBarProps) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100;
  return (
    <div className={cn("w-full bg-muted overflow-hidden", sizeMap[size], className)}>
      <div
        className={cn("h-full bg-foreground transition-all duration-700 ease-out", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
